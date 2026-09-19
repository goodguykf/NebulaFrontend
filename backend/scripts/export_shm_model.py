"""Fit the final SHM model on the labelled training files and export it for the API.

Run once, offline, from the backend directory:

    python scripts/export_shm_model.py [--data-dir <02_Datasets/SHM>] [--output <file.joblib>]

Reproduces section 27 (cell 84) of ``SHM_Fatigue_Damage_End_to_End.ipynb``: the
"FINAL blend (log-linear + Huber)" fitted on log-damage of every training file.
No cross-validation and no model selection happen here.
"""

from __future__ import annotations

import argparse
import io
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import joblib  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import sklearn  # noqa: E402

import config  # noqa: E402
from models.shm import features  # noqa: E402
from models.shm.model import Blend, LinearOnProxies  # noqa: E402

logger = logging.getLogger("export_shm_model")

LINEAR_COLUMNS = ["logS3_rep", "logS5_c65"]


def build_training_proxies(train_dir: Path) -> pd.DataFrame:
    """One row of proxies per training CSV, sorted by file name (as in the notebook)."""
    paths = sorted(train_dir.glob("*.csv"))
    if not paths:
        raise FileNotFoundError(f"no training CSV files in {train_dir}")
    rows = []
    for number, path in enumerate(paths, start=1):
        rows.append({"file_id": path.name, **features.proxies_for_file(path)})
        logger.info("proxies %d/%d: %s", number, len(paths), path.name)
    return pd.DataFrame(rows)


def through_csv_cache(proxies: pd.DataFrame) -> pd.DataFrame:
    """Round-trip the proxies through CSV text, as the notebook's proxy cache did.

    The notebook fitted on proxies re-read from ``shm_physics_proxies_v2.csv`` with
    pandas' default float parser, which moves some values by one ULP. The Huber fit
    stops at a tolerance, so that one-ULP change shifts predictions by about 1e-5;
    repeating the round trip makes the exported model identical to the notebook's.
    """
    buffer = io.StringIO()
    proxies.to_csv(buffer, index=False)
    buffer.seek(0)
    return pd.read_csv(buffer)


def attach_labels(proxies: pd.DataFrame, label_file: Path) -> pd.DataFrame:
    """Inner-join proxies with ``Train_Labels.csv`` (columns: filename, damage)."""
    labels = pd.read_csv(label_file)
    table = (
        proxies.merge(labels, left_on="file_id", right_on="filename")
        .sort_values("file_id")
        .reset_index(drop=True)
    )
    unlabelled = sorted(set(proxies["file_id"]) - set(table["file_id"]))
    if unlabelled:
        logger.warning("%d training files have no label and are ignored: %s", len(unlabelled), unlabelled)
    if table.empty:
        raise ValueError(f"no training file matches a label in {label_file}")
    if not (table["damage"] > 0).all():
        raise ValueError("damage labels must be positive (the model is fitted on log-damage)")
    return table


def fit_final_model(table: pd.DataFrame, proxy_columns: list[str]) -> Blend:
    """FINAL blend: mean of OLS on [logS3_rep, logS5_c65] and Huber on all proxies, in log-damage."""
    y_log = np.log(table["damage"].to_numpy())
    model = Blend(
        [
            LinearOnProxies(LINEAR_COLUMNS),
            LinearOnProxies(proxy_columns, robust=True),
        ]
    )
    return model.fit(table, y_log)


def training_mape(model: Blend, table: pd.DataFrame) -> float:
    damage = table["damage"].to_numpy()
    return float(np.mean(np.abs(np.exp(model.predict(table)) - damage) / damage))


def build_artifact(model: Blend, table: pd.DataFrame, proxy_columns: list[str]) -> dict:
    """Everything inference needs, in one dict."""
    return {
        "model": model,
        "model_name": "FINAL blend (log-linear + Huber)",
        "target_transform": "log",  # prediction = exp(model.predict(proxies))
        "proxy_columns": proxy_columns,
        "linear_columns": list(LINEAR_COLUMNS),
        "proxy_exponents": list(features.PROXY_EXPONENTS),
        "class_exponents": list(features.CLASS_EXPONENTS),
        "n_classes": features.N_CLASSES,
        "n_range_bins": features.N_RANGE_BINS,
        "upsample_factor": features.UPSAMPLE_FACTOR,
        "residue": "closed: repeating history started at the highest peak",
        "proxy_train_min": table[proxy_columns].min().to_dict(),
        "proxy_train_max": table[proxy_columns].max().to_dict(),
        "n_training_files": int(len(table)),
        "training_mape": training_mape(model, table),
        "sklearn_version": sklearn.__version__,
        "numpy_version": np.__version__,
        "pandas_version": pd.__version__,
        "created_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=config.dataset_dir() / "SHM",
        help="folder holding Train/ and Train_Labels.csv",
    )
    parser.add_argument("--output", type=Path, default=config.SHM_MODEL_PATH, help="joblib file to write")
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args()
    started = time.perf_counter()

    proxies = through_csv_cache(build_training_proxies(args.data_dir / "Train"))
    proxy_columns = [column for column in proxies.columns if column.startswith("logS")]
    table = attach_labels(proxies, args.data_dir / "Train_Labels.csv")
    model = fit_final_model(table, proxy_columns)
    artifact = build_artifact(model, table, proxy_columns)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, args.output)
    logger.info(
        "fitted on %d files, training MAPE %.3f %%, saved %s (%.1f kB) in %.1f s",
        artifact["n_training_files"],
        100 * artifact["training_mape"],
        args.output,
        args.output.stat().st_size / 1024,
        time.perf_counter() - started,
    )


if __name__ == "__main__":
    main()
