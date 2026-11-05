import { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const enrollSchema = z.object({
  course_id: z.number().int('Mã môn học phải là số nguyên dương').positive('Mã môn học không hợp lệ'),
  semester: z.string().trim().optional().nullable(),
  target_goal: z.string().trim().optional().nullable(),
});

export const getCourseCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { code: 'asc' },
    });
    // Đảm bảo trả về difficulty (nếu chưa có thì gán mặc định BEGINNER)
    const formatted = courses.map((c) => ({
      ...c,
      difficulty: c.difficulty || 'BEGINNER',
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('Lỗi khi lấy danh mục môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const enrollCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_id, semester, target_goal } = enrollSchema.parse(req.body);
    const userId = req.user!.id;

    // 1. Kiểm tra môn học có tồn tại hay không
    const course = await prisma.course.findUnique({ where: { id: course_id } });
    if (!course) {
      res.status(404).json({ message: 'Không tìm thấy môn học' });
      return;
    }

    const goalToSave = target_goal?.trim() || 'Lập trình Fullstack Web';
    const semesterToSave = semester?.trim() || goalToSave;

    // 2. Tạo Enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        user_id: userId,
        course_id,
        semester: semesterToSave,
        target_goal: goalToSave,
        status: 'ACTIVE',
      },
      include: {
        course: true,
      },
    });

    res.status(201).json(enrollment);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
      return;
    }
    
    // Bắt lỗi vi phạm ràng buộc duy nhất (Unique constraint P2002) từ Prisma nếu đã đăng ký mục tiêu này
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(400).json({ message: 'Bạn đã đăng ký khóa học này trong mục tiêu học tập đã chọn' });
      return;
    }

    console.error('Lỗi đăng ký môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const getMyEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { semester, target_goal, goal } = req.query;

    const activeFilter = ((target_goal || goal || semester) as string | undefined)?.trim();

    const whereCondition: any = { user_id: userId };
    if (
      activeFilter &&
      activeFilter !== '' &&
      activeFilter !== 'ALL' &&
      activeFilter !== 'Tất cả mục tiêu'
    ) {
      whereCondition.OR = [
        { target_goal: activeFilter },
        { semester: activeFilter },
      ];
    }

    const enrollments = await prisma.enrollment.findMany({
      where: whereCondition,
      include: {
        course: true,
        gradeComponents: true,
      },
      orderBy: { id: 'desc' },
    });

    const result = enrollments.map((item) => {
      let totalWeightedScore = 0;
      let completedWeight = 0;
      let totalAssignedWeight = 0;

      item.gradeComponents.forEach((gc) => {
        totalAssignedWeight += gc.weight;
        if (gc.score !== null && gc.score !== undefined) {
          totalWeightedScore += gc.score * gc.weight;
          completedWeight += gc.weight;
        }
      });

      // Công thức: Điểm trung bình các cột đã có
      const currentAverageScore =
        completedWeight > 0 ? parseFloat((totalWeightedScore / completedWeight).toFixed(2)) : null;

      // Đánh giá trạng thái hoàn thành các cột điểm (khi tổng trọng số các cột đã nhập đạt 1.0 = 100%)
      const isFinalScore = Math.abs(completedWeight - 1.0) < 0.0001;

      return {
        id: item.id,
        course: {
          ...item.course,
          difficulty: item.course.difficulty || 'BEGINNER',
        },
        target_goal: item.target_goal || item.semester || 'Lập trình Fullstack Web',
        semester: item.semester,
        status: item.status,
        gradeComponents: item.gradeComponents,
        summary: {
          currentAverageScore,
          completedWeightRatio: parseFloat(completedWeight.toFixed(4)),
          totalAssignedWeightRatio: parseFloat(totalAssignedWeight.toFixed(4)),
          isFinalScore,
          note: isFinalScore
            ? 'Đã đủ đánh giá kỹ năng'
            : 'Điểm trung bình tạm tính từ các cột đã hoàn thành.',
        },
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/courses/goals - Danh sách các mục tiêu học tập của người dùng
export const getLearningGoals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Lấy các target_goal phân biệt từ enrollment
    const userEnrollments = await prisma.enrollment.findMany({
      where: { user_id: userId },
      select: { target_goal: true, semester: true },
    });

    const uniqueGoals = new Set<string>();
    // Mục tiêu mẫu mặc định
    const defaultGoals = [
      'Lập trình Fullstack Web',
      'Chứng chỉ AWS Cloud',
      'Data Science & AI',
      'IELTS 7.0',
    ];
    defaultGoals.forEach((g) => uniqueGoals.add(g));

    userEnrollments.forEach((e) => {
      if (e.target_goal) uniqueGoals.add(e.target_goal);
      else if (e.semester) uniqueGoals.add(e.semester);
    });

    const goalsList = Array.from(uniqueGoals);
    res.status(200).json(['Tất cả mục tiêu', ...goalsList]);
  } catch (error) {
    console.error('Lỗi lấy danh sách mục tiêu học tập:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/courses/:id - Lấy chi tiết môn học kèm toàn bộ danh sách topics và materials
export const getCourseDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'Mã môn học không hợp lệ' });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        topics: {
          orderBy: { order_index: 'asc' },
          include: {
            materials: {
              orderBy: { order_index: 'asc' },
            },
            quizzes: {
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: 'Không tìm thấy môn học' });
      return;
    }

    res.status(200).json({
      ...course,
      difficulty: course.difficulty || 'BEGINNER',
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// ==========================================
// ADMIN CRUD, PHÂN TRANG & TÌM KIẾM MÔN HỌC
// ==========================================

const difficultyEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

const createCourseSchema = z.object({
  code: z.string().trim().min(2, 'Mã môn học phải từ 2 ký tự trở lên'),
  name: z.string().trim().min(3, 'Tên môn học phải từ 3 ký tự trở lên'),
  description: z.string().trim().optional().nullable(),
  credits: z.coerce.number().int().positive('Số tín chỉ phải lớn hơn 0').optional().nullable(),
  difficulty: difficultyEnum.optional().default('BEGINNER'),
});

const updateCourseSchema = z.object({
  code: z.string().trim().min(2, 'Mã môn học phải từ 2 ký tự trở lên').optional(),
  name: z.string().trim().min(3, 'Tên môn học phải từ 3 ký tự trở lên').optional(),
  description: z.string().trim().optional().nullable(),
  credits: z.coerce.number().int().positive('Số tín chỉ phải lớn hơn 0').optional().nullable(),
  difficulty: difficultyEnum.optional(),
});

// GET /api/admin/courses - Lấy danh sách môn học kèm phân trang, tìm kiếm, lọc
export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const difficulty = req.query.difficulty as string | undefined;

    const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || false;
    const searchFilter = (val: string) => ({
      contains: val,
      ...(isPostgres ? { mode: 'insensitive' as const } : {}),
    });

    const where: any = {};
    if (search) {
      where.OR = [
        { code: searchFilter(search) },
        { name: searchFilter(search) },
      ];
    }
    if (difficulty && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(difficulty)) {
      where.difficulty = difficulty;
    }

    const [totalRecords, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          _count: {
            select: {
              topics: true,
              enrollments: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        difficulty: c.difficulty,
        credits: c.credits,
        created_at: c.created_at,
        updated_at: c.updated_at,
        topics_count: c._count.topics,
        enrollments_count: c._count.enrollments,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/courses/options - Lấy danh sách môn học rút gọn cho dropdown
export const getCourseOptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        difficulty: true,
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error('Lỗi lấy options môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/courses/:id - Xem chi tiết môn học kèm cây chủ đề
export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        topics: {
          orderBy: { order_index: 'asc' },
          include: {
            materials: {
              orderBy: { order_index: 'asc' },
            },
            quizzes: {
              include: {
                _count: {
                  select: { questions: true, attempts: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            topics: true,
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: 'Không tìm thấy môn học' });
      return;
    }

    res.status(200).json(course);
  } catch (error) {
    console.error('Lỗi xem chi tiết môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/courses/:id/cascade-info - Cảnh báo số lượng liên kết trước khi xóa môn học
export const getCourseCascadeInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        name: true,
        topics: {
          select: {
            id: true,
            _count: {
              select: {
                materials: true,
                quizzes: true,
              },
            },
          },
        },
        _count: {
          select: {
            topics: true,
            enrollments: true,
            flashcards: true,
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: 'Không tìm thấy môn học' });
      return;
    }

    const topicIds = course.topics.map((t) => t.id);
    const materialsCount = course.topics.reduce((acc, t) => acc + t._count.materials, 0);
    const quizzesCount = course.topics.reduce((acc, t) => acc + t._count.quizzes, 0);

    const questionsCount = await prisma.question.count({
      where: {
        quiz: {
          topic_id: { in: topicIds },
        },
      },
    });

    res.status(200).json({
      course_id: course.id,
      code: course.code,
      name: course.name,
      topics_count: course._count.topics,
      materials_count: materialsCount,
      quizzes_count: quizzesCount,
      questions_count: questionsCount,
      enrollments_count: course._count.enrollments,
      flashcards_count: course._count.flashcards,
      warning_message: `Xóa môn học "${course.name}" (${course.code}) sẽ xóa vĩnh viễn: ${course._count.topics} chủ đề, ${materialsCount} tài liệu học tập, ${quizzesCount} bài kiểm tra (${questionsCount} câu hỏi) và ảnh hưởng đến ${course._count.enrollments} học viên đang ghi danh!`,
    });
  } catch (error) {
    console.error('Lỗi tính toán cascade info môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/courses - Tạo môn học mới
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createCourseSchema.parse(req.body);
    const existing = await prisma.course.findUnique({ where: { code: data.code } });
    if (existing) {
      res.status(400).json({ message: `Môn học với mã "${data.code}" đã tồn tại trên hệ thống` });
      return;
    }

    const course = await prisma.course.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        difficulty: data.difficulty || 'BEGINNER',
        credits: data.credits ?? 3,
      },
    });

    res.status(201).json(course);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/courses/:id - Cập nhật môn học
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy môn học' });
      return;
    }

    const data = updateCourseSchema.parse(req.body);

    if (data.code && data.code !== existing.code) {
      const codeDuplicate = await prisma.course.findUnique({ where: { code: data.code } });
      if (codeDuplicate) {
        res.status(400).json({ message: `Mã môn học "${data.code}" đã được sử dụng bởi môn học khác` });
        return;
      }
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.credits !== undefined ? { credits: data.credits } : {}),
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/courses/:id - Xóa môn học an toàn (Cascade)
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy môn học cần xóa' });
      return;
    }

    await prisma.course.delete({ where: { id: courseId } });

    res.status(200).json({
      message: `Đã xóa thành công môn học "${existing.name}" (${existing.code})`,
      id: courseId,
    });
  } catch (error) {
    console.error('Lỗi xóa môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi xóa môn học' });
  }
};
