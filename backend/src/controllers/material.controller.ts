import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const materialTypeEnum = z.enum(['READING', 'VIDEO', 'DOCUMENT_URL', 'CODE_SNIPPET']);

const createMaterialSchema = z.object({
  topic_id: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  topicId: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề tài liệu không được để trống'),
  type: materialTypeEnum.default('READING'),
  content_type: z.string().optional(),
  content: z.string().min(1, 'Nội dung tài liệu không được để trống'),
  file_url: z.string().trim().optional().nullable(),
  fileUrl: z.string().trim().optional().nullable(),
  reading_time: z.coerce.number().int().min(1).optional().nullable(),
  readingTime: z.coerce.number().int().min(1).optional().nullable(),
  readingTimeMinutes: z.coerce.number().int().min(1).optional().nullable(),
  order_index: z.coerce.number().int().optional().default(0),
  orderIndex: z.coerce.number().int().optional(),
});

const updateMaterialSchema = z.object({
  topic_id: z.coerce.number().int().positive().optional(),
  topicId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(2, 'Tiêu đề tài liệu không được để trống').optional(),
  type: materialTypeEnum.optional(),
  content_type: z.string().optional(),
  content: z.string().min(1, 'Nội dung tài liệu không được để trống').optional(),
  file_url: z.string().trim().optional().nullable(),
  fileUrl: z.string().trim().optional().nullable(),
  reading_time: z.coerce.number().int().min(1).optional().nullable(),
  readingTime: z.coerce.number().int().min(1).optional().nullable(),
  readingTimeMinutes: z.coerce.number().int().min(1).optional().nullable(),
  order_index: z.coerce.number().int().optional(),
  orderIndex: z.coerce.number().int().optional(),
});

// Helper tìm kiếm case-insensitive
const isPostgres = () => process.env.DATABASE_URL?.startsWith('postgres') || false;
const searchFilter = (val: string) => ({
  contains: val,
  ...(isPostgres() ? { mode: 'insensitive' as const } : {}),
});

// GET /api/admin/materials - Lấy danh sách tài liệu kèm phân trang, tìm kiếm, lọc topicId/courseId/type
export const getMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
    const type = req.query.type as any;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: searchFilter(search) },
        { content: searchFilter(search) },
      ];
    }
    if (topicId && Number.isInteger(topicId) && topicId > 0) {
      where.topic_id = topicId;
    }
    if (courseId && Number.isInteger(courseId) && courseId > 0) {
      where.topic = { course_id: courseId };
    }
    if (type && ['READING', 'VIDEO', 'DOCUMENT_URL', 'CODE_SNIPPET'].includes(type)) {
      where.type = type;
    }

    const [totalRecords, materials] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ topic_id: 'asc' }, { order_index: 'asc' }],
        include: {
          topic: {
            select: {
              id: true,
              title: true,
              course: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: materials.map((m) => ({
        id: m.id,
        topic_id: m.topic_id,
        topic_title: m.topic.title,
        course_id: m.topic.course.id,
        course_code: m.topic.course.code,
        course_name: m.topic.course.name,
        title: m.title,
        type: m.type,
        content: m.content,
        file_url: m.file_url,
        reading_time: m.reading_time,
        order_index: m.order_index,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/materials/:id - Chi tiết tài liệu
export const getMaterialById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ message: 'ID tài liệu không hợp lệ' });
      return;
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course_id: true,
            course: {
              select: { id: true, code: true, name: true, difficulty: true },
            },
          },
        },
      },
    });

    if (!material) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
      return;
    }

    res.status(200).json(material);
  } catch (error) {
    console.error('Lỗi xem chi tiết tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/materials - Đăng bài giảng / Tài liệu học tập mới
export const createMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = createMaterialSchema.parse(req.body);
    const topicId = raw.topic_id || raw.topicId;
    if (!topicId) {
      res.status(400).json({ message: 'Mã chủ đề (topic_id) không được để trống' });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { course: true },
    });
    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    const fileUrl = (raw.file_url || raw.fileUrl || '').trim() || null;
    const readingTime = raw.reading_time ?? raw.readingTime ?? raw.readingTimeMinutes ?? 5;
    const orderIndex = raw.order_index ?? raw.orderIndex ?? 0;

    const material = await prisma.material.create({
      data: {
        topic_id: topicId,
        title: raw.title,
        type: raw.type,
        content_type: raw.content_type || (raw.type === 'VIDEO' ? 'VIDEO_URL' : 'MARKDOWN'),
        content: raw.content,
        file_url: fileUrl,
        reading_time: readingTime,
        order_index: orderIndex,
      },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.status(201).json(material);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/materials/:id - Chỉnh sửa / Cập nhật tài liệu
export const updateMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ message: 'Mã tài liệu không hợp lệ' });
      return;
    }

    const existing = await prisma.material.findUnique({ where: { id: materialId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
      return;
    }

    const raw = updateMaterialSchema.parse(req.body);
    const newTopicId = raw.topic_id || raw.topicId;

    if (newTopicId && newTopicId !== existing.topic_id) {
      const topicExists = await prisma.topic.findUnique({ where: { id: newTopicId } });
      if (!topicExists) {
        res.status(404).json({ message: 'Chủ đề mới không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (newTopicId !== undefined) updateData.topic_id = newTopicId;
    if (raw.title !== undefined) updateData.title = raw.title;
    if (raw.type !== undefined) {
      updateData.type = raw.type;
      updateData.content_type = raw.type === 'VIDEO' ? 'VIDEO_URL' : 'MARKDOWN';
    }
    if (raw.content !== undefined) updateData.content = raw.content;
    if (raw.file_url !== undefined || raw.fileUrl !== undefined) {
      const val = (raw.file_url || raw.fileUrl || '').trim();
      updateData.file_url = val || null;
    }
    if (raw.reading_time !== undefined || raw.readingTime !== undefined || raw.readingTimeMinutes !== undefined) {
      updateData.reading_time = raw.reading_time ?? raw.readingTime ?? raw.readingTimeMinutes ?? null;
    }
    if (raw.order_index !== undefined || raw.orderIndex !== undefined) {
      updateData.order_index = raw.order_index ?? raw.orderIndex ?? 0;
    }

    const updated = await prisma.material.update({
      where: { id: materialId },
      data: updateData,
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/materials/:id - Xóa tài liệu
export const deleteMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ message: 'Mã tài liệu không hợp lệ' });
      return;
    }

    const existing = await prisma.material.findUnique({ where: { id: materialId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
      return;
    }

    await prisma.material.delete({ where: { id: materialId } });

    res.status(200).json({
      message: `Đã xóa tài liệu "${existing.title}" thành công`,
      id: materialId,
    });
  } catch (error) {
    console.error('Lỗi xóa tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

