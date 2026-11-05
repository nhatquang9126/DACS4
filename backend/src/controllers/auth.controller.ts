import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logActivity, createAdminNotification, getClientIp, getUserAgent } from '../utils/activityLogger';

const authSchema = z.object({
  email: z.string().email('Định dạng email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = authSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email đã tồn tại trong hệ thống' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password_hash, role: 'STUDENT' },
    });

    // Thông báo cho Quản trị viên có tài khoản học viên mới
    await createAdminNotification({
      title: 'Người dùng mới đăng ký',
      content: `Học viên ${user.email} vừa đăng ký tài khoản thành công.`,
      type: 'USER_REGISTER',
      target: 'ADMIN',
      linkUrl: '/admin/users',
      createdBy: user.email,
    });

    res.status(201).json({ message: 'Đăng ký thành công', userId: user.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    } else {
      res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = authSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await logActivity({
        userEmail: email,
        userRole: user?.role || 'UNKNOWN',
        action: 'LOGIN',
        entity: 'Auth',
        description: `Đăng nhập thất bại: sai mật khẩu hoặc tài khoản chưa kích hoạt cho email ${email}`,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        status: 'FAILED',
      });
      res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Ghi nhận nhật ký đăng nhập thành công
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      entity: 'Auth',
      entityId: String(user.id),
      description: `Người dùng ${user.email} (${user.role}) đăng nhập thành công vào hệ thống`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      status: 'SUCCESS',
    });

    res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    } else {
      res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'LOGOUT',
        entity: 'Auth',
        entityId: String(req.user.id),
        description: `Người dùng ${req.user.email} đăng xuất khỏi hệ thống`,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        status: 'SUCCESS',
      });
    }
    res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng xuất' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Chưa đăng nhập' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Lỗi lấy thông tin cá nhân:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
