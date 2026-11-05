import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { parsePaginationParams, searchFilter, formatPaginatedResponse } from '../utils/pagination';

const createSectionSchema = z.object({
  topic_id: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  topicId: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề phần học phải từ 2 ký tự trở lên'),
  description: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().optional().nullable(),
  orderIndex: z.coerce.number().int().optional().nullable(),
});

const updateSectionSchema = z.object({
  topic_id: z.coerce.number().int().positive().optional(),
  topicId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(2, 'Tiêu đề phần học phải từ 2 ký tự trở lên').optional(),
  description: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().optional().nullable(),
  orderIndex: z.coerce.number().int().optional().nullable(),
});

// GET /api/admin/sections - Danh sách có phân trang, tìm kiếm, lọc theo topicId và courseId
export const getSections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePaginationParams(req.query);
    const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: searchFilter(search) },
        { description: searchFilter(search) },
      ];
    }
    if (topicId && Number.isInteger(topicId) && topicId > 0) {
      where.topic_id = topicId;
    }
    if (courseId && Number.isInteger(courseId) && courseId > 0) {
      where.topic = { course_id: courseId };
    }

    const [totalRecords, sections] = await Promise.all([
      prisma.topicSection.count({ where }),
      prisma.topicSection.findMany({
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
          _count: {
            select: { materials: true },
          },
        },
      }),
    ]);

    const formatted = sections.map((s) => ({
      id: s.id,
      topic_id: s.topic_id,
      topic_title: s.topic.title,
      course_id: s.topic.course.id,
      course_code: s.topic.course.code,
      course_name: s.topic.course.name,
      title: s.title,
      description: s.description,
      order_index: s.order_index,
      materials_count: s._count.materials,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    res.status(200).json(formatPaginatedResponse(formatted, totalRecords, page, limit));
  } catch (error) {
    console.error('Lỗi lấy danh sách phần học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/sections-by-topic/:topicId - Danh sách phần học theo chủ đề
export const getSectionsByTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.topicId);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const sections = await prisma.topicSection.findMany({
      where: { topic_id: topicId },
      orderBy: { order_index: 'asc' },
      select: {
        id: true,
        topic_id: true,
        title: true,
        order_index: true,
        _count: { select: { materials: true } },
      },
    });

    res.status(200).json(sections);
  } catch (error) {
    console.error('Lỗi lấy phần học theo chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/sections/:id - Chi tiết phần học
export const getSectionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const section = await prisma.topicSection.findUnique({
      where: { id },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        materials: {
          orderBy: { order_index: 'asc' },
          select: { id: true, title: true, type: true, reading_time: true, order_index: true },
        },
      },
    });

    if (!section) {
      res.status(404).json({ message: 'Không tìm thấy phần học' });
      return;
    }

    res.status(200).json(section);
  } catch (error) {
    console.error('Lỗi xem chi tiết phần học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/sections/:id/cascade-info - Cảnh báo số lượng tài liệu
export const getSectionCascadeInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const section = await prisma.topicSection.findUnique({
      where: { id },
      include: {
        topic: { select: { title: true, course: { select: { name: true } } } },
        _count: { select: { materials: true } },
      },
    });

    if (!section) {
      res.status(404).json({ message: 'Không tìm thấy phần học' });
      return;
    }

    res.status(200).json({
      section_id: section.id,
      title: section.title,
      topic_title: section.topic.title,
      course_name: section.topic.course.name,
      materials_count: section._count.materials,
      warning_message: section._count.materials > 0
        ? `Phần học "${section.title}" đang chứa ${section._count.materials} tài liệu học tập. Xóa phần này sẽ gỡ bỏ phân loại của các tài liệu liên quan!`
        : `Phần học "${section.title}" không chứa tài liệu nào. Có thể xóa an toàn.`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/sections - Tạo phần học mới (tự động tính orderIndex tiếp theo nếu không nhập)
export const createSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createSectionSchema.parse(req.body);
    const topicId = data.topic_id || data.topicId;

    if (!topicId) {
      res.status(400).json({ message: 'Mã chủ đề (topic_id) không được để trống' });
      return;
    }

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề liên kết' });
      return;
    }

    let orderIndex = data.order_index ?? data.orderIndex;
    if (orderIndex === undefined || orderIndex === null) {
      const lastSection = await prisma.topicSection.findFirst({
        where: { topic_id: topicId },
        orderBy: { order_index: 'desc' },
        select: { order_index: true },
      });
      orderIndex = lastSection ? lastSection.order_index + 1 : 1;
    }

    const section = await prisma.topicSection.create({
      data: {
        topic_id: topicId,
        title: data.title,
        description: data.description ?? null,
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

    res.status(201).json(section);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo phần học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/sections/:id - Cập nhật phần học
export const updateSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const data = updateSectionSchema.parse(req.body);

    const existing = await prisma.topicSection.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy phần học' });
      return;
    }

    const topicId = data.topic_id || data.topicId;
    if (topicId) {
      const topicExists = await prisma.topic.findUnique({ where: { id: topicId } });
      if (!topicExists) {
        res.status(404).json({ message: 'Chủ đề mới không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (topicId) updateData.topic_id = topicId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.order_index !== undefined || data.orderIndex !== undefined) {
      updateData.order_index = data.order_index ?? data.orderIndex ?? existing.order_index;
    }

    const section = await prisma.topicSection.update({
      where: { id },
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

    res.status(200).json(section);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật phần học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/sections/:id - Xóa phần học (kiểm tra & cảnh báo nếu còn tài liệu)
export const deleteSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.topicSection.findUnique({
      where: { id },
      include: { _count: { select: { materials: true } } },
    });

    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy phần học cần xóa' });
      return;
    }

    const materialsCount = existing._count.materials;
    const force = req.query.force === 'true';

    if (materialsCount > 0 && !force) {
      res.status(400).json({
        message: `Phần học "${existing.title}" đang chứa ${materialsCount} tài liệu học tập. Vui lòng chuyển hoặc xóa tài liệu trước, hoặc dùng tùy chọn xóa ép buộc.`,
        materials_count: materialsCount,
      });
      return;
    }

    // Nếu force=true, gỡ bỏ liên kết section_id của các materials trước khi xóa
    if (materialsCount > 0 && force) {
      await prisma.material.updateMany({
        where: { section_id: id },
        data: { section_id: null },
      });
    }

    await prisma.topicSection.delete({ where: { id } });
    res.status(200).json({
      message: `Đã xóa thành công phần học "${existing.title}"`,
      id,
    });
  } catch (error) {
    console.error('Lỗi xóa phần học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
