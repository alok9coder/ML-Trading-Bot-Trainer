# ============================================================
# Dual-Stage ML Training Script (ENTRY + ENTRY TYPE + EXIT)
# ============================================================

import numpy as np
import pandas as pd

import joblib
import os

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    accuracy_score
)


# ============================================================
# CONFIG
# ============================================================

MODEL_DIR = "./ML_Models"
os.makedirs(MODEL_DIR, exist_ok=True)

symbol = "ONGC"                  # Can later make this dynamic.
print(f"Symbol ====> {symbol}")

ENTRY_THRESHOLD = 0.75
EXIT_THRESHOLD = 0.75

RANDOM_STATE = 42

# ============================================================
# FEATURE SETS (LOCKED)
# ============================================================

ENTRY_FEATURES = [
    # Structural / Regime (Donchian)
    "donchian_score",
    "donchian_width",
    "donchian_width_delta_5",
    "donchian_width_delta_10",

    # Higher timeframe structure (60-period Donchian)
    "donchian_score_60",
    "donchian_width_60",

    # Volatility (Bollinger Bands)
    "bollinger_score",
    "bollinger_width",
    "bollinger_width_delta_5",

    # Bollinger width deltas (expansion / contraction)
    "bb_width_delta_t0",
    "bb_width_delta_t1",
    "bb_width_delta_t2",
    "bb_width_delta_t3",
    "bb_width_delta_t4",

    # Momentum (Velocity)
    "vel_t0",
    "vel_t1",
    "vel_t2",
    "vel_t3",
    "vel_t4",
    "mean_vel",

    # Momentum (Acceleration)
    "acc_t0",
    "acc_t1",
    "acc_t2",
    "acc_t3",
    "mean_acc",

    # Volume / Participation
    "volume",
    "avg_volume",
    "volume_ratio_t",
    "body_oc_t1",

    # Context
    "candleSequence",
]

ENTRY_TYPE_FEATURES = [
    "mean_acc",
    "mean_vel",
    "vel_t0",
    "vel_t1",
    "vel_t2",
    "acc_t0",
    "acc_t1",
    "body_oc_t1",
    "body_oc_t",
    "donchian_score",
    "donchian_score_60",
    "bollinger_score",
]

EXIT_FEATURES = ENTRY_FEATURES.copy()

# ============================================================
# PREPROCESSING UTILITY (CRITICAL)
# ============================================================

def prepare_features(df, feature_columns, fit=True, imputer=None, scaler=None):
    """
    Prepares features with consistent preprocessing.
    When fit=False, previously fitted imputer & scaler MUST be passed.
    """

    X = df[feature_columns].values
    y = df["label"].values if "label" in df.columns else None

    if fit:
        imputer = SimpleImputer(strategy="mean")
        X = imputer.fit_transform(X)

    else:
        X = imputer.transform(X)

    return X, y, imputer

# ============================================================
# STAGE 1 : ENTRY MODEL (RandomForest)
# ============================================================

print("\n==============================")
print(" STAGE 1 : ENTRY MODEL (RF)")
print("==============================")

entry_df = pd.read_csv(f"./Data/{symbol}_Entry.csv")

X_entry, y_entry, entry_imputer = prepare_features(
    entry_df,
    ENTRY_FEATURES,
    fit=True
)

X_train, X_test, y_train, y_test = train_test_split(
    X_entry,
    y_entry,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y_entry
)

entry_model = RandomForestClassifier(
    n_estimators=400,
    max_depth=8,
    min_samples_leaf=50,
    class_weight="balanced",
    random_state=RANDOM_STATE,
    n_jobs=-1
)

entry_model.fit(X_train, y_train)

y_prob = entry_model.predict_proba(X_test)[:, 1]
y_pred = (y_prob >= ENTRY_THRESHOLD).astype(int)

print("\n[ENTRY MODEL RESULTS]")
print("Threshold:", ENTRY_THRESHOLD)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

# ============================================================
# STAGE 2 : ENTRY TYPE MODEL (Logistic Regression)
# ============================================================

print("\n==============================")
print(" STAGE 2 : ENTRY TYPE MODEL")
print("==============================")

entry_type_df = pd.read_csv(f"./Data/{symbol}_Entry_Type.csv")

# Safety: remove neutral labels
entry_type_df = entry_type_df[entry_type_df["label"] != 0]

X_type, y_type, type_imputer = prepare_features(
    entry_type_df,
    ENTRY_TYPE_FEATURES,
    fit=True
)

X_train, X_test, y_train, y_test = train_test_split(
    X_type,
    y_type,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y_type
)

entry_type_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    min_samples_leaf=50,
    class_weight="balanced",
    random_state=RANDOM_STATE,
    n_jobs=-1
)

entry_type_model.fit(X_train, y_train)

y_pred = entry_type_model.predict(X_test)

print("\n[ENTRY TYPE MODEL RESULTS]")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

# ============================================================
# ENTRY FEATURE IMPORTANCE
# ============================================================

print("\n[ENTRY MODEL FEATURE IMPORTANCE]")

entry_feature_importance_df = pd.DataFrame({
    "feature": ENTRY_FEATURES,
    "importance": entry_model.feature_importances_
}).sort_values("importance", ascending=False)

print(entry_feature_importance_df)

# ============================================================
# STAGE 3 : EXIT MODEL (RandomForest)
# ============================================================

print("\n==============================")
print(" STAGE 3 : EXIT MODEL (RF)")
print("==============================")

exit_df = pd.read_csv(f"./Data/{symbol}_Exit.csv")

X_exit, y_exit, exit_imputer = prepare_features(
    exit_df,
    EXIT_FEATURES,
    fit=True
)

X_train, X_test, y_train, y_test = train_test_split(
    X_exit,
    y_exit,
    test_size=0.2,
    random_state=RANDOM_STATE,
    stratify=y_exit
)

exit_model = RandomForestClassifier(
    n_estimators=400,
    max_depth=8,
    min_samples_leaf=50,
    class_weight="balanced",
    random_state=RANDOM_STATE,
    n_jobs=-1
)

exit_model.fit(X_train, y_train)

y_prob = exit_model.predict_proba(X_test)[:, 1]
y_pred = (y_prob >= EXIT_THRESHOLD).astype(int)

print("\n[EXIT MODEL RESULTS]")
print("Threshold:", EXIT_THRESHOLD)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

# ============================================================
# EXIT FEATURE IMPORTANCE
# ============================================================

print("\n[EXIT MODEL FEATURE IMPORTANCE]")

exit_feature_importance_df = pd.DataFrame({
    "feature": EXIT_FEATURES,
    "importance": exit_model.feature_importances_
}).sort_values("importance", ascending=False)

print(exit_feature_importance_df)

print("\nTraining complete.")


# ============================================================
# SAVE TRAINED MODELS & PREPROCESSORS
# ============================================================
# IMPORTANT:
# A trained model is useless without the SAME preprocessing object.
# We save:
#   - ENTRY model + imputer
#   - ENTRY TYPE model + imputer
#   - EXIT model + imputer
# These will be loaded by the live trading bot for inference.

# ---------- ENTRY ----------
joblib.dump(entry_model, f"{MODEL_DIR}/{symbol}_entry_model.pkl")
joblib.dump(entry_imputer, f"{MODEL_DIR}/{symbol}_entry_imputer.pkl")

# ---------- ENTRY TYPE ----------
joblib.dump(entry_type_model, f"{MODEL_DIR}/{symbol}_entry_type_model.pkl")
joblib.dump(type_imputer, f"{MODEL_DIR}/{symbol}_entry_type_imputer.pkl")

# ---------- EXIT ----------
joblib.dump(exit_model, f"{MODEL_DIR}/{symbol}_exit_model.pkl")
joblib.dump(exit_imputer, f"{MODEL_DIR}/{symbol}_exit_imputer.pkl")

print("\nModels saved successfully.")


