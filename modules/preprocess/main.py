"""
Preprocess Module - Data preprocessing entry point
"""

import argparse
import json
import os
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LLMOps Preprocess Module")
    parser.add_argument("--run-id", required=True, help="MLflow run ID")
    parser.add_argument("--mlflow-tracking-uri", required=True, help="MLflow tracking URI")
    parser.add_argument("--experiment-id", required=True, help="MLflow experiment ID")
    parser.add_argument("--input-path", default="data/raw", help="Input data path")
    parser.add_argument("--output-path", default="data/processed", help="Output data path")
    return parser.parse_args()


def preprocess(input_path: str, output_path: str) -> dict[str, float]:
    """Run preprocessing pipeline."""
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Placeholder: actual preprocessing logic would go here
    metrics = {
        "num_samples": 0,
        "num_features": 0,
    }

    print(f"METRIC:num_samples={metrics['num_samples']}")
    print(f"METRIC:num_features={metrics['num_features']}")
    print(f"ARTIFACT:{output_path}")

    return metrics


def main() -> None:
    args = parse_args()

    print(f"[Preprocess] run_id={args.run_id}")
    print(f"[Preprocess] tracking_uri={args.mlflow_tracking_uri}")

    metrics = preprocess(args.input_path, args.output_path)

    print("[Preprocess] Done")


if __name__ == "__main__":
    main()
