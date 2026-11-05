import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { parsePaginationParams } from '../utils/pagination';
import { logAdminAction } from '../utils/activityLogger';

/**
 * GET /api/admin/notifications
 * Danh sách thông báo hệ thống kèm phân trang, tìm kiếm, lọc loại và trạng thái đọc
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const search = (req.query.search as string)?.trim() || '';
    const type = (req.query.type as string)?.trim() || undefined;
    const isReadParam = req.query.isRead as string | undefined;
    const target = (req.query.target as string)?.trim() || undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (target && target !== 'ALL') {
      where.target = target;
    }

    if (isReadParam !== undefined && isReadParam !== 'all' && isReadParam !== '') {
      where.is_read = isReadParam === 'true';
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.systemNotification.count({ where }),
      prisma.systemNotification.count({ where: { ...where, is_read: false } }),
      prisma.systemNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Lỗi nạp danh sách thông báo:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi nạp thông báo' });
  }
};

/**
 * GET /api/admin/notifications/unread-count
 * Lấy nhanh số lượng thông báo chưa đọc cho chuông thông báo (Notification Bell)
 */
export const getUnreadNotificationCount = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const unreadCount = await prisma.systemNotification.count({
      where: {
        is_read: false,
        is_published: true,
      },
    });
    res.json({ success: true, count: unreadCount });
  } catch (error) {
    console.error('Lỗi lấy số thông báo chưa đọc:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', count: 0 });
  }
};

/**
 * PATCH /api/admin/notifications/:id/read
 * Đánh dấu 1 thông báo đã đọc
 */
export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'ID thông báo không hợp lệ' });
      return;
    }

    const notification = await prisma.systemNotification.update({
      where: { id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc', data: notification });
  } catch (error) {
    console.error('Lỗi đánh dấu đã đọc:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * PATCH /api/admin/notifications/read-all
 * Đánh dấu toàn bộ thông báo của Admin là đã đọc
 */
export const markAllNotificationsAsRead = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await prisma.systemNotification.updateMany({
      where: { is_read: false },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Đã đánh dấu ${result.count} thông báo là đã đọc`,
      count: result.count,
    });
  } catch (error) {
    console.error('Lỗi đánh dấu tất cả đã đọc:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * POST /api/admin/notifications
 * Tạo thông báo hệ thống mới
 */
export const createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, type = 'INFO', target = 'ADMIN', link_url, expires_at } = req.body;
    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ success: false, message: 'Tiêu đề và nội dung không được để trống' });
      return;
    }

    const notification = await prisma.systemNotification.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type,
        target,
        link_url: link_url?.trim() || null,
        expires_at: expires_at ? new Date(expires_at) : null,
        created_by: req.user?.email || 'admin',
        is_published: true,
        is_read: false,
        published_at: new Date(),
      },
    });

    await logAdminAction(
      req,
      'CREATE',
      'SystemNotification',
      notification.id,
      `Tạo thông báo hệ thống: "${notification.title}"`,
      { newData: notification }
    );

    res.status(201).json({ success: true, message: 'Tạo thông báo thành công', data: notification });
  } catch (error) {
    console.error('Lỗi tạo thông báo:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * PUT /api/admin/notifications/:id
 * Cập nhật thông báo
 */
export const updateNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    const existing = await prisma.systemNotification.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      return;
    }

    const { title, content, type, target, link_url, is_published, expires_at } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (type !== undefined) updateData.type = type;
    if (target !== undefined) updateData.target = target;
    if (link_url !== undefined) updateData.link_url = link_url ? link_url.trim() : null;
    if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at) : null;
    if (is_published !== undefined) {
      updateData.is_published = is_published;
      if (is_published && !existing.published_at) updateData.published_at = new Date();
    }

    const updated = await prisma.systemNotification.update({ where: { id }, data: updateData });

    await logAdminAction(
      req,
      'UPDATE',
      'SystemNotification',
      id,
      `Cập nhật thông báo hệ thống: "${updated.title}"`,
      { oldData: existing, newData: updated }
    );

    res.json({ success: true, message: 'Cập nhật thông báo thành công', data: updated });
  } catch (error) {
    console.error('Lỗi cập nhật thông báo:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * DELETE /api/admin/notifications/:id
 * Xóa thông báo
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      return;
    }

    const existing = await prisma.systemNotification.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      return;
    }

    await prisma.systemNotification.delete({ where: { id } });

    await logAdminAction(
      req,
      'DELETE',
      'SystemNotification',
      id,
      `Xóa thông báo hệ thống: "${existing.title}"`,
      { oldData: existing }
    );

    res.json({ success: true, message: 'Đã xóa thông báo thành công' });
  } catch (error) {
    console.error('Lỗi xóa thông báo:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * POST /api/admin/notifications/:id/publish
 * Phát hành thông báo cho người dùng
 */
export const publishNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.systemNotification.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
      return;
    }

    const updated = await prisma.systemNotification.update({
      where: { id },
      data: { is_published: true, published_at: new Date() },
    });

    // Phát sóng đến bảng UserNotification cho học viên nếu target là ALL hoặc STUDENT
    if (existing.target === 'ALL' || existing.target === 'STUDENT') {
      const users = await prisma.user.findMany({ select: { id: true } });
      const userNotificationsData = users.map((u) => ({
        user_id: u.id,
        notification_id: id,
        is_read: false,
      }));

      // Chèn an toàn, bỏ qua bản ghi đã có
      for (const item of userNotificationsData) {
        await prisma.userNotification
          .upsert({
            where: {
              user_id_notification_id: {
                user_id: item.user_id,
                notification_id: item.notification_id,
              },
            },
            create: item,
            update: {},
          })
          .catch(() => {});
      }
    }

    await logAdminAction(
      req,
      'PUBLISH',
      'SystemNotification',
      id,
      `Phát hành thông báo hệ thống tới người dùng: "${updated.title}"`
    );

    res.json({ success: true, message: 'Phát hành thông báo thành công', data: updated });
  } catch (error) {
    console.error('Lỗi phát hành thông báo:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
