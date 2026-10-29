import { Response } from 'express';
import axios from 'axios';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const analyzeAndPredictRisk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Kiểm tra Cache: Nếu đã có dự đoán trong vòng 7 ngày qua thì ưu tiên trả về kết quả gần nhất (trừ khi có refresh=true)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const latestPrediction = await prisma.prediction.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: { recommendations: true },
    });

    const isForceRefresh = req.query.refresh === 'true';

    if (
      latestPrediction &&
      !isForceRefresh &&
      Date.now() - new Date(latestPrediction.created_at).getTime() < SEVEN_DAYS_MS
    ) {
      res.status(200).json({
        source: 'CACHE',
        prediction: latestPrediction,
      });
      return;
    }

    // 2. Feature Extraction (Tổng hợp đặc trưng từ MySQL)
    // a. Tỷ lệ hoàn thành task & số task trễ
    const tasks = await prisma.task.findMany({ where: { user_id: userId } });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const missedDeadlines = tasks.filter(
      (t) => t.status !== 'DONE' && new Date(t.due_date) < new Date()
    ).length;
    const taskCompletionRate = totalTasks > 0 ? parseFloat((completedTasks / totalTasks).toFixed(2)) : 1.0;

    // b. Giờ học 7 ngày qua
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
    const recentSessions = await prisma.studySession.findMany({
      where: {
        user_id: userId,
        start_time: { gte: sevenDaysAgo },
        status: 'COMPLETED',
      },
    });
    const totalStudyMinutes = recentSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    const studyHoursPast7Days = parseFloat((totalStudyMinutes / 60).toFixed(2));

    // c. Điểm trung bình hiện tại
    const enrollments = await prisma.enrollment.findMany({
      where: { user_id: userId, status: 'ACTIVE' },
      include: { gradeComponents: true },
    });

    let totalWeightedScore = 0;
    let totalWeight = 0;
    enrollments.forEach((e) => {
      e.gradeComponents.forEach((gc) => {
        if (gc.score !== null) {
          totalWeightedScore += gc.score * gc.weight;
          totalWeight += gc.weight;
        }
      });
    });
    const avgCurrentScore = totalWeight > 0 ? parseFloat((totalWeightedScore / totalWeight).toFixed(2)) : 7.0;

    const featurePayload = {
      avg_current_score: avgCurrentScore,
      study_hours_past_7_days: studyHoursPast7Days,
      missed_deadlines_count: missedDeadlines,
      task_completion_rate: taskCompletionRate,
    };

    // 3. Gọi AI Service (Python FastAPI) hoặc Heuristic Fallback nếu service tắt
    let risk_level = 'LOW';
    let model_version = 'v1.0.0-fallback';
    let recommendations: { action_text: string; reason: string; priority: number }[] = [];

    try {
      const riskResponse = await axios.post(`${AI_SERVICE_URL}/predict-risk`, featurePayload, { timeout: 3500 });
      risk_level = riskResponse.data.risk_level;
      model_version = riskResponse.data.model_version;

      const recsResponse = await axios.post(
        `${AI_SERVICE_URL}/recommendations`,
        { risk_level, ...featurePayload },
        { timeout: 3500 }
      );
      recommendations = recsResponse.data.recommendations || [];
    } catch (aiErr: any) {
      console.warn('[AI Service Warning] Không thể kết nối AI Service, kích hoạt Heuristic Fallback:', aiErr.message);

      // Heuristic Fallback Logic
      if (
        featurePayload.avg_current_score < 5.0 ||
        featurePayload.missed_deadlines_count >= 3 ||
        (featurePayload.study_hours_past_7_days < 5 && featurePayload.task_completion_rate < 0.4)
      ) {
        risk_level = 'HIGH';
      } else if (
        featurePayload.avg_current_score < 6.5 ||
        featurePayload.missed_deadlines_count >= 1 ||
        featurePayload.study_hours_past_7_days < 10
      ) {
        risk_level = 'MEDIUM';
      } else {
        risk_level = 'LOW';
      }

      if (featurePayload.missed_deadlines_count > 0) {
        recommendations.push({
          action_text: `Hoàn thành gấp ${featurePayload.missed_deadlines_count} bài tập đã trễ hạn.`,
          reason: 'Nhiệm vụ trễ hạn ảnh hưởng trực tiếp tới điểm quá trình.',
          priority: 1,
        });
      }
      if (featurePayload.avg_current_score < 6.5) {
        recommendations.push({
          action_text: 'Tăng cường ôn tập các chủ đề còn yếu.',
          reason: `Điểm trung bình hiện tại (${featurePayload.avg_current_score}) cần cải thiện.`,
          priority: 2,
        });
      }
      if (featurePayload.study_hours_past_7_days < 7.0) {
        recommendations.push({
          action_text: 'Dành thêm ít nhất 1 giờ mỗi ngày cho phiên học bấm giờ.',
          reason: `Thời lượng học tuần qua (${featurePayload.study_hours_past_7_days}h) dưới khuyến nghị 7h.`,
          priority: 2,
        });
      }
      if (recommendations.length === 0) {
        recommendations.push({
          action_text: 'Duy trì phong độ học tập hiện tại!',
          reason: 'Các chỉ số học tập của bạn đang ở trạng thái tốt.',
          priority: 3,
        });
      }
    }

    // 4. Lưu kết quả dự đoán & gợi ý vào CSDL MySQL
    const savedPrediction = await prisma.prediction.create({
      data: {
        user_id: userId,
        risk_level,
        model_version,
        features_used: JSON.stringify(featurePayload),
        recommendations: {
          create: recommendations.map((r: any) => ({
            action_text: r.action_text,
            reason: r.reason,
            priority: r.priority,
            status: 'PENDING',
          })),
        },
      },
      include: { recommendations: true },
    });

    res.status(200).json({
      source: 'LIVE_PREDICTION',
      prediction: savedPrediction,
    });
  } catch (error: any) {
    console.error('Lỗi phân tích nguy cơ:', error.message);
    res.status(500).json({ message: 'Lỗi máy chủ khi phân tích dữ liệu học tập' });
  }
};
