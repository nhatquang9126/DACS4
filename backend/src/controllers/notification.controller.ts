import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim() || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [total, notifications] = await Promise.all([
      prisma.systemNotification.count({ where }),
      prisma.systemNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      })
    ]);

    res.json({
      data: notifications,
      pagination: { page, limit, totalRecords: total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, type = 'INFO', target = 'ALL', expires_at } = req.body;
    if (!title || !content) {
      res.status(400).json({ message: 'Title và content không được để trống' });
      return;
    }
    const notification = await prisma.systemNotification.create({
      data: { title, content, type, target, expires_at: expires_at ? new Date(expires_at) : null, created_by: req.user?.email }
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const updateNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { title, content, type, target, is_published, expires_at } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (target !== undefined) updateData.target = target;
    if (expires_at !== undefined) updateData.expires_at = expires_at ? new Date(expires_at) : null;
    if (is_published !== undefined) {
      updateData.is_published = is_published;
      if (is_published) updateData.published_at = new Date();
    }

    const notification = await prisma.systemNotification.update({ where: { id }, data: updateData });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await prisma.systemNotification.delete({ where: { id } });
    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const publishNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const notification = await prisma.systemNotification.update({
      where: { id },
      data: { is_published: true, published_at: new Date() }
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};
