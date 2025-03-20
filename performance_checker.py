import os
import sys
import time
import logging
import platform
import psutil
import argparse
import subprocess
import pandas as pd
import polars as pl
import numpy as np
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq
import multiprocessing
import shutil
import tempfile
import gc

class PerformanceChecker:
    def __init__(self, log_to_file=True, log_to_console=True, log_level=logging.INFO, log_file="performance_check.log"):
        """
        パフォーマンスチェッカーの初期化
        
        Args:
            log_to_file (bool): ファイルにログを出力するかどうか
            log_to_console (bool): コンソールにログを出力するかどうか
            log_level (int): ログレベル
            log_file (str): ログファイル名
        """
        self.logger = logging.getLogger("PerformanceChecker")
        self.logger.setLevel(log_level)
        
        # ハンドラーを全て削除
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
        
        # フォーマッタ
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # コンソールにログを出力
        if log_to_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(log_level)
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
        
        # ファイルにログを出力
        if log_to_file:
            file_handler = logging.FileHandler(log_file, encoding='utf-8')
            file_handler.setLevel(log_level)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
    
    def check_system_info(self):
        """システム情報を取得"""
        self.logger.info("======= システム情報 =======")
        self.logger.info(f"OS: {platform.system()} {platform.release()} {platform.version()}")
        self.logger.info(f"マシン: {platform.machine()}")
        self.logger.info(f"プロセッサ: {platform.processor()}")
        
        # CPU情報
        cpu_count = psutil.cpu_count(logical=False)
        cpu_count_logical = psutil.cpu_count(logical=True)
        self.logger.info(f"CPU物理コア数: {cpu_count}")
        self.logger.info(f"CPU論理コア数: {cpu_count_logical}")
        
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
        self.logger.info(f"CPU使用率 (各コア): {cpu_percent}")
        self.logger.info(f"CPU平均使用率: {sum(cpu_percent)/len(cpu_percent):.2f}%")
        
        # メモリ情報
        memory = psutil.virtual_memory()
        self.logger.info(f"総メモリ: {self._format_bytes(memory.total)}")
        self.logger.info(f"利用可能メモリ: {self._format_bytes(memory.available)}")
        self.logger.info(f"メモリ使用率: {memory.percent}%")
        
        # ディスク情報
        disk = psutil.disk_usage('/')
        self.logger.info(f"ディスク容量: {self._format_bytes(disk.total)}")
        self.logger.info(f"ディスク空き容量: {self._format_bytes(disk.free)}")
        self.logger.info(f"ディスク使用率: {disk.percent}%")
        
        # Pythonのバージョン
        self.logger.info(f"Pythonバージョン: {platform.python_version()}")
        self.logger.info(f"Polarsバージョン: {pl.__version__}")
        self.logger.info(f"Pandasバージョン: {pd.__version__}")
        self.logger.info(f"PyArrowバージョン: {pa.__version__}")
        
        # プロセスの情報
        current_process = psutil.Process()
        self.logger.info(f"現在のプロセスCPU使用率: {current_process.cpu_percent(interval=1)}%")
        self.logger.info(f"現在のプロセスメモリ使用: {self._format_bytes(current_process.memory_info().rss)}")
    
    def check_disk_performance(self, test_file_size_mb=100):
        """ディスクの読み書き性能をチェック"""
        self.logger.info("======= ディスク性能チェック =======")
        
        # テスト用の一時ディレクトリを作成
        temp_dir = tempfile.mkdtemp()
        test_file_path = os.path.join(temp_dir, "test_file.bin")
        
        try:
            # 書き込みテスト
            self.logger.info(f"{test_file_size_mb}MBのファイル書き込みテスト開始...")
            data = b'0' * 1024 * 1024  # 1MB of data
            
            start_time = time.time()
            with open(test_file_path, 'wb') as f:
                for _ in range(test_file_size_mb):
                    f.write(data)
            write_time = time.time() - start_time
            
            write_speed = test_file_size_mb / write_time if write_time > 0 else 0
            self.logger.info(f"書き込み時間: {write_time:.2f}秒")
            self.logger.info(f"書き込み速度: {write_speed:.2f} MB/秒")
            
            # 読み込みテスト
            self.logger.info(f"{test_file_size_mb}MBのファイル読み込みテスト開始...")
            start_time = time.time()
            with open(test_file_path, 'rb') as f:
                while f.read(1024 * 1024):
                    pass
            read_time = time.time() - start_time
            
            read_speed = test_file_size_mb / read_time if read_time > 0 else 0
            self.logger.info(f"読み込み時間: {read_time:.2f}秒")
            self.logger.info(f"読み込み速度: {read_speed:.2f} MB/秒")
            
        finally:
            # 一時ディレクトリの削除
            shutil.rmtree(temp_dir)
    
    def test_csv_to_parquet_performance(self, csv_file_path, parquet_file_path=None, engine="polars", num_runs=3):
        """CSVファイルからParquetへの変換パフォーマンステスト"""
        self.logger.info("======= CSV→Parquet変換パフォーマンステスト =======")
        self.logger.info(f"CSVファイル: {csv_file_path}")
        
        if not os.path.exists(csv_file_path):
            self.logger.error(f"CSVファイルが見つかりません: {csv_file_path}")
            return
        
        if parquet_file_path is None:
            parquet_file_path = csv_file_path.replace('.csv', '.parquet')
        
        self.logger.info(f"出力Parquetファイル: {parquet_file_path}")
        self.logger.info(f"使用エンジン: {engine}")
        self.logger.info(f"テスト実行回数: {num_runs}回")
        
        # CSVファイルの基本情報
        csv_file_size = os.path.getsize(csv_file_path)
        self.logger.info(f"CSVファイルサイズ: {self._format_bytes(csv_file_size)}")
        
        # CSVの行数を取得（高速に）
        self.logger.info("CSVの行数カウント開始...")
        start_time = time.time()
        if engine == "polars":
            line_count = pl.scan_csv(csv_file_path).select(pl.count()).collect().item()
        else:  # pandas
            with open(csv_file_path, 'r', encoding='utf-8') as f:
                line_count = sum(1 for _ in f) - 1  # ヘッダー行を除く
        count_time = time.time() - start_time
        self.logger.info(f"CSVの行数: {line_count}行")
        self.logger.info(f"行数カウント時間: {count_time:.2f}秒")
        
        # 各実行の結果を保存
        read_times = []
        process_times = []
        write_times = []
        total_times = []
        memory_usages = []
        
        for run in range(1, num_runs + 1):
            self.logger.info(f"======= 実行 {run}/{num_runs} =======")
            
            # GC実行とメモリ使用量リセット
            gc.collect()
            process = psutil.Process()
            initial_memory = process.memory_info().rss
            
            # 1. 読み込み時間計測
            self.logger.info("CSVファイル読み込み開始...")
            read_start = time.time()
            
            if engine == "polars":
                # Polarsでの読み込み
                df = pl.read_csv(csv_file_path)
            else:
                # Pandasでの読み込み
                df = pd.read_csv(csv_file_path)
            
            read_end = time.time()
            read_time = read_end - read_start
            read_times.append(read_time)
            
            # メモリ使用量
            current_memory = process.memory_info().rss
            memory_usage = current_memory - initial_memory
            memory_usages.append(memory_usage)
            
            self.logger.info(f"CSVの読み込み時間: {read_time:.2f}秒")
            self.logger.info(f"メモリ使用増加: {self._format_bytes(memory_usage)}")
            
            # データフレーム情報
            if engine == "polars":
                self.logger.info(f"データフレームの形状: {df.shape}")
                self.logger.info(f"カラム一覧: {df.columns}")
                self.logger.info(f"データ型: {df.dtypes}")
            else:
                self.logger.info(f"データフレームの形状: {df.shape}")
                self.logger.info(f"カラム一覧: {list(df.columns)}")
                self.logger.info(f"データ型: {df.dtypes}")
            
            # 2. 処理時間計測（ここでは単純な変換のみ）
            self.logger.info("データ処理開始...")
            process_start = time.time()
            
            # ここに実際の処理を追加（例：データ変換、フィルタリングなど）
            # （サンプルコードでは省略）
            
            process_end = time.time()
            process_time = process_end - process_start
            process_times.append(process_time)
            
            self.logger.info(f"データ処理時間: {process_time:.2f}秒")
            
            # 3. 書き込み時間計測
            self.logger.info("Parquetファイル書き込み開始...")
            write_start = time.time()
            
            if engine == "polars":
                # Polarsでの書き込み
                df.write_parquet(parquet_file_path)
            else:
                # Pandasでの書き込み
                df.to_parquet(parquet_file_path)
            
            write_end = time.time()
            write_time = write_end - write_start
            write_times.append(write_time)
            
            parquet_file_size = os.path.getsize(parquet_file_path)
            compression_ratio = csv_file_size / parquet_file_size if parquet_file_size > 0 else 0
            
            self.logger.info(f"Parquetの書き込み時間: {write_time:.2f}秒")
            self.logger.info(f"Parquetファイルサイズ: {self._format_bytes(parquet_file_size)}")
            self.logger.info(f"圧縮率: {compression_ratio:.2f}x")
            
            # 合計時間
            total_time = read_time + process_time + write_time
            total_times.append(total_time)
            
            self.logger.info(f"合計処理時間: {total_time:.2f}秒")
            
            # メモリクリーンアップ
            del df
            gc.collect()
    
        # 結果集計
        self.logger.info("======= 結果サマリー =======")
        self.logger.info(f"平均CSVの読み込み時間: {sum(read_times)/len(read_times):.2f}秒")
        self.logger.info(f"平均データ処理時間: {sum(process_times)/len(process_times):.2f}秒")
        self.logger.info(f"平均Parquetの書き込み時間: {sum(write_times)/len(write_times):.2f}秒")
        self.logger.info(f"平均合計処理時間: {sum(total_times)/len(total_times):.2f}秒")
        self.logger.info(f"平均メモリ使用増加: {self._format_bytes(sum(memory_usages)/len(memory_usages))}")
        
        # 速度計算
        avg_speed_mb_per_sec = (csv_file_size / 1024 / 1024) / (sum(total_times)/len(total_times))
        self.logger.info(f"平均処理速度: {avg_speed_mb_per_sec:.2f} MB/秒")
    
    def _format_bytes(self, bytes):
        """バイト数を人間が読みやすい形式にフォーマット"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes < 1024.0:
                return f"{bytes:.2f} {unit}"
            bytes /= 1024.0
        return f"{bytes:.2f} PB"


def main():
    parser = argparse.ArgumentParser(description='CSVからParquetへの変換パフォーマンスチェック')
    parser.add_argument('csv_file', help='入力CSVファイルパス')
    parser.add_argument('--parquet_file', help='出力Parquetファイルパス（指定しない場合はCSVと同じ名前で拡張子が.parquetになります）')
    parser.add_argument('--engine', choices=['polars', 'pandas'], default='polars', help='使用するエンジン (polars または pandas)')
    parser.add_argument('--log_file', default='performance_check.log', help='ログファイル名')
    parser.add_argument('--log_level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], default='INFO', 
                        help='ログレベル')
    parser.add_argument('--log_to_file', action='store_true', default=True, help='ファイルにログを出力する')
    parser.add_argument('--no_log_to_file', action='store_false', dest='log_to_file', help='ファイルにログを出力しない')
    parser.add_argument('--log_to_console', action='store_true', default=True, help='コンソールにログを出力する')
    parser.add_argument('--no_log_to_console', action='store_false', dest='log_to_console', help='コンソールにログを出力しない')
    parser.add_argument('--disk_test', action='store_true', help='ディスク性能テストを実行する')
    parser.add_argument('--disk_test_size', type=int, default=100, help='ディスク性能テスト用ファイルサイズ（MB）')
    parser.add_argument('--num_runs', type=int, default=3, help='テスト実行回数')
    
    # 仮想環境関連のオプション
    venv_group = parser.add_argument_group('仮想環境オプション')
    venv_group.add_argument('--venv', help='使用する仮想環境のパス（絶対パスまたは相対パス）')
    venv_group.add_argument('--venv_name', help='conda環境名（condaが使用可能な場合のみ）')
    venv_group.add_argument('--list_venvs', action='store_true', help='利用可能な仮想環境を一覧表示して終了')
    
    args = parser.parse_args()
    
    # ログレベルの設定
    log_level = getattr(logging, args.log_level)
    
    # パフォーマンスチェッカーの初期化
    checker = PerformanceChecker(
        log_to_file=args.log_to_file,
        log_to_console=args.log_to_console,
        log_level=log_level,
        log_file=args.log_file
    )
    
    # システム情報の取得
    checker.check_system_info()
    
    # ディスク性能テスト（オプション）
    if args.disk_test:
        checker.check_disk_performance(args.disk_test_size)
    
    # CSVからParquetへの変換パフォーマンステスト
    checker.test_csv_to_parquet_performance(
        args.csv_file,
        args.parquet_file,
        args.engine,
        args.num_runs
    )


def get_available_venvs():
    """利用可能な仮想環境の一覧を取得する"""
    venvs = []
    
    # 標準的な仮想環境ディレクトリの確認
    standard_venv_dirs = [
        os.path.join(os.path.expanduser("~"), ".virtualenvs"),  # virtualenvwrapper
        os.path.join(os.path.expanduser("~"), "venv"),         # よくある場所
        os.path.join(os.path.expanduser("~"), "virtualenvs"),  # よくある場所
        os.path.join(os.getcwd(), "venv"),                    # プロジェクト内のvenv
        os.path.join(os.getcwd(), "env"),                     # プロジェクト内のenv
        os.path.join(os.getcwd(), ".venv")                    # プロジェクト内の.venv
    ]
    
    for venv_dir in standard_venv_dirs:
        if os.path.exists(venv_dir):
            if os.path.isdir(venv_dir):
                # ディレクトリ内の仮想環境を検索
                for item in os.listdir(venv_dir):
                    potential_venv = os.path.join(venv_dir, item)
                    # 仮想環境の判定（bin/pythonまたはScripts/python.exeの存在確認）
                    bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
                    python_path = os.path.join(potential_venv, bin_dir, "python.exe" if platform.system() == "Windows" else "python")
                    if os.path.exists(python_path):
                        venvs.append(potential_venv)
            else:
                # 単一の仮想環境ディレクトリの場合
                bin_dir = "Scripts" if platform.system() == "Windows" else "bin"
                python_path = os.path.join(venv_dir, bin_dir, "python.exe" if platform.system() == "Windows" else "python")
                if os.path.exists(python_path):
                    venvs.append(venv_dir)
    
    # conda環境の確認（condaが利用可能な場合）
    try:
        conda_info = subprocess.run(["conda", "info", "--envs"], capture_output=True, text=True)
        if conda_info.returncode == 0:
            lines = conda_info.stdout.strip().split("\n")
            env_section = False
            for line in lines:
                if line.startswith("#"):
                    env_section = True
                    continue
                if env_section and line.strip() and not line.startswith("base"):
                    parts = line.split()
                    env_name = parts[0]
                    venvs.append(f"conda:{env_name}")
    except (FileNotFoundError, subprocess.SubprocessError):
        # condaコマンドが見つからないか、エラーが発生した場合は無視
        pass
    
    return venvs


def run_in_venv(venv_path, conda_env, script_path, script_args):
    """指定された仮想環境でスクリプトを実行する"""
    if conda_env:
        # conda環境での実行
        if platform.system() == "Windows":
            cmd = ["conda", "run", "-n", conda_env, "python", script_path] + script_args
        else:
            cmd = ["conda", "run", "-n", conda_env, "python", script_path] + script_args
    else:
        # 通常の仮想環境での実行
        python_path = os.path.join(
            venv_path, 
            "Scripts" if platform.system() == "Windows" else "bin",
            "python.exe" if platform.system() == "Windows" else "python"
        )
        cmd = [python_path, script_path] + script_args
    
    # サブプロセスとして実行し、出力をそのまま表示
    process = subprocess.Popen(cmd)
    process.wait()
    return process.returncode


if __name__ == "__main__":
    # コマンドライン引数を解析
    parser = argparse.ArgumentParser(description='CSVからParquetへの変換パフォーマンスチェック')
    parser.add_argument('csv_file', nargs='?', help='入力CSVファイルパス')
    parser.add_argument('--parquet_file', help='出力Parquetファイルパス（指定しない場合はCSVと同じ名前で拡張子が.parquetになります）')
    parser.add_argument('--engine', choices=['polars', 'pandas'], default='polars', help='使用するエンジン (polars または pandas)')
    parser.add_argument('--log_file', default='performance_check.log', help='ログファイル名')
    parser.add_argument('--log_level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], default='INFO', help='ログレベル')
    parser.add_argument('--log_to_file', action='store_true', default=True, help='ファイルにログを出力する')
    parser.add_argument('--no_log_to_file', action='store_false', dest='log_to_file', help='ファイルにログを出力しない')
    parser.add_argument('--log_to_console', action='store_true', default=True, help='コンソールにログを出力する')
    parser.add_argument('--no_log_to_console', action='store_false', dest='log_to_console', help='コンソールにログを出力しない')
    parser.add_argument('--disk_test', action='store_true', help='ディスク性能テストを実行する')
    parser.add_argument('--disk_test_size', type=int, default=100, help='ディスク性能テスト用ファイルサイズ（MB）')
    parser.add_argument('--num_runs', type=int, default=3, help='テスト実行回数')
    
    # 仮想環境関連のオプション
    venv_group = parser.add_argument_group('仮想環境オプション')
    venv_group.add_argument('--venv', help='使用する仮想環境のパス（絶対パスまたは相対パス）')
    venv_group.add_argument('--venv_name', help='conda環境名（condaが使用可能な場合のみ）')
    venv_group.add_argument('--list_venvs', action='store_true', help='利用可能な仮想環境を一覧表示して終了')
    
    args, unknown = parser.parse_known_args()
    
    # 利用可能な仮想環境を一覧表示
    if args.list_venvs:
        print("利用可能な仮想環境:")
        venvs = get_available_venvs()
        if venvs:
            for i, venv in enumerate(venvs, 1):
                print(f"{i}. {venv}")
        else:
            print("利用可能な仮想環境が見つかりませんでした。")
        sys.exit(0)
    
    # 仮想環境で実行するかどうかを判断
    if args.venv or args.venv_name:
        if not args.csv_file:
            print("エラー: CSVファイルパスを指定してください。")
            sys.exit(1)
            
        # スクリプト自身のパスを取得
        script_path = os.path.abspath(sys.argv[0])
        
        # 引数から仮想環境関連のオプションを除外
        filtered_args = [arg for i, arg in enumerate(sys.argv[1:]) if arg not in ['--venv', '--venv_name', '--list_venvs'] and 
                         (i == 0 or sys.argv[i] not in ['--venv', '--venv_name'])]
        
        # 指定された仮想環境で実行
        exit_code = run_in_venv(args.venv, args.venv_name, script_path, filtered_args)
        sys.exit(exit_code)
    else:
        # 通常実行
        main()
