"""
Benchmark Module — Evaluate trained model and apply gating logic.

Runs inference on test set, measures accuracy/latency/throughput,
and checks if model meets quality thresholds.
"""

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.config import base_parser
from common.mlflow_utils import MLflowHelper


def parse_args():
    parser = base_parser("LLMOps Benchmark Module")
    parser.add_argument("--model-path", default="models/model/best", help="Trained model dir")
    parser.add_argument("--data-path", default="data/processed", help="Preprocessed data dir")
    parser.add_argument("--batch-size", type=int, default=32, help="Inference batch size")
    parser.add_argument("--accuracy-threshold", type=float, default=0.70, help="Min accuracy to pass")
    parser.add_argument("--test-data", default="data/test", help="Test data path (unused, for compat)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    mlflow = MLflowHelper(args.mlflow_tracking_uri, args.run_id)
    mlflow.set_tag("stage", "benchmark")

    print(f"[Benchmark] Model: {args.model_path}")
    print(f"[Benchmark] Accuracy threshold: {args.accuracy_threshold}")

    from datasets import load_from_disk
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
    import numpy as np

    # Load test data
    data_path = Path(args.data_path)
    test_dataset = load_from_disk(str(data_path / "test"))

    # Load model and tokenizer
    model = AutoModelForSequenceClassification.from_pretrained(args.model_path)
    tokenizer = AutoTokenizer.from_pretrained(args.model_path)

    print(f"[Benchmark] Test samples: {len(test_dataset)}")

    # Run inference in batches
    model.eval()

    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)

    correct = 0
    total = 0
    latencies: list[float] = []

    with torch.no_grad():
        for i in range(0, len(test_dataset), args.batch_size):
            batch = test_dataset[i:i + args.batch_size]

            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"]

            start_time = time.perf_counter()
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            elapsed = time.perf_counter() - start_time

            predictions = torch.argmax(outputs.logits, dim=-1).cpu().numpy()

            if isinstance(labels, torch.Tensor):
                labels_np = labels.numpy()
            else:
                labels_np = np.array(labels)

            correct += (predictions == labels_np).sum()
            total += len(labels_np)
            latencies.append(elapsed)

    accuracy = correct / total if total > 0 else 0.0
    avg_latency_ms = (sum(latencies) / len(latencies)) * 1000 if latencies else 0.0
    total_time = sum(latencies)
    throughput = total / total_time if total_time > 0 else 0.0

    # Memory usage estimate
    memory_mb = torch.cuda.memory_allocated() / 1e6 if torch.cuda.is_available() else 0.0

    print(f"[Benchmark] Accuracy: {accuracy:.4f}")
    print(f"[Benchmark] Avg latency: {avg_latency_ms:.2f}ms")
    print(f"[Benchmark] Throughput: {throughput:.1f} samples/sec")
    print(f"[Benchmark] GPU memory: {memory_mb:.1f}MB")

    metrics = {
        "accuracy": float(accuracy),
        "latency_ms": float(avg_latency_ms),
        "throughput": float(throughput),
        "memory_mb": float(memory_mb),
        "num_test_samples": float(total),
    }

    mlflow.log_metrics(metrics)
    mlflow.log_params({
        "batch_size": args.batch_size,
        "accuracy_threshold": args.accuracy_threshold,
        "device": device,
    })

    # Gating check
    passed = accuracy >= args.accuracy_threshold
    mlflow.set_tag("benchmark_pass", "1" if passed else "0")
    mlflow.log_metric("benchmark_pass", 1.0 if passed else 0.0)

    # Save results
    results = {**metrics, "passed": passed, "threshold": args.accuracy_threshold}
    results_path = Path(args.model_path).parent / "benchmark_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    mlflow.log_artifact(str(results_path))

    if passed:
        print(f"[Benchmark] PASSED (accuracy {accuracy:.4f} >= {args.accuracy_threshold})")
    else:
        print(f"[Benchmark] FAILED (accuracy {accuracy:.4f} < {args.accuracy_threshold})")
        sys.exit(1)

    print("[Benchmark] Done")


if __name__ == "__main__":
    main()
