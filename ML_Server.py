from flask import Flask, request, jsonify
import numpy as np
import joblib
import os

# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

# ============================================================
# MODEL CONFIG
# ============================================================

MODEL_DIR = "./ML_Models"
SYMBOL = "ONGC"   # you can later make this dynamic

ENTRY_THRESHOLD = 0.75
EXIT_THRESHOLD = 0.75

# ============================================================
# LOAD MODELS ON STARTUP (CRITICAL)
# ============================================================

# ---------- ENTRY ----------
entry_model = joblib.load(f"{MODEL_DIR}/{SYMBOL}_entry_model.pkl")
entry_imputer = joblib.load(f"{MODEL_DIR}/{SYMBOL}_entry_imputer.pkl")

# ---------- ENTRY TYPE ----------
entry_type_model = joblib.load(f"{MODEL_DIR}/{SYMBOL}_entry_type_model.pkl")
entry_type_imputer = joblib.load(f"{MODEL_DIR}/{SYMBOL}_entry_type_imputer.pkl")

# ---------- EXIT ----------
exit_model = joblib.load(f"{MODEL_DIR}/{SYMBOL}_exit_model.pkl")
exit_imputer = joblib.load(f"{MODEL_DIR}/{SYMBOL}_exit_imputer.pkl")

print("✅ Models loaded successfully")

# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "message": "Flask ML server is running smoothly"
    }), 200

# ============================================================
# ENTRY PREDICTION
# ============================================================

@app.route("/entry", methods=["POST"])
def entry_prediction():
    data = request.get_json()

    features = data.get("features")  # list of floats

    # ---- Convert to NumPy (2D)
    X = np.array(features, dtype=np.float64).reshape(1, -1)

    # ---- Apply SAME preprocessing as training
    X = entry_imputer.transform(X)

    # ---- Predict probability
    prob = entry_model.predict_proba(X)[0, 1]

    decision = int(prob >= ENTRY_THRESHOLD)

    return jsonify({
        "entry_probability": float(prob),
        "entry_signal": decision
    }), 200

# ============================================================
# ENTRY TYPE PREDICTION (BUY / SELL)
# ============================================================

@app.route("/entry_type", methods=["POST"])
def entry_type_prediction():
    data = request.get_json()

    features = data.get("features")

    X = np.array(features, dtype=np.float64).reshape(1, -1)
    X = entry_type_imputer.transform(X)

    # Returns 1 (BUY) or -1 (SELL)
    direction = int(entry_type_model.predict(X)[0])

    return jsonify({
        "entry_type": direction
    }), 200

# ============================================================
# EXIT PREDICTION
# ============================================================

@app.route("/exit", methods=["POST"])
def exit_prediction():
    data = request.get_json()

    features = data.get("features")

    X = np.array(features, dtype=np.float64).reshape(1, -1)
    X = exit_imputer.transform(X)

    proba = exit_model.predict_proba(X)

    # Defensive: handle single-class edge case
    if proba.shape[1] == 2:
        prob = proba[0, 1]
    else:
        prob = exit_model.classes_[0]

    decision = int(prob >= EXIT_THRESHOLD)

    return jsonify({
        "exit_probability": float(prob),
        "exit_signal": decision
    }), 200

# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=1111,
        debug=False
    )
