import { Request } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export interface LogActivityOptions {
  userId?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOCK'
    | 'UNLOCK'
    | 'ROLE_CHANGE'
    | 'CONFIG_UPDATE'
    | 'BACKUP'
    | 'PUBLISH';
  entity:
    | 'Auth'
    | 'User'
    | 'Course'
    | 'Topic'
    | 'TopicSection'
    | 'Material'
    | 'Quiz'
    | 'Question'
    | 'AIConfig'
    | 'SystemNotification'
    | 'System';
  entityId?: string | number | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldData?: any;
  newData?: any;
  status?: 'SUCCESS' | 'FAILED';
}

export interface AdminNotificationOptions {
  title: string;
  content: string;
  type?:
    | 'INFO'
    | 'WARNING'
    | 'ERROR'
    | 'SUCCESS'
    | 'USER_REGISTER'
    | 'USER_LOCKED'
    | 'USER_UNLOCKED'
    | 'SERVICE_ALERT';
  target?: 'ADMIN' | 'ALL' | 'STUDENT';
  linkUrl?: string | null;
  createdBy?: string | null;
}

/**
 * Trích xuất an toàn địa chỉ IP của Client
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};

/**
 * Trích xuất User-Agent
 */
export const getUserAgent = (req: Request): string => {
  return (req.headers['user-agent'] as string) || 'Unknown Agent';
};

/**
 * Loại bỏ các trường nhạy cảm như password, token, hash trước khi lưu snapshot
 */
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  try {
    const cloned = JSON.parse(JSON.stringify(data));
    const sensitiveKeys = ['password', 'password_hash', 'token', 'refreshToken', 'secret'];

    const recursiveClean = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          recursiveClean(obj[key]);
        }
      }
    };

    recursiveClean(cloned);
    return cloned;
  } catch {
    return null;
  }
};

/**
 * Ghi nhận Nhật ký hoạt động (Audit/Activity Log) một cách an toàn và không gây gián đoạn luồng chính
 */
export const logActivity = async (options: LogActivityOptions): Promise<void> => {
  try {
    const sanitizedOld = options.oldData ? JSON.stringify(sanitizeData(options.oldData)) : null;
    const sanitizedNew = options.newData ? JSON.stringify(sanitizeData(options.newData)) : null;

    await prisma.auditLog.create({
      data: {
        user_id: options.userId ?? null,
        user_email: options.userEmail ?? 'anonymous@studyai.internal',
        user_role: options.userRole ?? 'ADMIN',
        action: options.action,
        entity: options.entity,
        entity_id: options.entityId !== undefined && options.entityId !== null ? String(options.entityId) : null,
        description: options.description,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null,
        old_data: sanitizedOld,
        new_data: sanitizedNew,
        status: options.status || 'SUCCESS',
      },
    });
  } catch (error) {
    // Không ném lỗi ra ngoài làm sập luồng request chính
    console.error('[ActivityLogger Error]: Không thể ghi nhật ký hoạt động:', error);
  }
};

/**
 * Ghi nhanh từ Request context của Admin
 */
export const logAdminAction = async (
  req: AuthRequest,
  action: LogActivityOptions['action'],
  entity: LogActivityOptions['entity'],
  entityId: string | number | null,
  description: string,
  extra?: {
    oldData?: any;
    newData?: any;
    status?: 'SUCCESS' | 'FAILED';
  }
): Promise<void> => {
  return logActivity({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role || 'ADMIN',
    action,
    entity,
    entityId,
    description,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    oldData: extra?.oldData,
    newData: extra?.newData,
    status: extra?.status || 'SUCCESS',
  });
};

/**
 * Tạo thông báo hệ thống dành cho Admin
 */
export const createAdminNotification = async (options: AdminNotificationOptions): Promise<void> => {
  try {
    await prisma.systemNotification.create({
      data: {
        title: options.title,
        content: options.content,
        type: options.type || 'INFO',
        target: options.target || 'ADMIN',
        link_url: options.linkUrl || null,
        created_by: options.createdBy || 'system',
        is_published: true,
        is_read: false,
        published_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[Notification Error]: Không thể tạo thông báo hệ thống:', error);
  }
};

