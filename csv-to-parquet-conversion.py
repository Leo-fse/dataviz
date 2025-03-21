import os
import glob
import zipfile
import tempfile
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime
import re

def extract_machine_name(filename):
    """ファイル名から機械名を抽出する関数
    実際の命名規則に合わせて調整してください
    """
    # 例: 'machine1_data_20230105.csv' から 'machine1' を抽出
    match = re.search(r'^([^_]+)', os.path.basename(filename))
    if match:
        return match.group(1)
    else:
        return "unknown_machine"

def process_csv(csv_path, output_dir):
    """CSVファイルを処理してParquetに変換する関数"""
    try:
        machine_name = extract_machine_name(csv_path)
        
        # CSVファイルを読み込む
        # 最初の3行をヘッダーとして読み込む
        header_rows = pd.read_csv(csv_path, nrows=3, header=None)
        
        # センサーIDは1行目
        sensor_ids = header_rows.iloc[0].tolist()
        # センサー名は2行目
        sensor_names = header_rows.iloc[1].tolist()
        # 単位は3行目
        units = header_rows.iloc[2].tolist()
        
        # 最初の列名（日時カラム）が空欄なので'timestamp'とする
        if pd.isna(sensor_names[0]):
            sensor_names[0] = 'timestamp'
        
        # 実際のデータを読み込む（3行目以降）
        df = pd.read_csv(csv_path, skiprows=3, header=None, names=sensor_names)
        
        # タイムスタンプを日付型に変換
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # 年と月を抽出
        df['year'] = df['timestamp'].dt.year
        df['month'] = df['timestamp'].dt.month
        df['machine'] = machine_name
        
        # パーティショニングのためにグループ化
        grouped = df.groupby(['machine', 'year', 'month'])
        
        # グループごとにParquetファイルを作成または追加
        for (machine, year, month), group_df in grouped:
            # パーティションディレクトリを作成
            partition_dir = os.path.join(output_dir, 
                                        f"machine={machine}", 
                                        f"year={year}", 
                                        f"month={month}")
            os.makedirs(partition_dir, exist_ok=True)
            
            # パーティション列を削除（Hiveパーティショニング形式では不要）
            partition_df = group_df.drop(['machine', 'year', 'month'], axis=1)
            
            # センサー情報をメタデータとして保存
            metadata = {
                'sensor_ids': ','.join(map(str, sensor_ids)),
                'sensor_names': ','.join(map(str, sensor_names)),
                'units': ','.join(map(str, units)),
                'source_file': os.path.basename(csv_path),
                'updated_at': datetime.now().isoformat()
            }
            
            # パーティション内のParquetファイル名を決定
            file_id = f"{machine}_{year}{month:02d}"
            output_file = os.path.join(partition_dir, f"{file_id}.parquet")
            
            # 既存のParquetファイルがあるか確認
            if os.path.exists(output_file):
                try:
                    # 既存のファイルを読み込む
                    existing_table = pq.read_table(output_file)
                    existing_df = existing_table.to_pandas()
                    
                    # 既存データと新しいデータを結合
                    combined_df = pd.concat([existing_df, partition_df], ignore_index=True)
                    
                    # タイムスタンプでソート
                    combined_df = combined_df.sort_values('timestamp')
                    
                    # 重複を削除（タイムスタンプが同じ場合は最新のデータを保持）
                    combined_df = combined_df.drop_duplicates(subset=['timestamp'], keep='last')
                    
                    # 結合したデータをテーブルに変換
                    table = pa.Table.from_pandas(combined_df)
                    
                    print(f"Merged data from {csv_path} into existing {output_file}")
                except Exception as e:
                    # 読み込みエラーの場合、既存ファイルを無視して新しいデータだけ保存
                    print(f"Error reading existing parquet {output_file}: {e}")
                    table = pa.Table.from_pandas(partition_df)
                    print(f"Created new file for {csv_path} -> {output_file}")
            else:
                # 新しいテーブルを作成
                table = pa.Table.from_pandas(partition_df)
                print(f"Created new file for {csv_path} -> {output_file}")
            
            # Parquetファイルとして保存（メタデータ付き）
            pq.write_table(table, output_file, metadata=metadata)
            
        return True
    except Exception as e:
        print(f"Error processing {csv_path}: {e}")
        return False

def process_zip(zip_path, output_dir):
    """ZIPファイルを解凍して中のCSVファイルを処理する関数"""
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # 解凍したディレクトリ内のCSVファイルを処理
            csv_files = glob.glob(os.path.join(temp_dir, "**", "*.csv"), recursive=True)
            
            for csv_file in csv_files:
                process_csv(csv_file, output_dir)
                
        print(f"Processed ZIP: {zip_path}")
        return True
    except Exception as e:
        print(f"Error processing ZIP {zip_path}: {e}")
        return False

def main():
    # 入力ディレクトリと出力ディレクトリの設定
    input_dir = "input_data"  # CSVファイルのあるディレクトリ
    output_dir = "output_parquet"  # パーティション分けされたParquetを出力するディレクトリ
    
    # 出力ディレクトリがなければ作成
    os.makedirs(output_dir, exist_ok=True)
    
    # CSVファイルとZIPファイルのパスを取得
    csv_files = glob.glob(os.path.join(input_dir, "**", "*.csv"), recursive=True)
    zip_files = glob.glob(os.path.join(input_dir, "**", "*.zip"), recursive=True)
    
    # 処理ファイル数を表示
    print(f"Found {len(csv_files)} CSV files and {len(zip_files)} ZIP files to process")
    
    # 処理カウンター
    success_count = 0
    error_count = 0
    
    # CSVファイルを処理
    for i, csv_file in enumerate(csv_files, 1):
        print(f"Processing CSV {i}/{len(csv_files)}: {csv_file}")
        if process_csv(csv_file, output_dir):
            success_count += 1
        else:
            error_count += 1
    
    # ZIPファイルを処理
    for i, zip_file in enumerate(zip_files, 1):
        print(f"Processing ZIP {i}/{len(zip_files)}: {zip_file}")
        if process_zip(zip_file, output_dir):
            success_count += 1
        else:
            error_count += 1
    
    print(f"Conversion completed! Successful: {success_count}, Errors: {error_count}")
    
    # パーティション情報の表示
    partitions = glob.glob(os.path.join(output_dir, "machine=*", "year=*", "month=*"))
    print(f"Created {len(partitions)} partitions:")
    for partition in sorted(partitions):
        parquet_files = glob.glob(os.path.join(partition, "*.parquet"))
        if parquet_files:
            file_size = sum(os.path.getsize(f) for f in parquet_files) / (1024 * 1024)  # MBに変換
            print(f"  {partition} - {len(parquet_files)} files ({file_size:.2f} MB)")

if __name__ == "__main__":
    main()
