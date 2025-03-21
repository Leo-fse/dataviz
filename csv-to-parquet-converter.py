import os
import glob
import zipfile
import tempfile
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import re
from datetime import datetime
import json

def convert_csvs_to_parquet(
    source_dir, 
    output_dir, 
    dataset_name="sensor_data",
    name_patterns=None, 
    chunk_size=100000,
    encoding='utf-8',
    date_format=None
):
    """
    特殊な3行ヘッダー構造のCSVファイル（通常のCSVとZIP圧縮されたCSV）を
    単一のパーティションParquetデータセットに変換する
    
    Parameters:
    -----------
    source_dir : str
        CSVファイルが格納されているディレクトリ
    output_dir : str
        Parquetファイルを出力するディレクトリ
    dataset_name : str
        作成するデータセットの名前
    name_patterns : list, optional
        CSVファイル名に含まれるべき文字列パターンのリスト (例: ['sensor', 'temperature'])
    chunk_size : int, optional
        大きなCSVファイルを処理する際のチャンクサイズ
    encoding : str, optional
        CSVファイルのエンコーディング
    date_format : str, optional
        タイムスタンプのフォーマット（例: '%Y/%m/%d %H:%M:%S'）
    """
    # 出力ディレクトリが存在しない場合は作成
    os.makedirs(output_dir, exist_ok=True)
    
    # データセットのルートパス
    dataset_path = os.path.join(output_dir, dataset_name)
    os.makedirs(dataset_path, exist_ok=True)
    
    # メタデータを保存するための辞書
    all_metadata = {
        'files': [],
        'created_at': datetime.now().isoformat(),
        'sensor_info': {}
    }
    
    # 処理したファイル数を追跡
    processed_files = 0
    skipped_files = 0
    total_rows = 0
    
    # 処理関数
    def process_df(df, file_metadata):
        nonlocal total_rows

            
            # パーティショニング用の列を作成
            df['year'] = df['timestamp'].dt.year
            df['month'] = df['timestamp'].dt.month
            df['day'] = df['timestamp'].dt.day
            df['hour'] = df['timestamp'].dt.hour
            
            # ファイル情報カラムを追加（追跡用）
            df['source_file'] = file_metadata['original_file']
            
            # データ型のチェックと変換（数値型に変換）
            for col in df.columns:
                if col not in ['timestamp', 'year', 'month', 'day', 'hour', 'source_file']:
                    try:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    except:
                        pass
            
            total_rows += len(df)
            return df
        except Exception as e:
            print(f"データ処理中にエラーが発生しました: {str(e)}")
            raise
    
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
            # 単一ファイルを処理してパーティションに追加
            rows_processed = process_single_csv(
                csv_file, 
                dataset_path, 
                all_metadata, 
                None,  # process_df_funcは不要になった
                chunk_size, 
                encoding=encoding
            )
            processed_files += 1
            total_rows += rows_processed
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
                            extracted_path = os.path.join(temp_dir, zip_info.filename)
                            zip_ref.extract(zip_info.filename, temp_dir)
                            # 単一ファイルを処理してパーティションに追加
                            rows_processed = process_single_csv(
                                extracted_path, 
                                dataset_path, 
                                all_metadata, 
                                None,  # process_df_funcは不要になった
                                chunk_size, 
                                encoding=encoding
                            )
                            processed_files += 1
                            total_rows += rows_processed
                    except Exception as e:
                        print(f"エラー: {zip_info.filename} の処理中に問題が発生しました - {str(e)}")
                        skipped_files += 1
    
    # 統合メタデータの保存
    metadata_path = os.path.join(output_dir, f"{dataset_name}_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(all_metadata, f, ensure_ascii=False, indent=2)
    
    print(f"処理完了: {processed_files}ファイルから{total_rows}行のデータを処理しました。{skipped_files}ファイルがスキップされました。")
    print(f"データは {dataset_path} に保存され、メタデータは {metadata_path} に保存されました。")

def process_single_csv(csv_path, dataset_path, all_metadata, process_df_func, chunk_size=100000, encoding='utf-8'):
    """
    センサーデータの特殊なCSV形式（3行ヘッダー）を処理し、
    統合Parquetデータセットにデータを追加する
    """
    file_name = os.path.basename(csv_path)
    
    # ヘッダー行を個別に読み込む（エンコーディングを試行）
    try:
        sensor_points = pd.read_csv(csv_path, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
        sensor_names = pd.read_csv(csv_path, skiprows=1, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
        units = pd.read_csv(csv_path, skiprows=2, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
    except UnicodeDecodeError:
        # UTF-8で失敗した場合、Shift-JISを試す
        print(f"UTF-8でのデコードに失敗しました。Shift-JISを試みます: {os.path.basename(csv_path)}")
        encoding = 'shift-jis'
        try:
            sensor_points = pd.read_csv(csv_path, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
            sensor_names = pd.read_csv(csv_path, skiprows=1, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
            units = pd.read_csv(csv_path, skiprows=2, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
        except:
            # CP932 (Windows日本語)も試す
            print(f"Shift-JISでも失敗しました。CP932を試みます: {os.path.basename(csv_path)}")
            encoding = 'cp932'
            sensor_points = pd.read_csv(csv_path, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
            sensor_names = pd.read_csv(csv_path, skiprows=1, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
            units = pd.read_csv(csv_path, skiprows=2, nrows=1, header=None, encoding=encoding, index_col=False).iloc[0].tolist()
    
    # カスタムヘッダーを作成
    # 1列目は日時列で名前がないため、'timestamp'という名前を付ける
    custom_headers = ['timestamp']
    
    # 重複名のチェックと修正のための辞書
    header_count = {}
    
    for i in range(1, len(sensor_points)):
        # センサー点番とセンサー名を組み合わせた列名を作成
        header = f"{sensor_points[i]}_{sensor_names[i]}"
        # 特殊文字を除去（パーティショニングに影響するため）
        header = re.sub(r'[^\w]', '_', header)
        
        # 重複名の処理: 同じヘッダー名が既に存在する場合、連番を付ける
        if header in header_count:
            header_count[header] += 1
            header = f"{header}_{header_count[header]}"
        else:
            header_count[header] = 0
            
        custom_headers.append(header)
    
    # ヘッダーの重複チェック（デバッグ用）
    if len(custom_headers) != len(set(custom_headers)):
        print(f"警告: 重複するヘッダーが存在します: {[h for h in custom_headers if custom_headers.count(h) > 1]}")
        # この時点で重複があるとエラーになるため、完全に重複を排除する
        unique_headers = []
        header_count = {}
        
        for h in custom_headers:
            if h in header_count:
                header_count[h] += 1
                unique_headers.append(f"{h}_{header_count[h]}")
            else:
                header_count[h] = 0
                unique_headers.append(h)
        
        custom_headers = unique_headers
    
    # メタデータを作成
    file_metadata = {
        'original_file': file_name,
        'sensor_points': sensor_points,
        'sensor_names': sensor_names,
        'units': units,
        'processed_at': datetime.now().isoformat(),
        'column_names': custom_headers  # カラム名をメタデータに保存
    }
    
    # センサー情報をメタデータに追加
    for i in range(1, len(sensor_points)):
        sensor_id = sensor_points[i]
        if sensor_id not in all_metadata['sensor_info']:
            all_metadata['sensor_info'][sensor_id] = {
                'name': sensor_names[i],
                'unit': units[i]
            }
    
    # ファイルメタデータを全体メタデータに追加
    all_metadata['files'].append(file_metadata)
    
    # ファイルサイズの確認
    file_size = os.path.getsize(csv_path)
    
    # パーティショニング列の定義
    partition_cols = ['year', 'month']
    
    # 処理関数作成 (ここで特定のファイルのcustom_headersをクロージャとして保持)
    def process_df_wrapper(df, metadata):
        # 処理前のデータフレーム確認
        print(f"処理前のデータフレーム先頭部分:")
        print(df.head(2))
        print(f"データフレーム列名: {df.columns.tolist()}")
        
        # データフレームの列数がヘッダー数と一致するか確認
        if len(df.columns) != len(custom_headers):
            print(f"警告: カラム数不一致 - データフレーム: {len(df.columns)}, ヘッダー: {len(custom_headers)}")
            # 必要に応じて修正する（列の追加や削除など）
        
        # 最初の列がタイムスタンプであることを確認
        if 'timestamp' not in df.columns:
            print("警告: 'timestamp'列がありません。最初の列を'timestamp'として処理します。")
            # 最初の列をタイムスタンプとして扱う
            df = df.rename(columns={df.columns[0]: 'timestamp'})
        
        # タイムスタンプを日時型に変換
        try:
            # 日時を日時型に変換（日本語形式の日付対応）
            if 'date_format' in metadata and metadata['date_format']:
                # 指定されたフォーマットを使用
                df['timestamp'] = pd.to_datetime(df['timestamp'], format=metadata['date_format'])
            else:
                # 推測モード
                # サンプルデータを取得してフォーマットを推測
                sample_dates = df['timestamp'].dropna().head(5).tolist()
                
                # 日付フォーマットのパターン
                date_formats = [
                    '%Y/%m/%d %H:%M:%S',  # 2024/11/21 0:00:00
                    '%Y/%m/%d',           # 2024/11/21
                    '%Y-%m-%d %H:%M:%S',  # 2024-11-21 00:00:00
                    '%Y-%m-%d',           # 2024-11-21
                    '%Y年%m月%d日 %H時%M分%S秒',
                    '%Y年%m月%d日',
                    '%m/%d/%Y %H:%M:%S',  # 米国形式
                    '%d/%m/%Y %H:%M:%S'   # 欧州形式
                ]
                
                # サンプルデータの表示（デバッグ用）
                print(f"日付サンプル: {sample_dates[:3]}")
                
                # データフレームの最初の行を表示（デバッグ用）
                print("DataFrame最初の3行:")
                print(df.head(3))
                print(f"DataFrame列名: {df.columns.tolist()}")
                
                # 各フォーマットを試す
                detected_format = None
                for fmt in date_formats:
                    try:
                        # 最初のサンプルで試す
                        if len(sample_dates) > 0:
                            pd.to_datetime(sample_dates[0], format=fmt)
                            detected_format = fmt
                            print(f"検出された日付フォーマット: {fmt}")
                            break
                    except:
                        continue
                
                try:
                    if detected_format:
                        # 検出されたフォーマットを使用
                        df['timestamp'] = pd.to_datetime(df['timestamp'], format=detected_format)
                    else:
                        # 検出できなかった場合は自動推測
                        print("日付フォーマットを自動推測します")
                        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
                except Exception as e:
                    print(f"日付変換エラー: {str(e)}")
                    # エラーが発生した場合、厳密でないパースを試みる
                    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
            
            # タイムスタンプの変換結果を確認
            if pd.isna(df['timestamp']).all() or (df['timestamp'] < '1980-01-01').all():
                print(f"警告: タイムスタンプの変換に問題がある可能性があります。最初の5つの値: {df['timestamp'].head(5).tolist()}")
                # 問題が大きい場合はここで処理を停止することも考慮
                # raise ValueError("タイムスタンプの変換に失敗しました")
            
            # パーティショニング用の列を作成
            df['year'] = df['timestamp'].dt.year
            df['month'] = df['timestamp'].dt.month
            df['day'] = df['timestamp'].dt.day
            df['hour'] = df['timestamp'].dt.hour
            
            # ファイル情報カラムを追加（追跡用）
            df['source_file'] = metadata['original_file']
            
            # データ型のチェックと変換（数値型に変換）
            for col in df.columns:
                if col not in ['timestamp', 'year', 'month', 'day', 'hour', 'source_file']:
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
        for chunk in pd.read_csv(csv_path, skiprows=3, header=None, names=custom_headers, encoding=encoding, index_col=False, chunksize=chunk_size):
            processed_chunk = process_df_wrapper(chunk, file_metadata)
            
            # PyArrowテーブルに変換
            table = pa.Table.from_pandas(processed_chunk)
            
            # パーティショニングして追加
            pq.write_to_dataset(
                table,
                root_path=dataset_path,
                partition_cols=partition_cols,
                existing_data_behavior='delete_matching'
            )
    else:
        # 小さなファイルは一度に処理（3行目以降がデータ）
        df = pd.read_csv(csv_path, skiprows=3, header=None, names=custom_headers, encoding=encoding, index_col=False)
        processed_df = process_df_wrapper(df, file_metadata)
        
        # PyArrowテーブルに変換
        table = pa.Table.from_pandas(processed_df)
        
        # パーティショニングして追加
        pq.write_to_dataset(
            table,
            root_path=dataset_path,
            partition_cols=partition_cols,
            existing_data_behavior='delete_matching'
        )
    
    # 処理したデータ行数を更新
    return len(df) if 'df' in locals() else chunk_size  # 近似値

def query_parquet_with_duckdb(dataset_path, sql_query):
    """DuckDBを使用してParquetデータセットにクエリを実行する"""
    import duckdb
    
    conn = duckdb.connect(":memory:")
    result = conn.execute(sql_query.format(dataset_path=dataset_path)).fetchdf()
    return result

# 使用例
if __name__ == "__main__":
    # 設定
    source_directory = "/path/to/csv_files"
    output_directory = "/path/to/parquet_output"
    
    # データセット名の設定
    dataset_name = "sensor_dataset"
    
    # ファイル名に含まれる必要がある文字列パターン
    name_filters = ["sensor", "temperature", "pressure"]
    
    # 変換を実行
    convert_csvs_to_parquet(
        source_dir=source_directory,
        output_dir=output_directory,
        dataset_name=dataset_name,
        name_patterns=name_filters,
        encoding='shift-jis',  # 日本語環境ではShift-JISが一般的
        date_format='%Y/%m/%d %H:%M:%S'  # 2024/11/21 0:00:00 形式を指定
    )
    
    # DuckDBを使用したクエリ例
    dataset_path = os.path.join(output_directory, dataset_name)
    
    # 時間帯別の平均値を取得するクエリ
    hourly_query = """
    SELECT 
        year,
        month, 
        day,
        hour,
        AVG("{sensor_column}") as avg_value
    FROM '{dataset_path}/*/*.parquet'
    WHERE year = 2023 AND month = 3
    GROUP BY year, month, day, hour
    ORDER BY year, month, day, hour
    """
    
    # 日別の統計情報を取得するクエリ
    daily_query = """
    SELECT 
        year,
        month, 
        day,
        AVG("{sensor_column}") as avg_value,
        MIN("{sensor_column}") as min_value,
        MAX("{sensor_column}") as max_value,
        COUNT(*) as data_points
    FROM '{dataset_path}/*/*.parquet'
    GROUP BY year, month, day
    ORDER BY year, month, day
    """
    
    # センサー列名を指定
    sensor_column = "ABC123_Temperature"
    
    # クエリを実行
    hourly_results = query_parquet_with_duckdb(
        dataset_path, 
        hourly_query.replace("{sensor_column}", sensor_column)
    )
    print("時間別平均値:")
    print(hourly_results.head())
    
    daily_results = query_parquet_with_duckdb(
        dataset_path, 
        daily_query.replace("{sensor_column}", sensor_column)
    )
    print("\n日別統計:")
    print(daily_results.head())
