import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import pandas as pd
import joblib

app = FastAPI(
    title="Study AI Service",
    description="Dịch vụ AI dự đoán nguy cơ học tập và sinh đề xuất cá nhân hóa",
    version="1.0.0"
)

# 1. Load Model & Metadata
MODEL_DIR = "models"
MODEL_INFO_PATH = os.path.join(MODEL_DIR, "model_info.json")

if not os.path.exists(MODEL_INFO_PATH):
    raise RuntimeError("Chưa tìm thấy mô hình. Vui lòng chạy 'python train_model.py' trước!")

with open(MODEL_INFO_PATH, "r", encoding="utf-8") as f:
    model_info = json.load(f)

MODEL_VERSION = model_info["version"]
MODEL_PATH = os.path.join(MODEL_DIR, f"risk_model_v{MODEL_VERSION}.joblib")
model = joblib.load(MODEL_PATH)
RISK_MAP = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

# 2. Pydantic Schemas
class PredictRequest(BaseModel):
    avg_current_score: float = Field(..., ge=0.0, le=10.0, description="Điểm trung bình hiện tại (0-10)")
    study_hours_past_7_days: float = Field(..., ge=0.0, description="Tổng số giờ học trong 7 ngày qua")
    missed_deadlines_count: int = Field(..., ge=0, description="Số bài tập trễ hạn")
    task_completion_rate: float = Field(..., ge=0.0, le=1.0, description="Tỷ lệ hoàn thành bài tập (0.0 - 1.0)")

class PredictResponse(BaseModel):
    risk_level: str
    probabilities: dict
    model_version: str

class RecommendationItem(BaseModel):
    action_text: str
    reason: str
    priority: int  # 1: Cao, 2: Trung bình, 3: Thấp

class RecommendationRequest(BaseModel):
    risk_level: str
    avg_current_score: float
    study_hours_past_7_days: float
    missed_deadlines_count: int
    task_completion_rate: float

class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]

# 3. API Endpoints
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "OK", "service": "AI Engine", "model_loaded": True}

@app.get("/model-info", status_code=status.HTTP_200_OK)
def get_model_info():
    return model_info

@app.post("/predict-risk", response_model=PredictResponse)
def predict_risk(data: PredictRequest):
    try:
        input_df = pd.DataFrame([{
            'avg_current_score': data.avg_current_score,
            'study_hours_past_7_days': data.study_hours_past_7_days,
            'missed_deadlines_count': data.missed_deadlines_count,
            'task_completion_rate': data.task_completion_rate
        }])

        prediction = model.predict(input_df)[0]
        probs = model.predict_proba(input_df)[0]

        risk_level = RISK_MAP.get(prediction, "UNKNOWN")

        return PredictResponse(
            risk_level=risk_level,
            probabilities={
                "LOW": round(float(probs[0]), 4),
                "MEDIUM": round(float(probs[1]), 4),
                "HIGH": round(float(probs[2]), 4)
            },
            model_version=MODEL_VERSION
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi suy luận mô hình: {str(e)}")

@app.post("/recommendations", response_model=RecommendationResponse)
def generate_recommendations(data: RecommendationRequest):
    recs: List[RecommendationItem] = []

    # Quy tắc cá nhân hóa dựa trên dữ liệu riêng của sinh viên
    if data.missed_deadlines_count > 0:
        recs.append(RecommendationItem(
            action_text=f"Hoàn thành gấp {data.missed_deadlines_count} bài tập đã trễ hạn.",
            reason=f"Bạn hiện có {data.missed_deadlines_count} nhiệm vụ chưa nộp đúng hạn, ảnh hưởng trực tiếp tới điểm quá trình.",
            priority=1
        ))

    if data.avg_current_score < 5.0:
        recs.append(RecommendationItem(
            action_text="Tăng cường ôn tập kiến thức cốt lõi và làm lại bài tập các môn điểm thấp.",
            reason=f"Điểm trung bình hiện tại ({data.avg_current_score:.2f}) dưới mức an toàn (5.0).",
            priority=1
        ))
    elif data.avg_current_score < 6.5:
        recs.append(RecommendationItem(
            action_text="Lập kế hoạch ôn tập giữa kỳ để nâng điểm trung bình lên trên 7.0.",
            reason=f"Điểm trung bình hiện tại là {data.avg_current_score:.2f}, cần cải thiện để tránh nguy cơ điểm kém.",
            priority=2
        ))

    if data.study_hours_past_7_days < 7.0:
        recs.append(RecommendationItem(
            action_text="Dành thêm ít nhất 1 giờ mỗi ngày cho phiên học bấm giờ trên ứng dụng.",
            reason=f"Thời lượng học tuần qua của bạn chỉ đạt {data.study_hours_past_7_days:.1f} giờ (khuyến nghị tối thiểu 7 giờ/tuần).",
            priority=2
        ))

    if data.task_completion_rate < 0.5:
        recs.append(RecommendationItem(
            action_text="Chia nhỏ bài tập thành các nhiệm vụ 15 phút để hoàn thành dễ dàng hơn.",
            reason=f"Tỷ lệ hoàn thành nhiệm vụ của bạn chỉ đạt {int(data.task_completion_rate * 100)}%.",
            priority=3
        ))

    if not recs:
        recs.append(RecommendationItem(
            action_text="Duy trì phong độ học tập hiện tại!",
            reason="Các chỉ số học tập của bạn đang ở trạng thái rất tốt.",
            priority=3
        ))

    return RecommendationResponse(recommendations=recs)

@app.get("/")
def home():
    return {
        "message": "Study AI Service is running",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "/health",
            "/model-info",
            "/predict-risk",
            "/recommendations"
        ]
    }