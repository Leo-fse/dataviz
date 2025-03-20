# CSV to Parquet パフォーマンスチェックツール

このツールは、CSVファイルからParquetファイルへの変換処理におけるパフォーマンスを測定・分析するためのPythonスクリプトです。同じコードと同じPCスペックでも、異なる端末で実行速度に差が生じる原因を特定するのに役立ちます。

## 機能

- **システム情報収集**: OS、CPU、メモリ、ディスク情報などのシステム環境を詳細に記録
- **ディスク性能テスト**: 読み書き速度を測定し、I/Oパフォーマンスを評価
- **変換性能分析**: CSV読み込み、データ処理、Parquet書き込みの各フェーズの実行時間を計測
- **メモリ使用量追跡**: 処理中のメモリ消費量を監視
- **複数エンジン対応**: PolarsとPandasの両方をサポート
- **柔軟なログ出力**: コンソールとファイルの両方に対応し、詳細度を調整可能

## 必要条件

- Python 3.6以上
- 必要ライブラリ:
  ```
  polars
  pandas
  pyarrow
  psutil
  numpy
  ```

## インストール

```bash
pip install polars pandas pyarrow psutil numpy
```

## 使用方法

### 基本的な使い方

```bash
python performance_checker.py your_data.csv
```

### 詳細オプション付き

```bash
python performance_checker.py your_data.csv \
  --parquet_file output.parquet \
  --engine polars \
  --log_file performance_results.log \
  --log_level INFO \
  --log_to_file \
  --log_to_console \
  --disk_test \
  --disk_test_size 100 \
  --num_runs 3
```

### 仮想環境での実行

利用可能な仮想環境を一覧表示:

```bash
python performance_checker.py --list_venvs
```

特定の仮想環境で実行:

```bash
python performance_checker.py your_data.csv --venv /path/to/your/venv
```

Conda環境で実行:

```bash
python performance_checker.py your_data.csv --venv_name your_conda_env
```

## コマンドラインオプション

### 基本オプション

| オプション | 説明 |
|------------|------|
| `csv_file` | 入力CSVファイルのパス（必須） |
| `--parquet_file` | 出力Parquetファイルのパス（省略時はCSVと同名で拡張子が.parquet） |
| `--engine` | 使用するデータフレームエンジン（'polars'または'pandas'、デフォルトは'polars'） |
| `--disk_test` | ディスク性能テストを実行する |
| `--disk_test_size` | ディスク性能テスト用ファイルサイズ（MB、デフォルトは100） |
| `--num_runs` | テスト実行回数（デフォルトは3） |

### ログオプション

| オプション | 説明 |
|------------|------|
| `--log_file` | ログファイル名（デフォルトは'performance_check.log'） |
| `--log_level` | ログレベル（DEBUG/INFO/WARNING/ERROR/CRITICAL、デフォルトはINFO） |
| `--log_to_file` | ファイルにログを出力する（デフォルトは有効） |
| `--no_log_to_file` | ファイルにログを出力しない |
| `--log_to_console` | コンソールにログを出力する（デフォルトは有効） |
| `--no_log_to_console` | コンソールにログを出力しない |

### 仮想環境オプション

| オプション | 説明 |
|------------|------|
| `--venv` | 使用する仮想環境のパス（絶対パスまたは相対パス） |
| `--venv_name` | conda環境名（condaが使用可能な場合のみ） |
| `--list_venvs` | 利用可能な仮想環境を一覧表示して終了 |

## 出力例

```
2024-03-20 14:30:00 - PerformanceChecker - INFO - ======= システム情報 =======
2024-03-20 14:30:00 - PerformanceChecker - INFO - OS: Windows 10 10.0.19042
2024-03-20 14:30:00 - PerformanceChecker - INFO - マシン: AMD64
2024-03-20 14:30:00 - PerformanceChecker - INFO - プロセッサ: Intel64 Family 6 Model 142 Stepping 12, GenuineIntel
2024-03-20 14:30:00 - PerformanceChecker - INFO - CPU物理コア数: 4
2024-03-20 14:30:00 - PerformanceChecker - INFO - CPU論理コア数: 8
2024-03-20 14:30:01 - PerformanceChecker - INFO - CPU使用率 (各コア): [10.2, 5.1, 15.3, 7.2, 8.1, 4.3, 12.5, 6.7]
2024-03-20 14:30:01 - PerformanceChecker - INFO - CPU平均使用率: 8.68%
2024-03-20 14:30:01 - PerformanceChecker - INFO - 総メモリ: 16.00 GB
2024-03-20 14:30:01 - PerformanceChecker - INFO - 利用可能メモリ: 8.45 GB
2024-03-20 14:30:01 - PerformanceChecker - INFO - メモリ使用率: 47.2%
...
```

## パフォーマンス差異の診断

このツールを使用して異なる端末での実行結果を比較することで、以下のような原因を特定できます:

- ディスクI/O速度の違い（SSD vs HDD、または異なるモデル間）
- メモリ使用効率の問題
- CPUのスロットリングや電力管理設定の違い
- バックグラウンドプロセスの影響
- ファイルシステムの断片化
- Pythonやライブラリのバージョンの違い

## ヒント

- 複数回（`--num_runs`で指定）実行して平均値を取ることで、より正確な計測が可能です
- ディスクテスト（`--disk_test`）を有効にすると、ストレージのボトルネックを特定しやすくなります
- 大きなCSVファイルを処理する場合は、`--log_level DEBUG`でより詳細な情報を取得できます

## ライセンス

MITライセンス
