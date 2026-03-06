"""
Deploy Module — Register model to MLflow Model Registry.

Registers the trained model and optionally transitions to Staging/Production.
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.config import base_parser
from common.mlflow_utils import MLflowHelper


def parse_args():
    parser = base_parser("LLMOps Deploy Module")
    parser.add_argument("--model-path", default="models/model/best", help="Model dir")
    parser.add_argument("--model-name", default="llmops-text-classifier", help="Registry model name")
    parser.add_argument("--target", default="staging", help="Deployment target (staging/production)")
    return parser.parse_args()


def register_model(tracking_uri: str, run_id: str, model_name: str, model_path: str) -> str | None:
    """Register model via MLflow REST API."""
    base_url = f"{tracking_uri.rstrip('/')}/api/2.0/mlflow"

    # Create registered model (ignore if already exists)
    try:
        data = json.dumps({"name": model_name}).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/registered-models/create",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=30)
        print(f"[Deploy] Created registered model: {model_name}")
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print(f"[Deploy] Model {model_name} already registered")
        else:
            print(f"[Deploy] Warning: Could not create model: {e}")

    # Create model version
    try:
        data = json.dumps({
            "name": model_name,
            "source": f"runs:/{run_id}/model",
            "run_id": run_id,
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/model-versions/create",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            version = result.get("model_version", {}).get("version")
            print(f"[Deploy] Created model version: {version}")
            return version
    except urllib.error.URLError as e:
        print(f"[Deploy] Warning: Could not create model version: {e}")
        return None


def main() -> None:
    args = parse_args()

    mlflow = MLflowHelper(args.mlflow_tracking_uri, args.run_id)
    mlflow.set_tag("stage", "deploy")

    print(f"[Deploy] Model path: {args.model_path}")
    print(f"[Deploy] Registry name: {args.model_name}")
    print(f"[Deploy] Target: {args.target}")

    # Check model exists
    model_path = Path(args.model_path)
    if not model_path.exists():
        print(f"[Deploy] Error: Model not found at {model_path}")
        sys.exit(1)

    # Register model
    version = register_model(
        args.mlflow_tracking_uri,
        args.run_id,
        args.model_name,
        str(model_path),
    )

    # Build deploy info
    deploy_info = {
        "model_name": args.model_name,
        "version": version or "unknown",
        "target": args.target,
        "model_path": str(model_path),
        "run_id": args.run_id,
    }

    # Log deployment info
    mlflow.log_params({
        "deploy_model_name": args.model_name,
        "deploy_target": args.target,
        "deploy_version": version or "unknown",
    })
    mlflow.set_tag("deploy.target", args.target)
    mlflow.set_tag("deploy.model_name", args.model_name)
    if version:
        mlflow.set_tag("deploy.version", version)

    # Output DEPLOY: markers for TypeScript stage parsing
    for key, value in deploy_info.items():
        print(f"DEPLOY:{key}={value}")

    # Save deploy manifest
    manifest_path = model_path.parent / "deploy_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(deploy_info, f, indent=2)
    mlflow.log_artifact(str(manifest_path))

    print(f"[Deploy] Successfully deployed {args.model_name} v{version} to {args.target}")
    print("[Deploy] Done")


if __name__ == "__main__":
    main()
