import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const userRoleEnum = z.enum(['STUDENT', 'TEACHER', 'ADMIN']);

const createUserSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  role: userRoleEnum.default('STUDENT'),
});

const updateUserSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không hợp lệ').optional(),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên').optional().nullable(),
  role: userRoleEnum.optional(),
});

// Helper tìm kiếm case-insensitive
const isPostgres = () => process.env.DATABASE_URL?.startsWith('postgres') || false;
const searchFilter = (val: string) => ({
  contains: val,
  ...(isPostgres() ? { mode: 'insensitive' as const } : {}),
});

// GET /api/admin/users - Lấy danh sách người dùng kèm phân trang, tìm kiếm, lọc role
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (search) {
      where.email = searchFilter(search);
    }
    if (role && ['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      where.role = role;
    }

    const [totalRecords, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          created_at: true,
          predictions: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              risk_level: true,
              created_at: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              quizAttempts: true,
              studySessions: true,
              tasks: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: users.map((u) => {
        const latestPred = u.predictions[0];
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          created_at: u.created_at,
          risk_level: latestPred?.risk_level ?? 'LOW',
          last_prediction_date: latestPred?.created_at ?? null,
          enrollments_count: u._count.enrollments,
          quiz_attempts_count: u._count.quizAttempts,
          sessions_count: u._count.studySessions,
          tasks_count: u._count.tasks,
        };
      }),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/users/:id - Chi tiết người dùng
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ message: 'ID người dùng không hợp lệ' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
        enrollments: {
          include: {
            course: { select: { id: true, code: true, name: true, difficulty: true } },
          },
        },
        predictions: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            enrollments: true,
            quizAttempts: true,
            studySessions: true,
            tasks: true,
            flashcards: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Lỗi xem chi tiết người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/users/:id/cascade-info - Cảnh báo trước khi xóa tài khoản
export const getUserCascadeInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ message: 'ID người dùng không hợp lệ' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: {
            enrollments: true,
            quizAttempts: true,
            studySessions: true,
            tasks: true,
            predictions: true,
            flashcards: true,
            studyPlans: true,
            tutorSessions: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    res.status(200).json({
      user_id: user.id,
      email: user.email,
      role: user.role,
      enrollments_count: user._count.enrollments,
      quiz_attempts_count: user._count.quizAttempts,
      sessions_count: user._count.studySessions,
      tasks_count: user._count.tasks,
      flashcards_count: user._count.flashcards,
      warning_message: `Xóa tài khoản ${user.email} (${user.role}) sẽ xóa toàn bộ lịch sử học tập liên quan: ${user._count.enrollments} môn học ghi danh, ${user._count.quizAttempts} lượt làm bài quiz, ${user._count.studySessions} phiên học và ${user._count.tasks} công việc!`,
    });
  } catch (error) {
    console.error('Lỗi cascade info user:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/users - Thêm người dùng mới
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(400).json({ message: `Email "${data.email}" đã được đăng ký trên hệ thống` });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/users/:id - Cập nhật người dùng (vai trò, email, mật khẩu)
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ message: 'ID người dùng không hợp lệ' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    const data = updateUserSchema.parse(req.body);

    // Không cho phép hạ quyền Admin duy nhất trong hệ thống
    if (existing.role === 'ADMIN' && data.role && data.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(400).json({ message: 'Không thể hạ quyền của Quản trị viên (ADMIN) duy nhất trong hệ thống' });
        return;
      }
    }

    // Kiểm tra trùng email
    if (data.email && data.email !== existing.email) {
      const emailDup = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailDup) {
        res.status(400).json({ message: `Email "${data.email}" đã được sử dụng bởi tài khoản khác` });
        return;
      }
    }

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(data.password, salt);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/users/:id/lock - Khóa/Mở khóa tài khoản
export const lockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user?.id) {
      res.status(400).json({ message: 'Không thể khóa tài khoản của chính mình' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { is_locked: !user.is_locked, status: !user.is_locked ? 'LOCKED' : 'ACTIVE' },
      select: { id: true, email: true, role: true, is_locked: true, status: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// PUT /api/admin/users/:id/role - Thay đổi vai trò
export const changeUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user?.id) {
      res.status(400).json({ message: 'Không thể đổi role của chính mình' });
      return;
    }
    const { role } = req.body;
    if (!['ADMIN', 'STUDENT', 'TEACHER'].includes(role)) {
      res.status(400).json({ message: 'Role không hợp lệ' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true, status: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// DELETE /api/admin/users/:id/soft - Vô hiệu hóa (Soft Delete)
export const softDeleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user?.id) {
      res.status(400).json({ message: 'Không thể vô hiệu hóa tài khoản của chính mình' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'DISABLED', is_locked: true },
      select: { id: true, email: true, role: true, status: true, is_locked: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// DELETE /api/admin/users/:id - Xóa người dùng
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ message: 'ID người dùng không hợp lệ' });
      return;
    }

    // Không cho phép tự xóa chính mình
    if (req.user?.id === userId) {
      res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản Admin đang đăng nhập' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    // Không cho phép xóa admin duy nhất
    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        res.status(400).json({ message: 'Không thể xóa Quản trị viên (ADMIN) duy nhất trong hệ thống' });
        return;
      }
    }

    await prisma.user.delete({ where: { id: userId } });

    res.status(200).json({
      message: `Đã xóa tài khoản "${existing.email}" thành công`,
      id: userId,
    });
  } catch (error) {
    console.error('Lỗi xóa người dùng:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

