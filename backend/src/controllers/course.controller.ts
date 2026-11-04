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