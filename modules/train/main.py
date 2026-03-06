"""
Train Module — Fine-tune a transformer model for text classification.

Uses HuggingFace Trainer API with preprocessed dataset from preprocess stage.
Logs per-epoch metrics and saves model checkpoint.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.config import base_parser
from common.mlflow_utils import MLflowHelper


def parse_args():
    parser = base_parser("LLMOps Train Module")
    parser.add_argument("--data-path", default="data/processed", help="Preprocessed data dir")
    parser.add_argument("--model-output", default="models/model", help="Model output dir")
    parser.add_argument("--model-name", default="distilbert-base-uncased", help="Base model")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--learning-rate", type=float, default=2e-5, help="Learning rate")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--weight-decay", type=float, default=0.01, help="Weight decay")
    return parser.parse_args()


class MetricCallback:
    """Callback to log metrics per epoch via MLflow and stdout."""

    def __init__(self, mlflow_helper: MLflowHelper) -> None:
        self.mlflow = mlflow_helper

    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs and state.global_step > 0:
            step = state.global_step
            for key, value in logs.items():
                if isinstance(value, (int, float)):
                    self.mlflow.log_metric(key, float(value), step=step)


def main() -> None:
    args = parse_args()

    mlflow = MLflowHelper(args.mlflow_tracking_uri, args.run_id)
    mlflow.set_tag("stage", "train")

    print(f"[Train] Model: {args.model_name}")
    print(f"[Train] Epochs: {args.epochs}, LR: {args.learning_rate}, Batch: {args.batch_size}")

    from datasets import load_from_disk
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
    )
    import evaluate
    import numpy as np

    # Load preprocessed data
    data_path = Path(args.data_path)
    meta_path = data_path / "metadata.json"

    if not meta_path.exists():
        print(f"[Train] Error: metadata.json not found at {meta_path}")
        sys.exit(1)

    with open(meta_path) as f:
        meta = json.load(f)

    num_labels = meta["num_labels"]
    print(f"[Train] Num labels: {num_labels}")

    train_dataset = load_from_disk(str(data_path / "train"))
    eval_dataset = load_from_disk(str(data_path / "test"))

    print(f"[Train] Train: {len(train_dataset)}, Eval: {len(eval_dataset)}")

    # Load model
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name, num_labels=num_labels
    )

    # Metrics
    accuracy_metric = evaluate.load("accuracy")

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        return accuracy_metric.compute(predictions=predictions, references=labels)

    # Training args
    output_dir = Path(args.model_output)
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        save_total_limit=2,
        report_to="none",  # We handle logging ourselves
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics,
    )

    # Log params
    mlflow.log_params({
        "model_name": args.model_name,
        "num_labels": num_labels,
        "epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "batch_size": args.batch_size,
        "weight_decay": args.weight_decay,
        "num_train": len(train_dataset),
        "num_eval": len(eval_dataset),
    })

    # Train
    print("[Train] Starting training...")
    train_result = trainer.train()

    # Log training metrics
    train_metrics = train_result.metrics
    print(f"[Train] Training loss: {train_metrics.get('train_loss', 'N/A')}")
    mlflow.log_metrics({
        k: float(v) for k, v in train_metrics.items() if isinstance(v, (int, float))
    })

    # Evaluate
    print("[Train] Running evaluation...")
    eval_metrics = trainer.evaluate()
    print(f"[Train] Eval accuracy: {eval_metrics.get('eval_accuracy', 'N/A')}")
    print(f"[Train] Eval loss: {eval_metrics.get('eval_loss', 'N/A')}")
    mlflow.log_metrics({
        k: float(v) for k, v in eval_metrics.items() if isinstance(v, (int, float))
    })

    # Save best model
    trainer.save_model(str(output_dir / "best"))
    AutoTokenizer.from_pretrained(args.model_name).save_pretrained(str(output_dir / "best"))

    # Save training summary
    summary = {
        "model_name": args.model_name,
        "num_labels": num_labels,
        "epochs": args.epochs,
        "train_loss": train_metrics.get("train_loss"),
        "eval_accuracy": eval_metrics.get("eval_accuracy"),
        "eval_loss": eval_metrics.get("eval_loss"),
    }
    with open(output_dir / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    mlflow.log_artifact(str(output_dir))
    mlflow.log_metric("accuracy", float(eval_metrics.get("eval_accuracy", 0)))
    mlflow.log_metric("loss", float(eval_metrics.get("eval_loss", 0)))

    print("[Train] Done")


if __name__ == "__main__":
    main()
