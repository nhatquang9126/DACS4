import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim() || '';
    const entity = req.query.entity as string;
    const action = req.query.action as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { user_email: { contains: search } },
        { description: { contains: search } },
        { entity_id: { contains: search } },
      ];
    }
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          user_email: true,
          action: true,
          entity: true,
          entity_id: true,
          description: true,
          ip_address: true,
          created_at: true,
        }
      })
    ]);

    res.json({
      data: logs,
      pagination: { page, limit, totalRecords: total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};
