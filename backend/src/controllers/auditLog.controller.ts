import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { parsePaginationParams } from '../utils/pagination';

/**
 * GET /api/admin/audit-logs
 * Danh sách nhật ký hoạt động kèm phân trang, tìm kiếm, lọc hành động, thực thể và khoảng thời gian
 */
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const search = (req.query.search as string)?.trim() || '';
    const entity = (req.query.entity as string)?.trim() || undefined;
    const action = (req.query.action as string)?.trim() || undefined;
    const status = (req.query.status as string)?.trim() || undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { user_email: { contains: search } },
        { description: { contains: search } },
        { entity_id: { contains: search } },
        { ip_address: { contains: search } },
      ];
    }

    if (entity && entity !== 'ALL') {
      where.entity = entity;
    }

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate && !isNaN(startDate.getTime())) {
        where.created_at.gte = startDate;
      }
      if (endDate && !isNaN(endDate.getTime())) {
        // Đến hết ngày cuối cùng
        const adjustedEnd = new Date(endDate);
        adjustedEnd.setHours(23, 59, 59, 999);
        where.created_at.lte = adjustedEnd;
      }
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
          user_id: true,
          user_email: true,
          user_role: true,
          action: true,
          entity: true,
          entity_id: true,
          description: true,
          ip_address: true,
          user_agent: true,
          status: true,
          created_at: true,
          old_data: true,
          new_data: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Lỗi nạp danh sách nhật ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi nạp nhật ký' });
  }
};

/**
 * GET /api/admin/audit-logs/:id
 * Xem chi tiết 1 nhật ký hoạt động
 */
export const getAuditLogById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'ID nhật ký không hợp lệ' });
      return;
    }

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!log) {
      res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi nhật ký' });
      return;
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Lỗi xem chi tiết nhật ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải chi tiết nhật ký' });
  }
};
