import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score, recall_score
import joblib

MODEL_DIR = "models"
MODEL_VERSION = "1.0.0"
os.makedirs(MODEL_DIR, exist_ok=True)

# 1. Sinh dữ liệu mô phỏng (Synthetic Data)
np.random.seed(42)
n_samples = 1200

# Tạo 4 đặc trưng (Features)
avg_current_score = np.random.uniform(2.0, 10.0, n_samples)
study_hours_past_7_days = np.random.uniform(0.0, 35.0, n_samples)
missed_deadlines_count = np.random.poisson(lam=2, size=n_samples)
task_completion_rate = np.random.uniform(0.1, 1.0, n_samples)

# Quy tắc gán nhãn giả định (Ground Truth Rule for Simulation):
# 0: LOW (Thấp), 1: MEDIUM (Trung bình), 2: HIGH (Cao)
risk_labels = []
for score, hours, missed, completion in zip(avg_current_score, study_hours_past_7_days, missed_deadlines_count, task_completion_rate):
    if score < 5.0 or missed >= 4 or (hours < 5 and completion < 0.4):
        risk_labels.append(2) # HIGH
    elif score < 6.5 or missed >= 2 or hours < 10:
        risk_labels.append(1) # MEDIUM
    else:
        risk_labels.append(0) # LOW

df = pd.DataFrame({
    'avg_current_score': avg_current_score,
    'study_hours_past_7_days': study_hours_past_7_days,
    'missed_deadlines_count': missed_deadlines_count,
    'task_completion_rate': task_completion_rate,
    'risk_level': risk_labels
})

X = df[['avg_current_score', 'study_hours_past_7_days', 'missed_deadlines_count', 'task_completion_rate']]
y = df['risk_level']

# Chia tập huấn luyện (80%) và kiểm thử (20%)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# 2. Định nghĩa các Pipeline thử nghiệm
pipe_lr = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression(random_state=42, max_iter=500))
])

pipe_rf = Pipeline([
    ('clf', RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42))
])

# 3. Huấn luyện và So sánh
pipe_lr.fit(X_train, y_train)
pipe_rf.fit(X_train, y_train)

y_pred_lr = pipe_lr.predict(X_test)
y_pred_rf = pipe_rf.predict(X_test)

f1_lr = f1_score(y_test, y_pred_lr, average='weighted')
f1_rf = f1_score(y_test, y_pred_rf, average='weighted')
recall_high_lr = recall_score(y_test, y_pred_lr, labels=[2], average=None)[0]
recall_high_rf = recall_score(y_test, y_pred_rf, labels=[2], average=None)[0]

print(f"=== KẾT QUẢ SO SÁNH MÔ HÌNH ===")
print(f"Logistic Regression - Weighted F1: {f1_lr:.4f} | Recall (High Risk): {recall_high_lr:.4f}")
print(f"Random Forest       - Weighted F1: {f1_rf:.4f} | Recall (High Risk): {recall_high_rf:.4f}")

# Chọn mô hình có Recall cao hơn cho nhóm Nguy cơ Cao (High Risk)
if recall_high_rf >= recall_high_lr:
    best_model = pipe_rf
    best_model_name = "RandomForestClassifier"
    best_f1 = f1_rf
else:
    best_model = pipe_lr
    best_model_name = "LogisticRegression"
    best_f1 = f1_lr

print(f"\n=> Chọn mô hình chính thức: {best_model_name}")

# 4. Lưu Mô hình & Thông tin Phiên bản
model_path = os.path.join(MODEL_DIR, f"risk_model_v{MODEL_VERSION}.joblib")
joblib.dump(best_model, model_path)

meta_data = {
    "version": MODEL_VERSION,
    "algorithm": best_model_name,
    "weighted_f1_score": round(best_f1, 4),
    "features": list(X.columns),
    "classes": ["LOW", "MEDIUM", "HIGH"]
}

with open(os.path.join(MODEL_DIR, "model_info.json"), "w", encoding="utf-8") as f:
    json.dump(meta_data, f, ensure_ascii=False, indent=2)

print(f"Đã lưu mô hình tại: {model_path}")