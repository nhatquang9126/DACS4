import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const positiveIntParam = z.coerce
.number()
.int('ID phải là số nguyên')
.positive('ID phải là số nguyên dương');

const startSessionSchema = z.object({
enrollment_id: z.number().int().positive('Mã đăng ký môn học không hợp lệ').optional().nullable(),
notes: z.string().trim().optional().nullable(),
});

const finishSessionSchema = z.object({
notes: z.string().trim().optional().nullable(),
manual_duration_minutes: z.number().int().positive('Thời lượng phải là số phút dương').optional().nullable(),
});

// 1. POST /api/study-sessions - Bắt đầu phiên học mới
export const startStudySession = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const userId = req.user!.id;
    const { enrollment_id, notes } = startSessionSchema.parse(req.body);

    // Kiểm tra xem enrollment_id (nếu có) có thuộc về user không
    if (enrollment_id) {
    const enrollment = await prisma.enrollment.findFirst({
        where: { id: enrollment_id, user_id: userId },
    });
    if (!enrollment) {
        res.status(403).json({ message: 'Bạn không sở hữu môn học này' });
        return;
    }
    }

    // Tự động hủy các phiên học dở dang trước đó (nếu có) để tránh dữ liệu rác
    await prisma.studySession.updateMany({
    where: { user_id: userId, status: 'IN_PROGRESS' },
    data: { status: 'CANCELLED' },
    });

    const newSession = await prisma.studySession.create({
    data: {
        user_id: userId,
        enrollment_id: enrollment_id ?? null,
        start_time: new Date(),
        status: 'IN_PROGRESS',
        notes: notes ?? null,
    },
    include: {
        enrollment: {
        include: { course: true },
        },
    },
    });

    res.status(201).json(newSession);
} catch (error: any) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    return;
    }
    console.error('Lỗi khi bắt đầu phiên học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 2. PATCH /api/study-sessions/:id/finish - Kết thúc phiên học và tính thời lượng
export const finishStudySession = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const sessionIdResult = positiveIntParam.safeParse(req.params.id);
    if (!sessionIdResult.success) {
    res.status(400).json({ message: 'Mã phiên học không hợp lệ', errors: sessionIdResult.error.issues });
    return;
    }
    const sessionId = sessionIdResult.data;
    const userId = req.user!.id;
    const { notes, manual_duration_minutes } = finishSessionSchema.parse(req.body);

    const session = await prisma.studySession.findFirst({
    where: { id: sessionId, user_id: userId },
    });

    if (!session) {
    res.status(404).json({ message: 'Không tìm thấy phiên học hoặc bạn không có quyền thao tác' });
    return;
    }

    if (session.status === 'COMPLETED') {
    res.status(400).json({ message: 'Phiên học này đã được kết thúc từ trước' });
    return;
    }

    const endTime = new Date();
    // Tính thời lượng tự động theo phút từ chênh lệch thời gian start -> end
    const calculatedMinutes = Math.max(
    1,
    Math.round((endTime.getTime() - new Date(session.start_time).getTime()) / (1000 * 60))
    );

    const finalDuration = manual_duration_minutes || calculatedMinutes;

    const updatedSession = await prisma.studySession.update({
    where: { id: sessionId },
    data: {
        end_time: endTime,
        duration_minutes: finalDuration,
        status: 'COMPLETED',
        notes: notes !== undefined ? notes : session.notes,
    },
    include: {
        enrollment: {
        include: { course: true },
        },
    },
    });

    res.status(200).json(updatedSession);
} catch (error: any) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    return;
    }
    console.error('Lỗi khi kết thúc phiên học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 3. GET /api/study-sessions/history - Lịch sử học tập
export const getStudySessionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const userId = req.user!.id;

    const sessions = await prisma.studySession.findMany({
    where: { user_id: userId, status: 'COMPLETED' },
    include: {
        enrollment: {
        select: {
            id: true,
            semester: true,
            course: { select: { code: true, name: true } },
        },
        },
    },
    orderBy: { start_time: 'desc' },
    });

    res.status(200).json(sessions);
} catch (error) {
    console.error('Lỗi xem lịch sử phiên học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 4. GET /api/learning/statistics - Thống kê tổng quan quá trình học tập
export const getLearningStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const userId = req.user!.id;

    // a. Tổng thời gian học (phút & giờ)
    const sessionAgg = await prisma.studySession.aggregate({
    where: { user_id: userId, status: 'COMPLETED' },
    _sum: { duration_minutes: true },
    _count: { id: true },
    });
    const totalMinutes = sessionAgg._sum.duration_minutes || 0;
    const totalHours = parseFloat((totalMinutes / 60).toFixed(1));

    // b. Thống kê bài tập/nhiệm vụ (Kết hợp bảng Task & các nhiệm vụ trong Lộ trình StudyPlanItem)
    const totalTasks = await prisma.task.count({ where: { user_id: userId } });
    const completedTasks = await prisma.task.count({ where: { user_id: userId, status: 'DONE' } });

    const activePlan = await prisma.studyPlan.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
      include: { items: true },
    });
    const planItems = activePlan?.items || [];
    const totalPlanItems = planItems.length;
    const completedPlanItems = planItems.filter((i) => i.status === 'DONE').length;

    const combinedTotal = totalTasks + totalPlanItems;
    const combinedCompleted = completedTasks + completedPlanItems;
    const taskCompletionRate = combinedTotal > 0 ? parseFloat((combinedCompleted / combinedTotal).toFixed(2)) : 0;

    // c. Thống kê trắc nghiệm (Quiz Attempts)
    const quizAgg = await prisma.quizAttempt.aggregate({
    where: { user_id: userId },
    _avg: { score: true },
    _count: { id: true },
    });
    const averageQuizScore = quizAgg._avg.score ? parseFloat(quizAgg._avg.score.toFixed(2)) : null;

    // d. Thống kê môn học (Enrollments)
    const activeEnrollmentsCount = await prisma.enrollment.count({
    where: { user_id: userId, status: 'ACTIVE' },
    });

    res.status(200).json({
    study_sessions: {
        total_completed_sessions: sessionAgg._count.id,
        total_study_minutes: totalMinutes,
        total_study_hours: totalHours,
    },
    tasks: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: taskCompletionRate, // VD: 0.85 = 85%
    },
    quizzes: {
        total_attempts: quizAgg._count.id,
        average_score: averageQuizScore,
    },
    courses: {
        active_enrollments: activeEnrollmentsCount,
    },
    });
} catch (error) {
    console.error('Lỗi lấy dữ liệu thống kê:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};