"""
Preprocess Module — Load and tokenize dataset for text classification.

Uses HuggingFace datasets + transformers for tokenization.
Outputs preprocessed data splits to disk and logs metrics.
"""

import json
import os
import sys
from pathlib import Path

# Add parent dir so we can import common
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.config import base_parser
from common.mlflow_utils import MLflowHelper


def parse_args():
    parser = base_parser("LLMOps Preprocess Module")
    parser.add_argument("--dataset", default="imdb", help="HuggingFace dataset name")
    parser.add_argument("--model-name", default="distilbert-base-uncased", help="Tokenizer model")
    parser.add_argument("--max-length", type=int, default=256, help="Max token length")
    parser.add_argument("--max-samples", type=int, default=2000, help="Max samples per split (0=all)")
    parser.add_argument("--output-path", default="data/processed", help="Output directory")
    parser.add_argument("--input-path", default="data/raw", help="Input path (unused, for compat)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    mlflow = MLflowHelper(args.mlflow_tracking_uri, args.run_id)
    mlflow.set_tag("stage", "preprocess")

    print(f"[Preprocess] Loading dataset: {args.dataset}")
    print(f"[Preprocess] Tokenizer: {args.model_name}")

    # Import heavy deps lazily
    from datasets import load_dataset
    from transformers import AutoTokenizer

    # Load dataset
    dataset = load_dataset(args.dataset)

    # Subsample if requested
    max_samples = args.max_samples if args.max_samples > 0 else None

    if "train" in dataset:
        train_data = dataset["train"]
        if max_samples and len(train_data) > max_samples:
            train_data = train_data.shuffle(seed=42).select(range(max_samples))
    else:
        train_data = dataset[list(dataset.keys())[0]]
        if max_samples and len(train_data) > max_samples:
            train_data = train_data.shuffle(seed=42).select(range(max_samples))

    if "test" in dataset:
        test_data = dataset["test"]
        test_samples = max_samples // 2 if max_samples else None
        if test_samples and len(test_data) > test_samples:
            test_data = test_data.shuffle(seed=42).select(range(test_samples))
    else:
        # Split train into train/test
        split = train_data.train_test_split(test_size=0.2, seed=42)
        train_data = split["train"]
        test_data = split["test"]

    print(f"[Preprocess] Train samples: {len(train_data)}, Test samples: {len(test_data)}")

    # Tokenize
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)

    # Detect text column
    text_col = "text" if "text" in train_data.column_names else train_data.column_names[0]
    label_col = "label" if "label" in train_data.column_names else train_data.column_names[-1]

    def tokenize_fn(examples):
        return tokenizer(
            examples[text_col],
            truncation=True,
            padding="max_length",
            max_length=args.max_length,
        )

    print("[Preprocess] Tokenizing...")
    train_tokenized = train_data.map(tokenize_fn, batched=True, remove_columns=[text_col])
    test_tokenized = test_data.map(tokenize_fn, batched=True, remove_columns=[text_col])

    # Rename label column if needed
    if label_col != "labels" and label_col in train_tokenized.column_names:
        train_tokenized = train_tokenized.rename_column(label_col, "labels")
        test_tokenized = test_tokenized.rename_column(label_col, "labels")

    # Set format for PyTorch
    train_tokenized.set_format("torch")
    test_tokenized.set_format("torch")

    # Save to disk
    output_dir = Path(args.output_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_tokenized.save_to_disk(str(output_dir / "train"))
    test_tokenized.save_to_disk(str(output_dir / "test"))

    # Save metadata
    meta = {
        "dataset": args.dataset,
        "model_name": args.model_name,
        "max_length": args.max_length,
        "num_train": len(train_tokenized),
        "num_test": len(test_tokenized),
        "num_labels": len(set(train_data[label_col])),
        "columns": train_tokenized.column_names,
    }
    with open(output_dir / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"[Preprocess] Saved to {output_dir}")

    # Log metrics and params
    mlflow.log_params({
        "dataset": args.dataset,
        "tokenizer": args.model_name,
        "max_length": args.max_length,
        "max_samples": args.max_samples,
    })
    mlflow.log_metrics({
        "num_train_samples": float(len(train_tokenized)),
        "num_test_samples": float(len(test_tokenized)),
        "num_labels": float(meta["num_labels"]),
    })
    mlflow.log_artifact(args.output_path)

    print("[Preprocess] Done")


if __name__ == "__main__":
    main()
