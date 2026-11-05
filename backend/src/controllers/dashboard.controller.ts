import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /api/admin/dashboard/kpi - Lấy toàn bộ KPI trong 1 request
export const getDashboardKPI = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      lockedUsers,
      totalCourses,
      totalTopics,
      totalSections,
      totalMaterials,
      totalQuizzes,
      totalQuestions,
      totalQuizAttempts,
      totalStudySessions,
      activeStudySessions,
      totalTutorSessions,
      totalPredictions,
      riskHigh,
      riskMedium,
      riskLow,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { is_locked: true } }),
      prisma.course.count(),
      prisma.topic.count(),
      prisma.topicSection.count(),
      prisma.material.count(),
      prisma.quiz.count(),
      prisma.question.count(),
      prisma.quizAttempt.count(),
      prisma.studySession.count(),
      prisma.studySession.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.tutorSession.count(),
      prisma.prediction.count(),
      prisma.prediction.count({ where: { risk_level: 'HIGH' } }),
      prisma.prediction.count({ where: { risk_level: 'MEDIUM' } }),
      prisma.prediction.count({ where: { risk_level: 'LOW' } }),
    ]);

    res.json({
      users: { total: totalUsers, active: activeUsers, locked: lockedUsers },
      content: {
        courses: totalCourses,
        topics: totalTopics,
        sections: totalSections,
        materials: totalMaterials,
        quizzes: totalQuizzes,
        questions: totalQuestions,
      },
      activity: {
        quiz_attempts: totalQuizAttempts,
        study_sessions: totalStudySessions,
        active_sessions: activeStudySessions,
        tutor_sessions: totalTutorSessions,
      },
      ai: {
        total_predictions: totalPredictions,
        risk_distribution: { HIGH: riskHigh, MEDIUM: riskMedium, LOW: riskLow },
      },
    });
  } catch (error) {
    console.error('KPI error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// GET /api/admin/dashboard/charts/user-growth - Tăng trưởng người dùng 12 tuần gần nhất
export const getUserGrowthChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const weeks = parseInt(req.query.weeks as string) || 12;
    const rows: { week: Date; count: bigint }[] = await prisma.$queryRaw`
      SELECT 
        DATE_SUB(DATE(created_at), INTERVAL WEEKDAY(created_at) DAY) AS week,
        COUNT(*) AS count
      FROM User
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${weeks} WEEK)
      GROUP BY week
      ORDER BY week ASC
    `;

    res.json(rows.map(r => ({
      week: r.week,
      count: Number(r.count),
    })));
  } catch (error) {
    console.error('User growth chart error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// GET /api/admin/dashboard/charts/study-activity - Giờ học 30 ngày gần nhất
export const getStudyActivityChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const rows: { day: Date; sessions: bigint; minutes: bigint }[] = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) AS day,
        COUNT(*) AS sessions,
        COALESCE(SUM(duration_minutes), 0) AS minutes
      FROM StudySession
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        AND status = 'COMPLETED'
      GROUP BY day
      ORDER BY day ASC
    `;

    res.json(rows.map(r => ({
      day: r.day,
      sessions: Number(r.sessions),
      minutes: Number(r.minutes),
    })));
  } catch (error) {
    console.error('Study activity chart error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
