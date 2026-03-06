"""
MLflow utility helpers for pipeline modules.
Handles MLflow client setup and metric/artifact logging via REST API.
"""

import json
import urllib.request
import urllib.error
from typing import Any


class MLflowHelper:
    """Lightweight MLflow REST client for Python modules."""

    def __init__(self, tracking_uri: str, run_id: str) -> None:
        self.tracking_uri = tracking_uri.rstrip("/")
        self.run_id = run_id
        self.base_url = f"{self.tracking_uri}/api/2.0/mlflow"

    def _post(self, endpoint: str, data: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        payload = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as e:
            print(f"[MLflow] Warning: API call failed: {e}")
            return {}

    def log_param(self, key: str, value: str) -> None:
        self._post("/runs/log-parameter", {
            "run_id": self.run_id,
            "key": key,
            "value": str(value),
        })

    def log_params(self, params: dict[str, Any]) -> None:
        for key, value in params.items():
            self.log_param(key, str(value))

    def log_metric(self, key: str, value: float, step: int = 0) -> None:
        self._post("/runs/log-metric", {
            "run_id": self.run_id,
            "key": key,
            "value": value,
            "timestamp": 0,
            "step": step,
        })
        # Also output METRIC: for TypeScript stage parsing
        print(f"METRIC:{key}={value}")

    def log_metrics(self, metrics: dict[str, float], step: int = 0) -> None:
        for key, value in metrics.items():
            self.log_metric(key, value, step)

    def set_tag(self, key: str, value: str) -> None:
        self._post("/runs/set-tag", {
            "run_id": self.run_id,
            "key": key,
            "value": value,
        })

    def log_artifact(self, local_path: str) -> None:
        """Log artifact path (actual upload handled by MLflow client)."""
        self.set_tag(f"artifact:{local_path}", local_path)
        print(f"ARTIFACT:{local_path}")
