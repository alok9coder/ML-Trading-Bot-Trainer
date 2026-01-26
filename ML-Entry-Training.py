# ============================================================
# Dual-Stage ML Training Script (ENTRY + ENTRY TYPE)
# ============================================================

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    accuracy_score
)

symbol = "ONGC"
print(f"Symbol ====> {symbol}")

ENTRY_THRESHOLD = 0.8

# ============================================================
# FEATURE SETS (LOCK THESE)
# ============================================================

ENTRY_FEATURES = [
    #"avg_range",
    "donchian_width",
    "acc_t0",
    "range_hl_t",
    "avg_volume",
    "donchian_width_delta_5",
    "vel_t1",
    "body_oc_t",
    "candleSequence",
    "donchian_width_delta_10",
    "vel_t0",
    "mean_vel",
    "vel_t2",
    "volume",
    "donchian_score",
    "acc_t1",
    "mean_acc",
    "donchian_score_trend",
    "vel_t3",
    "range_ratio_t",
    "lower_wick_t",
    "volume_ratio_t",
    "upper_wick_t",
    "acc_t2",
    "vel_t4",
    #"close",
    #"high",
    #"open",
    #"low",
    "acc_t3",
    "vel_t5",
    "vel_t8",
    "vel_t6",
    "acc_t6",
    "acc_t5",
    "vel_t7",
    "acc_t7",
    "acc_t4"
]

ENTRY_TYPE_FEATURES = [
    # ---- Signed Momentum
    "mean_vel",
    "vel_t0",
    "vel_t1",
    "vel_t2",
    "acc_t0",
    "acc_t1",

    # ---- Candle Shape
    "body_oc_t",
    "upper_wick_t",
    "lower_wick_t",
    "range_hl_t",

    # ---- Trend Bias
    "donchian_score_trend"
]

# ============================================================
# UTILITY: Prepare Features
# ============================================================

def prepare_features(df, feature_columns):
    X = df[feature_columns].values
    y = df["label"].values

    imputer = SimpleImputer(strategy="mean")
    X = imputer.fit_transform(X)

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    return X, y


# ============================================================
# STAGE 1: ENTRY MODEL (RandomForest)
# ============================================================

print("\n==============================")
print(" STAGE 1 : ENTRY MODEL (RF)")
print("==============================")

entry_df = pd.read_csv(f"./Data/{symbol}_Entry.csv")

NON_FEATURE_COLUMNS = [
    "instrument",
    "candleColor",
    "date",
    "label"
]
'''
ENTRY_FEATURES = [
    col for col in entry_df.columns
    if col not in NON_FEATURE_COLUMNS
]
'''
X_entry, y_entry = prepare_features(entry_df, ENTRY_FEATURES)

X_train, X_test, y_train, y_test = train_test_split(
    X_entry,
    y_entry,
    test_size=0.2,
    random_state=42,
    stratify=y_entry
)

entry_model = RandomForestClassifier(
    n_estimators=400,
    max_depth=8,
    min_samples_leaf=50,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

entry_model.fit(X_train, y_train)

# ---- Probability-based prediction
y_prob = entry_model.predict_proba(X_test)[:, 1]

y_pred = (y_prob >= ENTRY_THRESHOLD).astype(int)

print("\n[ENTRY MODEL RESULTS]")
print("Threshold:", ENTRY_THRESHOLD)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))


# ============================================================
# STAGE 2: ENTRY TYPE MODEL (Logistic Regression)
# ============================================================

print("\n==============================")
print(" STAGE 2 : ENTRY TYPE MODEL")
print("==============================")

entry_type_df = pd.read_csv(f"./Data/{symbol}_Entry_Type.csv")

# ---- Safety: ensure no zero labels
entry_type_df = entry_type_df[entry_type_df["label"] != 0]

X_type, y_type = prepare_features(entry_type_df, ENTRY_TYPE_FEATURES)

X_train, X_test, y_train, y_test = train_test_split(
    X_type,
    y_type,
    test_size=0.2,
    random_state=42,
    stratify=y_type
)

entry_type_model = LogisticRegression(
    max_iter=1000,
    class_weight="balanced",
    solver="lbfgs"
)

entry_type_model.fit(X_train, y_train)

y_pred = entry_type_model.predict(X_test)

print("\n[ENTRY TYPE MODEL RESULTS]")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))


# ============================================================
# FEATURE IMPORTANCE (ENTRY MODEL)
# ============================================================

print("\n[ENTRY MODEL FEATURE IMPORTANCE]")

feature_importance_df = pd.DataFrame({
    "feature": ENTRY_FEATURES,
    "importance": entry_model.feature_importances_
}).sort_values("importance", ascending=False)

print(feature_importance_df)


#input("\nTraining complete. Press Enter to exit...")
