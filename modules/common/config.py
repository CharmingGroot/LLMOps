"""
Common argument parser for all pipeline modules.
"""

import argparse


def base_parser(description: str) -> argparse.ArgumentParser:
    """Create base argument parser with common pipeline args."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--run-id", required=True, help="MLflow run ID")
    parser.add_argument(
        "--mlflow-tracking-uri", required=True, help="MLflow tracking URI"
    )
    parser.add_argument("--experiment-id", required=True, help="MLflow experiment ID")
    return parser
