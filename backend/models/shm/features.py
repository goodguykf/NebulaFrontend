"""SHM feature path: stress signal -> rainflow cycles -> log Miner-style damage proxies.

Ported from section 26 (cell 79) of ``SHM_Fatigue_Damage_End_to_End.ipynb``. Every
proxy is ``log(sum(count * range ** m))`` for one rainflow counting convention:

* ``logS{m}_rep``       repeating-history rainflow (the turning-point sequence is
                        rotated to start at the highest peak, so the residue closes)
* ``logS5_rep_bin100``  same cycles, ranges binned to the upper edge of 100 bins
* ``logS5_plain``       ASTM E1049 rainflow with the residue counted as half cycles
* ``logS5_rep_up4``     repeating-history rainflow of the 4x upsampled signal
* ``logS{m}_c65``       repeating-history rainflow of the signal discretised to
                        65 levels between the file's own minimum and maximum
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.signal import resample_poly

from core.errors import InvalidInputError

logger = logging.getLogger(__name__)

try:
    from numba import njit
except Exception:  # pragma: no cover - pure-Python fallback (slower, same result)
    logger.warning("numba is unavailable: SHM rainflow counting will run in pure Python")

    def njit(*args, **kwargs):  # type: ignore[no-redef]
        if args and callable(args[0]):
            return args[0]
        return lambda func: func


PROXY_EXPONENTS: tuple[float, ...] = (3, 4, 4.5, 5, 5.5, 6, 7)
CLASS_EXPONENTS: tuple[float, ...] = (3, 4, 5, 6, 7)
N_CLASSES = 65
N_RANGE_BINS = 100
UPSAMPLE_FACTOR = 4

# Below this a record cannot hold a meaningful load history (training records: 581,120 samples).
MIN_SAMPLES = 1000

PROXY_COLUMNS: tuple[str, ...] = (
    *(f"logS{m}_rep" for m in PROXY_EXPONENTS),
    "logS5_rep_bin100",
    "logS5_plain",
    "logS5_rep_up4",
    *(f"logS{m}_c65" for m in CLASS_EXPONENTS),
)


# --------------------------------------------------------------------------- loading


def _read_single_column(path: Path, skiprows: int) -> pd.DataFrame:
    """Read a header-less CSV exactly like the notebook (``pd.read_csv(path, header=None)``)."""
    try:
        frame = pd.read_csv(path, header=None, skiprows=skiprows)
    except pd.errors.EmptyDataError:
        raise InvalidInputError(f"{path.name}: the file is empty.") from None
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError):
        raise InvalidInputError(f"{path.name}: the file is not a readable CSV.") from None
    frame = frame.dropna(axis=1, how="all")  # e.g. a trailing comma on every line
    if frame.shape[1] == 0:
        raise InvalidInputError(f"{path.name}: the file contains no numeric samples.")
    if frame.shape[1] != 1:
        raise InvalidInputError(
            f"{path.name}: expected 1 stress column, found {frame.shape[1]} columns."
        )
    return frame


def load_signal(path: Path) -> np.ndarray:
    """Load one SHM stress CSV (single column, no header) as a finite float64 array.

    A single non-numeric first row is tolerated as a header. Non-finite samples are
    dropped, as in the notebook.
    """
    path = Path(path)
    column = _read_single_column(path, skiprows=0).iloc[:, 0]
    if not pd.api.types.is_numeric_dtype(column):
        first_is_text = pd.isna(pd.to_numeric(column.iloc[:1], errors="coerce")).all()
        if first_is_text and len(column) > 1:
            column = _read_single_column(path, skiprows=1).iloc[:, 0]
        if not pd.api.types.is_numeric_dtype(column):
            raise InvalidInputError(f"{path.name}: the stress column contains non-numeric values.")
    signal = column.to_numpy(dtype=np.float64)
    signal = signal[np.isfinite(signal)]
    if signal.size < MIN_SAMPLES:
        raise InvalidInputError(
            f"{path.name}: only {signal.size} valid samples, at least {MIN_SAMPLES} are required."
        )
    if signal.min() == signal.max():
        raise InvalidInputError(f"{path.name}: the stress signal is constant, no load cycles found.")
    return signal


# ------------------------------------------------------------------- rainflow counting


def turning_points(x: np.ndarray) -> np.ndarray:
    """Local extrema of ``x`` (plateaus collapsed), including the first and last sample."""
    x = np.asarray(x, dtype=np.float64)
    d = np.diff(x)
    idx = np.flatnonzero(d != 0)
    if idx.size == 0:
        return x[[0, -1]]
    xs = np.concatenate(([x[0]], x[idx + 1]))
    ds = np.diff(xs)
    keep = np.ones(xs.size, dtype=bool)
    keep[1:-1] = (ds[:-1] * ds[1:]) < 0
    return xs[keep]


@njit(cache=True)
def _rainflow_core(tp):  # pragma: no cover - compiled by numba
    """ASTM E1049 three-point rainflow. Returns range, count (1 = full cycle, 0.5 = half cycle)."""
    n = tp.shape[0]
    stack = np.empty(n)
    rng = np.empty(n)
    cnt = np.empty(n)
    top = 0
    out = 0
    for i in range(n):
        stack[top] = tp[i]
        top += 1
        while top >= 3:
            r1 = abs(stack[top - 2] - stack[top - 3])
            r2 = abs(stack[top - 1] - stack[top - 2])
            if r2 < r1:
                break
            if top == 3:
                rng[out] = r1
                cnt[out] = 0.5
                out += 1
                stack[0] = stack[1]
                stack[1] = stack[2]
                top -= 1
            else:
                rng[out] = r1
                cnt[out] = 1.0
                out += 1
                stack[top - 3] = stack[top - 1]
                top -= 2
    for i in range(top - 1):
        rng[out] = abs(stack[i + 1] - stack[i])
        cnt[out] = 0.5
        out += 1
    return rng[:out], cnt[:out]


def cycles_plain(x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Rainflow with the residue counted as half cycles (ASTM default)."""
    return _rainflow_core(turning_points(x))


def cycles_repeating(x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Repeating-history rainflow: start at the highest peak so that every cycle closes."""
    tp = turning_points(x)
    i = int(np.argmax(tp))
    return _rainflow_core(turning_points(np.concatenate([tp[i:], tp[: i + 1]])))


def discretise(x: np.ndarray, k: int = N_CLASSES) -> np.ndarray:
    """Snap the signal to ``k`` equally spaced levels between its own minimum and maximum."""
    lo, hi = x.min(), x.max()
    levels = np.linspace(lo, hi, k)
    return levels[np.clip(np.rint((x - lo) / (hi - lo) * (k - 1)).astype(int), 0, k - 1)]


def log_miner(rng: np.ndarray, cnt: np.ndarray, m: float) -> float:
    """Log of the Miner-style damage sum ``sum(count * range ** m)``."""
    return float(np.log((cnt * rng**m).sum()))


# ----------------------------------------------------------------------------- proxies


def physics_proxies(x: np.ndarray) -> dict[str, float]:
    """The 15 log-damage proxies of one stress signal, keyed by ``PROXY_COLUMNS``."""
    f: dict[str, float] = {}
    r, c = cycles_repeating(x)
    for m in PROXY_EXPONENTS:
        f[f"logS{m}_rep"] = log_miner(r, c, m)
    w = r.max() / N_RANGE_BINS  # range bins, upper edge
    binned = (np.minimum(np.floor(r / w), N_RANGE_BINS - 1) + 1) * w
    f["logS5_rep_bin100"] = log_miner(binned, c, 5)
    rp, cp = cycles_plain(x)
    f["logS5_plain"] = log_miner(rp, cp, 5)
    ru, cu = cycles_repeating(resample_poly(x, UPSAMPLE_FACTOR, 1))
    f["logS5_rep_up4"] = log_miner(ru, cu, 5)
    rc, cc = cycles_repeating(discretise(x, N_CLASSES))
    for m in CLASS_EXPONENTS:
        f[f"logS{m}_c65"] = log_miner(rc, cc, m)
    return f


def proxies_for_file(path: Path) -> dict[str, float]:
    """Load one CSV and compute its proxies; rejects signals whose proxies are not finite."""
    path = Path(path)
    proxies = physics_proxies(load_signal(path))
    if not all(np.isfinite(value) for value in proxies.values()):
        raise InvalidInputError(f"{path.name}: the stress signal contains no countable load cycles.")
    return proxies
