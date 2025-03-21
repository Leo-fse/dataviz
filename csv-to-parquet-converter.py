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
    partition_cols=None,
    chunk_size=100000
):
    """
    フォルダ内のCSVファイル（通常のCSVとZIP圧縮されたCSV）をParquetに変換する
    
    Parameters:
    -----------
    source_dir : str
        CSVファイルが格納されているディレクトリ
    output_dir : str
        Parquetファイルを出力するディレクトリ
    name_patterns : list, optional
        CSVファイル名に含まれるべき文字列パターンのリスト (例: ['sales', 'report'])
    partition_cols : list, optional
        パーティショニングに使用する列名のリスト (例: ['year', 'month'])
    chunk_size : int, optional
        大きなCSVファイルを処理する際のチャンクサイズ
    """
    # 出力ディレクトリが存在しない場合は作成
    os.makedirs(output_dir, exist_ok=True)
    
    # 処理したファイル数を追跡
    processed_files = 0
    
    # 通常のCSVファイルを処理
    csv_files = glob.glob(os.path.join(source_dir, "*.csv"))
    for csv_file in csv_files:
        file_name = os.path.basename(csv_file)
        
        # ファイル名が指定されたパターンにマッチするか確認
        if name_patterns and not any(pattern in file_name for pattern in name_patterns):
            continue
            
        print(f"処理中: {file_name}")
        process_csv_file(csv_file, output_dir, partition_cols, chunk_size)
        processed_files += 1
    
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
                        continue
                        
                    print(f"ZIP内のファイルを処理中: {zip_info.filename} from {os.path.basename(zip_file)}")
                    
                    # 一時ディレクトリにCSVを展開
                    with tempfile.TemporaryDirectory() as temp_dir:
                        temp_csv = os.path.join(temp_dir, zip_info.filename)
                        zip_ref.extract(zip_info.filename, temp_dir)
                        process_csv_file(temp_csv, output_dir, partition_cols, chunk_size)
                        processed_files += 1
    
    print(f"処理完了: {processed_files}ファイルをParquetに変換しました")

def process_csv_file(csv_path, output_dir, partition_cols=None, chunk_size=100000):
    """個々のCSVファイルを処理してParquetに変換する"""
    file_name = os.path.basename(csv_path)
    base_name = os.path.splitext(file_name)[0]
    
    # ファイルサイズの確認
    file_size = os.path.getsize(csv_path)
    
    # 日時をパーティションとして追加する場合の処理
    now = datetime.now()
    year_month = f"{now.year}-{now.month:02d}"
    
    # 大きなファイルの場合はチャンク処理
    if file_size > 100 * 1024 * 1024:  # 100MB以上
        chunk_iter = pd.read_csv(csv_path, chunksize=chunk_size)
        for i, chunk in enumerate(chunk_iter):
            if partition_cols:
                # パーティショニングするための処理
                process_dataframe_with_partitioning(chunk, output_dir, partition_cols, f"{base_name}_part{i}")
            else:
                # 単一ファイルとして保存（パーティションなし）
                chunk_output = os.path.join(output_dir, f"{base_name}_part{i}_{year_month}.parquet")
                chunk.to_parquet(chunk_output)
    else:
        # 小さなファイルは一度に処理
        df = pd.read_csv(csv_path)
        if partition_cols:
            # パーティショニングするための処理
            process_dataframe_with_partitioning(df, output_dir, partition_cols, base_name)
        else:
            # 単一ファイルとして保存（パーティションなし）
            output_path = os.path.join(output_dir, f"{base_name}_{year_month}.parquet")
            df.to_parquet(output_path)

def process_dataframe_with_partitioning(df, output_dir, partition_cols, base_name):
    """データフレームをパーティション分けしてParquetに保存する"""
    # パーティショニング列のデータ型を確認・変換
    for col in partition_cols:
        if col in df.columns:
            # 日付列の場合は日付型に変換
            if re.search(r'date|time', col, re.IGNORECASE) and not pd.api.types.is_datetime64_any_dtype(df[col]):
                try:
                    df[col] = pd.to_datetime(df[col])
                except:
                    pass
    
    # PyArrowテーブルに変換
    table = pa.Table.from_pandas(df)
    
    # パーティショニングして保存
    pq.write_to_dataset(
        table,
        root_path=os.path.join(output_dir, base_name),
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
    name_filters = ["sales", "transaction", "report"]
    
    # パーティショニングに使用する列
    partition_columns = ["year", "month", "category"]
    
    # 変換を実行
    convert_csvs_to_parquet(
        source_dir=source_directory,
        output_dir=parquet_directory,
        name_patterns=name_filters,
        partition_cols=partition_columns
    )
    
    # DuckDBを使用してクエリ例
    sample_query = """
    SELECT 
        category,
        SUM(amount) as total_amount
    FROM '{parquet_dir}/*/*.parquet'
    WHERE year = 2023
    GROUP BY category
    ORDER BY total_amount DESC
    """
    
    # 結果の取得
    result_df = query_parquet_with_duckdb(parquet_directory, sample_query)
    print(result_df.head())
