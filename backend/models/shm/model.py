"""Estimators of the final SHM model (notebook section 26.1, cell 81), behaviour unchanged.

They live in an importable module (not ``__main__``) so that joblib can deserialise
the exported artifact inside the API process. Both work on a DataFrame of log-damage
proxies and predict log-damage; the caller applies ``exp``.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
import pandas as pd
from sklearn.linear_model import HuberRegressor, LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


class LinearOnProxies:
    """Log-linear model on selected proxy columns: OLS, or standardised Huber when ``robust``."""

    def __init__(self, cols: Sequence[str], robust: bool = False) -> None:
        self.cols, self.robust = cols, robust

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "LinearOnProxies":
        estimator = (
            make_pipeline(StandardScaler(), HuberRegressor(alpha=1.0, max_iter=5000))
            if self.robust
            else LinearRegression()
        )
        self.m = estimator.fit(X[self.cols], y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.m.predict(X[self.cols])


class Blend:
    """Unweighted mean of the member models' predictions (in log-damage space)."""

    def __init__(self, models: Sequence[LinearOnProxies]) -> None:
        self.models = models

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "Blend":
        for model in self.models:
            model.fit(X, y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return np.mean([model.predict(X) for model in self.models], axis=0)
