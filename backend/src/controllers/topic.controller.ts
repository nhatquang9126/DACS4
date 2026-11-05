import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const positiveIntParam = z.coerce
  .number()
  .int('ID phải là số nguyên')
  .positive('ID phải là số nguyên dương');

const createTopicSchema = z.object({
  course_id: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  courseId: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  name: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  description: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().optional().default(0),
  orderIndex: z.coerce.number().int().optional(),
});

const updateTopicSchema = z.object({
  course_id: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  courseId: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  name: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  description: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().optional(),
  orderIndex: z.coerce.number().int().optional(),
});

// Helper tìm kiếm case-insensitive
const isPostgres = () => process.env.DATABASE_URL?.startsWith('postgres') || false;
const searchFilter = (val: string) => ({
  contains: val,
  ...(isPostgres() ? { mode: 'insensitive' as const } : {}),
});

// ==========================================
// 1. ADMIN CRUD, PHÂN TRANG & TÌM KIẾM CHỦ ĐỀ
// ==========================================

// GET /api/admin/topics - Lấy danh sách chủ đề kèm phân trang, tìm kiếm, lọc theo courseId
export const getTopics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: searchFilter(search) },
        { description: searchFilter(search) },
      ];
    }
    if (courseId && Number.isInteger(courseId) && courseId > 0) {
      where.course_id = courseId;
    }

    const [totalRecords, topics] = await Promise.all([
      prisma.topic.count({ where }),
      prisma.topic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ course_id: 'asc' }, { order_index: 'asc' }],
        include: {
          course: {
            select: { id: true, code: true, name: true, difficulty: true },
          },
          _count: {
            select: {
              materials: true,
              quizzes: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: topics.map((t) => ({
        id: t.id,
        course_id: t.course_id,
        course_code: t.course.code,
        course_name: t.course.name,
        title: t.title,
        description: t.description,
        order_index: t.order_index,
        created_at: t.created_at,
        materials_count: t._count.materials,
        quizzes_count: t._count.quizzes,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/topics-by-course/:courseId - Lấy danh sách Topic thuộc một Course cho Cascading Dropdown
export const getTopicsByCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const topics = await prisma.topic.findMany({
      where: { course_id: courseId },
      orderBy: { order_index: 'asc' },
      select: {
        id: true,
        course_id: true,
        title: true,
        order_index: true,
      },
    });

    res.status(200).json(topics);
  } catch (error) {
    console.error('Lỗi lấy topics theo course:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/topics/:id - Xem chi tiết chủ đề
export const getTopicById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        course: { select: { id: true, code: true, name: true, difficulty: true } },
        materials: { orderBy: { order_index: 'asc' } },
        quizzes: {
          include: {
            _count: { select: { questions: true, attempts: true } },
          },
        },
      },
    });

    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    res.status(200).json(topic);
  } catch (error) {
    console.error('Lỗi xem chi tiết chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/topics/:id/cascade-info - Cảnh báo số lượng liên kết trước khi xóa topic
export const getTopicCascadeInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        course: { select: { name: true, code: true } },
        _count: {
          select: {
            materials: true,
            quizzes: true,
          },
        },
      },
    });

    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    const questionsCount = await prisma.question.count({
      where: { quiz: { topic_id: topicId } },
    });

    res.status(200).json({
      topic_id: topic.id,
      title: topic.title,
      course_name: topic.course.name,
      materials_count: topic._count.materials,
      quizzes_count: topic._count.quizzes,
      questions_count: questionsCount,
      warning_message: `Xóa chủ đề "${topic.title}" sẽ xóa vĩnh viễn ${topic._count.materials} bài tài liệu học tập và ${topic._count.quizzes} bài quiz (${questionsCount} câu hỏi)!`,
    });
  } catch (error) {
    console.error('Lỗi tính toán cascade info chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/topics - Tạo chủ đề mới
export const createTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createTopicSchema.parse(req.body);
    const courseId = data.course_id || data.courseId;
    if (!courseId) {
      res.status(400).json({ message: 'Mã môn học (course_id) không được để trống' });
      return;
    }

    const title = (data.title || data.name)?.trim();
    if (!title) {
      res.status(400).json({ message: 'Tiêu đề chủ đề không được để trống' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ message: 'Không tìm thấy môn học liên kết' });
      return;
    }

    const orderIndex = data.order_index ?? data.orderIndex ?? 0;

    const topic = await prisma.topic.create({
      data: {
        course_id: courseId,
        title,
        description: data.description ?? null,
        order_index: orderIndex,
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json(topic);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/topics/:id - Cập nhật chủ đề
export const updateTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const existing = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    const data = updateTopicSchema.parse(req.body);
    const courseId = data.course_id || data.courseId;

    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        res.status(404).json({ message: 'Môn học liên kết không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (courseId !== undefined) updateData.course_id = courseId;
    if (data.title !== undefined || data.name !== undefined) {
      updateData.title = data.title || data.name;
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.order_index !== undefined || data.orderIndex !== undefined) {
      updateData.order_index = data.order_index ?? data.orderIndex ?? 0;
    }

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data: updateData,
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/topics/:id - Xóa chủ đề
export const deleteTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const existing = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    await prisma.topic.delete({ where: { id: topicId } });

    res.status(200).json({
      message: `Đã xóa thành công chủ đề "${existing.title}"`,
      id: topicId,
    });
  } catch (error) {
    console.error('Lỗi xóa chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// ==========================================
// 2. ENDPOINTS CHO HỌC VIÊN (MOBILE / WEB)
// ==========================================

export const getCourseTopics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseIdResult = positiveIntParam.safeParse(req.params.courseId);
    if (!courseIdResult.success) {
      res.status(400).json({ message: 'Mã môn học không hợp lệ', errors: courseIdResult.error.issues });
      return;
    }
    const courseId = courseIdResult.data;

    const topics = await prisma.topic.findMany({
      where: { course_id: courseId },
      include: {
        materials: {
          orderBy: { order_index: 'asc' },
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            description: true,
            time_limit_minutes: true,
          },
        },
      },
      orderBy: { order_index: 'asc' },
    });

    res.status(200).json(topics);
  } catch (error) {
    console.error('Lỗi lấy danh sách chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const getMaterialDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialIdResult = positiveIntParam.safeParse(req.params.id);
    if (!materialIdResult.success) {
      res.status(400).json({ message: 'Mã tài liệu không hợp lệ', errors: materialIdResult.error.issues });
      return;
    }
    const materialId = materialIdResult.data;

    const material = await prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu' });
      return;
    }

    res.status(200).json(material);
  } catch (error) {
    console.error('Lỗi lấy chi tiết tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
