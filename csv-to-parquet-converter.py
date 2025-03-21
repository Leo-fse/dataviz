import os
import glob
import zipfile
import tempfile
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import re
from datetime import datetime

def convert_csvs_to_parquet(
    source_dir, 
    output_dir, 
    name_patterns=None, 
    chunk_size=100000
):
    """
    特殊な3行ヘッダー構造のCSVファイル（通常のCSVとZIP圧縮されたCSV）をParquetに変換する
    
    Parameters:
    -----------
    source_dir : str
        CSVファイルが格納されているディレクトリ
    output_dir : str
        Parquetファイルを出力するディレクトリ
    name_patterns : list, optional
        CSVファイル名に含まれるべき文字列パターンのリスト (例: ['sales', 'report'])
    chunk_size : int, optional
        大きなCSVファイルを処理する際のチャンクサイズ
    """
    # 出力ディレクトリが存在しない場合は作成
    os.makedirs(output_dir, exist_ok=True)
    
    # 処理したファイル数を追跡
    processed_files = 0
    skipped_files = 0
    
    # 通常のCSVファイルを処理
    csv_files = glob.glob(os.path.join(source_dir, "*.csv"))
    for csv_file in csv_files:
        file_name = os.path.basename(csv_file)
        
        # ファイル名が指定されたパターンにマッチするか確認
        if name_patterns and not any(pattern in file_name for pattern in name_patterns):
            print(f"スキップ: {file_name} (パターンに一致しません)")
            skipped_files += 1
            continue
            
        print(f"処理中: {file_name}")
        try:
            process_csv_file(csv_file, output_dir, chunk_size)
            processed_files += 1
        except Exception as e:
            print(f"エラー: {file_name} の処理中に問題が発生しました - {str(e)}")
            skipped_files += 1
    
    # ZIP圧縮されたCSVファイルを処理
    zip_files = glob.glob(os.path.join(source_dir, "*.zip"))
    for zip_file in zip_files:
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            # ZIPファイル内のすべてのファイルをリスト
            for zip_info in zip_ref.infolist():
                # CSVファイルのみを処理
                if zip_info.filename.endswith('.csv'):
                    # ファイル名が指定されたパターンにマッチするか確認
                    if name_patterns and not any(pattern in zip_info.filename for pattern in name_patterns):
                        print(f"スキップ: {zip_info.filename} from {os.path.basename(zip_file)} (パターンに一致しません)")
                        skipped_files += 1
                        continue
                        
                    print(f"ZIP内のファイルを処理中: {zip_info.filename} from {os.path.basename(zip_file)}")
                    
                    try:
                        # 一時ディレクトリにCSVを展開
                        with tempfile.TemporaryDirectory() as temp_dir:
                            temp_csv = os.path.join(temp_dir, os.path.basename(zip_info.filename))
                            zip_ref.extract(zip_info.filename, temp_dir)
                            extracted_path = os.path.join(temp_dir, zip_info.filename)
                            process_csv_file(extracted_path, output_dir, chunk_size)
                            processed_files += 1
                    except Exception as e:
                        print(f"エラー: {zip_info.filename} の処理中に問題が発生しました - {str(e)}")
                        skipped_files += 1
    
    print(f"処理完了: {processed_files}ファイルを処理しました。{skipped_files}ファイルがスキップされました。")

def process_csv_file(csv_path, output_dir, chunk_size=100000):
    """
    センサーデータの特殊なCSV形式（3行ヘッダー）を処理してParquetに変換する
    """
    file_name = os.path.basename(csv_path)
    base_name = os.path.splitext(file_name)[0]
    
    # ヘッダー行を個別に読み込む
    sensor_points = pd.read_csv(csv_path, nrows=1, header=None).iloc[0].tolist()
    sensor_names = pd.read_csv(csv_path, skiprows=1, nrows=1, header=None).iloc[0].tolist()
    units = pd.read_csv(csv_path, skiprows=2, nrows=1, header=None).iloc[0].tolist()
    
    # カスタムヘッダーを作成
    # 1列目は日時列で名前がないため、'timestamp'という名前を付ける
    custom_headers = ['timestamp']
    for i in range(1, len(sensor_points)):
        # センサー点番とセンサー名を組み合わせた列名を作成
        header = f"{sensor_points[i]}_{sensor_names[i]}"
        # 特殊文字を除去（パーティショニングに影響するため）
        header = re.sub(r'[^\w]', '_', header)
        custom_headers.append(header)
    
    # メタデータを保存（単位情報など、後で参照できるように）
    metadata = {
        'sensor_points': sensor_points,
        'sensor_names': sensor_names,
        'units': units,
        'original_file': file_name,
        'created_at': datetime.now().isoformat()
    }
    
    # メタデータをJSONとして保存
    import json
    metadata_path = os.path.join(output_dir, f"{base_name}_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    # ファイルサイズの確認
    file_size = os.path.getsize(csv_path)
    
    # 現在の日時をパーティション情報として取得
    now = datetime.now()
    
    # 処理関数
    def process_chunk(df):
        # 1列目を日時型に変換
        try:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # パーティショニング用の列を作成
            df['year'] = df['timestamp'].dt.year
            df['month'] = df['timestamp'].dt.month
            df['day'] = df['timestamp'].dt.day
            df['hour'] = df['timestamp'].dt.hour
            
            # データ型のチェックと変換（数値型に変換）
            for col in df.columns:
                if col not in ['timestamp', 'year', 'month', 'day', 'hour']:
                    try:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    except:
                        pass
            
            return df
        except Exception as e:
            print(f"データ処理中にエラーが発生しました: {str(e)}")
            raise
    
    # 大きなファイルの場合はチャンク処理
    if file_size > 100 * 1024 * 1024:  # 100MB以上
        for i, chunk in enumerate(pd.read_csv(csv_path, skiprows=3, header=None, names=custom_headers, chunksize=chunk_size)):
            processed_chunk = process_chunk(chunk)
            
            # パーティショニングして保存
            table = pa.Table.from_pandas(processed_chunk)
            output_path = os.path.join(output_dir, base_name)
            
            # パーティショニング列
            partition_cols = ['year', 'month']
            
            pq.write_to_dataset(
                table,
                root_path=output_path,
                partition_cols=partition_cols
            )
    else:
        # 小さなファイルは一度に処理（3行目以降がデータ）
        df = pd.read_csv(csv_path, skiprows=3, header=None, names=custom_headers)
        processed_df = process_chunk(df)
        
        # パーティショニングして保存
        table = pa.Table.from_pandas(processed_df)
        output_path = os.path.join(output_dir, base_name)
        
        # パーティショニング列
        partition_cols = ['year', 'month']
        
        pq.write_to_dataset(
            table,
            root_path=output_path,
            partition_cols=partition_cols
        )

def query_parquet_with_duckdb(parquet_dir, sql_query):
    """DuckDBを使用してParquetデータにクエリを実行する"""
    import duckdb
    
    conn = duckdb.connect(":memory:")
    result = conn.execute(sql_query.format(parquet_dir=parquet_dir)).fetchdf()
    return result

# 使用例
if __name__ == "__main__":
    # 設定
    source_directory = "/path/to/csv_files"
    parquet_directory = "/path/to/parquet_output"
    
    # ファイル名に含まれる必要がある文字列パターン
    name_filters = ["sensor", "temperature", "pressure"]
    
    # 変換を実行
    convert_csvs_to_parquet(
        source_dir=source_directory,
        output_dir=parquet_directory,
        name_patterns=name_filters
    )
    
    # DuckDBを使用してクエリ例
    sample_query = """
    -- センサーデータの時間帯別平均を取得
    SELECT 
        year,
        month, 
        hour,
        AVG("{sensor_column}") as avg_value
    FROM '{parquet_dir}/*/*.parquet'
    WHERE year = 2023 AND month = 3
    GROUP BY year, month, hour
    ORDER BY year, month, hour
    """
    
    # センサー列名を指定
    sensor_column = "ABC123_Temperature"
    
    # 結果の取得
    result_df = query_parquet_with_duckdb(
        parquet_directory, 
        sample_query.replace("{sensor_column}", sensor_column)
    )
    print(result_df.head())
