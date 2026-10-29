import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const createCourseSchema = z.object({
  code: z.string().trim().min(2, 'Mã môn học phải từ 2 ký tự trở lên'),
  name: z.string().trim().min(3, 'Tên môn học phải từ 3 ký tự trở lên'),
  credits: z.number().int().positive('Số tín chỉ phải lớn hơn 0'),
});

const createTopicSchema = z.object({
  course_id: z.number().int().positive('Mã môn học không hợp lệ'),
  title: z.string().trim().min(3, 'Tiêu đề chủ đề không được để trống'),
  description: z.string().optional(),
  order_index: z.number().int().optional(),
});

const createMaterialSchema = z.object({
  topic_id: z.number().int().positive('Mã chủ đề không hợp lệ'),
  title: z.string().trim().min(3, 'Tiêu đề bài giảng không được để trống'),
  content: z.string().min(5, 'Nội dung bài giảng không được để trống'),
  content_type: z.enum(['MARKDOWN', 'TEXT', 'VIDEO_URL']).default('MARKDOWN'),
  order_index: z.number().int().optional(),
});

const createQuizSchema = z.object({
  topic_id: z.number().int().positive('Mã chủ đề không hợp lệ'),
  title: z.string().trim().min(3, 'Tiêu đề bài kiểm tra không được để trống'),
  description: z.string().optional(),
  time_limit_minutes: z.number().int().positive().default(15),
});

const createQuestionSchema = z.object({
  quiz_id: z.number().int().positive('Mã bài kiểm tra không hợp lệ'),
  question_text: z.string().trim().min(5, 'Nội dung câu hỏi không được để trống'),
  options: z.array(z.string().min(1)).min(2, 'Phải có ít nhất 2 đáp án lựa chọn'),
  correct_option_index: z.number().int().min(0, 'Chỉ số đáp án đúng không hợp lệ'),
  explanation: z.string().optional(),
  skill_tag: z.string().trim().min(2, 'Thẻ kỹ năng không được để trống'),
});

// 1. POST /api/admin/courses - Tạo môn học mới
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createCourseSchema.parse(req.body);
    const existing = await prisma.course.findUnique({ where: { code: data.code } });
    if (existing) {
      res.status(400).json({ message: `Môn học với mã ${data.code} đã tồn tại` });
      return;
    }

    const course = await prisma.course.create({ data });
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

// 2. POST /api/admin/topics - Tạo chủ đề mới
export const createTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createTopicSchema.parse(req.body);
    const topic = await prisma.topic.create({
      data: {
        course_id: data.course_id,
        title: data.title,
        description: data.description ?? null,
        order_index: data.order_index ?? 0,
      },
    });
    res.status(201).json(topic);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// 3. POST /api/admin/materials - Đăng bài giảng Markdown
export const createMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createMaterialSchema.parse(req.body);
    const material = await prisma.material.create({
      data: {
        topic_id: data.topic_id,
        title: data.title,
        content: data.content,
        content_type: data.content_type,
        order_index: data.order_index ?? 0,
      },
    });
    res.status(201).json(material);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// 4. POST /api/admin/quizzes - Tạo bài kiểm tra
export const createQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createQuizSchema.parse(req.body);
    const quiz = await prisma.quiz.create({
      data: {
        topic_id: data.topic_id,
        title: data.title,
        description: data.description ?? null,
        time_limit_minutes: data.time_limit_minutes,
      },
    });
    res.status(201).json(quiz);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// 5. POST /api/admin/questions - Soạn câu hỏi trắc nghiệm gắn skill_tag
export const createQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createQuestionSchema.parse(req.body);
    const question = await prisma.question.create({
      data: {
        quiz_id: data.quiz_id,
        question_text: data.question_text,
        options: JSON.stringify(data.options),
        correct_option_index: data.correct_option_index,
        explanation: data.explanation ?? null,
        skill_tag: data.skill_tag,
      },
    });
    res.status(201).json(question);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// 6. GET /api/admin/students - Giám sát sinh viên kèm mức nguy cơ AI
export const getStudentsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        created_at: true,
        predictions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            risk_level: true,
            created_at: true,
            features_used: true,
          },
        },
        _count: {
          select: {
            quizAttempts: true,
            tasks: true,
            studySessions: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const formatted = students.map((s) => {
      const latestPred = s.predictions[0];
      return {
        id: s.id,
        email: s.email,
        created_at: s.created_at,
        risk_level: latestPred?.risk_level ?? 'LOW',
        last_prediction_date: latestPred?.created_at ?? null,
        quiz_attempts_count: s._count.quizAttempts,
        tasks_count: s._count.tasks,
        sessions_count: s._count.studySessions,
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Lỗi lấy danh sách sinh viên:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// 7. GET /api/admin/analytics - Báo cáo thống kê toàn hệ thống
export const getAdminAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalCourses = await prisma.course.count();
    const totalQuizzes = await prisma.quiz.count();
    const totalAttempts = await prisma.quizAttempt.count();

    // Thống kê số lượng sinh viên theo mức độ nguy cơ
    const allPredictions = await prisma.prediction.findMany({
      orderBy: { created_at: 'desc' },
      distinct: ['user_id'],
      select: { risk_level: true },
    });

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    allPredictions.forEach((p) => {
      if (p.risk_level === 'HIGH') highRiskCount++;
      else if (p.risk_level === 'MEDIUM') mediumRiskCount++;
      else lowRiskCount++;
    });

    res.status(200).json({
      total_students: totalStudents,
      total_courses: totalCourses,
      total_quizzes: totalQuizzes,
      total_quiz_attempts: totalAttempts,
      risk_distribution: {
        HIGH: highRiskCount,
        MEDIUM: mediumRiskCount,
        LOW: lowRiskCount,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê admin:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

