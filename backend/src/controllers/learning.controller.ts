import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const positiveIntParam = z.coerce.number().int().positive();

// 1. GET /api/topics/:topicId/mastery - Xem mức độ thành thạo kỹ năng
export const getTopicMastery = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const topicId = positiveIntParam.parse(req.params.topicId);
    const userId = req.user!.id;

    // Lấy tất cả lượt làm bài thuộc topic này của sinh viên
    const attempts = await prisma.quizAttempt.findMany({
    where: { user_id: userId, quiz: { topic_id: topicId } },
    orderBy: { created_at: 'desc' },
    });

    if (attempts.length === 0) {
    res.status(200).json({ message: 'Chưa có dữ liệu làm bài', mastery: {} });
    return;
    }

    // Tổng hợp mastery từ lượt làm bài gần nhất (hoặc trung bình cộng)
    // Ở đây ta lấy attempt mới nhất để phản ánh trình độ hiện tại
    const latestAttempt = attempts[0];
    const skillBreakdown = JSON.parse(latestAttempt.skill_breakdown);

    res.status(200).json({ mastery: skillBreakdown, attempt_id: latestAttempt.id });
} catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 2. GET /api/study-plans/current - Lấy lộ trình hiện tại
export const getCurrentStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const plan = await prisma.studyPlan.findFirst({
    where: { user_id: req.user!.id, status: 'ACTIVE' },
    include: { items: { orderBy: { priority: 'asc' } } },
    });
    res.status(200).json(plan || { message: 'Chưa có lộ trình học' });
} catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// Helper: Tự động tính toán và cập nhật StudyPlan theo kết quả quiz mới nhất
export const buildStudyPlanForUser = async (userId: number, topicId: number) => {
  const attempts = await prisma.quizAttempt.findMany({
    where: { user_id: userId, quiz: { topic_id: topicId } },
    orderBy: { created_at: 'desc' },
    take: 1,
  });

  if (attempts.length === 0) {
    return null;
  }

  const latestAttempt = attempts[0];
  const mastery = JSON.parse(latestAttempt.skill_breakdown || '{}');
  const newItems: any[] = [];

  const quiz = await prisma.quiz.findFirst({
    where: { topic_id: Number(topicId) },
    orderBy: { id: 'asc' },
  });

  const material = await prisma.material.findFirst({
    where: { topic_id: Number(topicId) },
    orderBy: { id: 'asc' },
  });

  for (const [skill, stats] of Object.entries(mastery) as any) {
    const pct = stats.percentage;

    if (pct < 50 && material) {
      newItems.push({
        title: `Ôn tập khẩn cấp: ${skill}`,
        description: `Bạn đạt ${pct}%. Hãy đọc lại tài liệu cơ bản về ${skill}.`,
        action_type: 'REVIEW_THEORY',
        reference_id: material.id,
        priority: 1,
        status: 'PENDING',
      });
    } else if (pct < 80 && quiz) {
      newItems.push({
        title: `Luyện tập thêm: ${skill}`,
        description: `Bạn đạt ${pct}%. Hãy làm thêm bài tập luyện tập.`,
        action_type: 'PRACTICE_QUIZ',
        reference_id: quiz.id,
        priority: 2,
        status: 'PENDING',
      });
    }
  }

  // Nếu tất cả kỹ năng đều đạt >= 80% (VD: 100%):
  if (newItems.length === 0 && quiz) {
    newItems.push({
      title: 'Thành thạo kiến thức: Đã hoàn thành xuất sắc!',
      description: `Bạn đã đạt ${latestAttempt.score}/10 trong bài kiểm tra. Hãy duy trì phong độ và luyện tập định kỳ.`,
      action_type: 'PRACTICE_QUIZ',
      reference_id: quiz.id,
      priority: 3,
      status: 'DONE',
    });
  }

  if (newItems.length === 0) {
    return null;
  }

  // Hủy các plan cũ đang ACTIVE
  await prisma.studyPlan.updateMany({
    where: { user_id: userId, status: 'ACTIVE' },
    data: { status: 'COMPLETED' },
  });

  // Tạo plan mới
  const newPlan = await prisma.studyPlan.create({
    data: {
      user_id: userId,
      items: { create: newItems },
    },
    include: { items: true },
  });

  return newPlan;
};

// 3. POST /api/study-plans/generate - Tự động tạo/cập nhật lộ trình theo Rule-based
export const generateStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { topic_id } = req.body; // Gửi lên topic muốn tạo lộ trình

    if (!topic_id) {
      res.status(400).json({ message: 'Vui lòng cung cấp topic_id' });
      return;
    }

    const newPlan = await buildStudyPlanForUser(userId, Number(topic_id));

    if (!newPlan) {
      res.status(400).json({
        message: 'Cần làm ít nhất 1 bài kiểm tra hoặc không tìm thấy tài liệu phù hợp để sinh lộ trình.',
      });
      return;
    }

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Lỗi sinh lộ trình:', error);
    res.status(500).json({ message: 'Lỗi sinh lộ trình' });
  }
};

// 4. PATCH /api/study-plans/items/:id/status - Cập nhật trạng thái nhiệm vụ
export const updatePlanItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const itemId = positiveIntParam.parse(req.params.id);
    const { status } = z.object({ status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE']) }).parse(req.body);
    const userId = req.user!.id;

    // Kiểm tra quyền sở hữu item thuộc về StudyPlan của user
    const existingItem = await prisma.studyPlanItem.findUnique({
      where: { id: itemId },
      include: { plan: true },
    });

    if (!existingItem || existingItem.plan.user_id !== userId) {
      res.status(403).json({ message: 'Bạn không có quyền cập nhật nhiệm vụ này' });
      return;
    }

    const updated = await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: { status },
    });

    res.status(200).json(updated);
} catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Lỗi cập nhật nhiệm vụ' });
}
};