import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const difficultyEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const materialTypeEnum = z.enum(['READING', 'VIDEO', 'DOCUMENT_URL', 'CODE_SNIPPET']);
const userRoleEnum = z.enum(['STUDENT', 'TEACHER', 'ADMIN']);

const createCourseSchema = z.object({
  code: z.string().trim().min(2, 'Mã môn học phải từ 2 ký tự trở lên'),
  name: z.string().trim().min(3, 'Tên môn học phải từ 3 ký tự trở lên'),
  credits: z.coerce.number().int().positive('Số tín chỉ phải lớn hơn 0').optional().nullable(),
  difficulty: difficultyEnum.optional().default('BEGINNER'),
});

const updateCourseSchema = z.object({
  code: z.string().trim().min(2, 'Mã môn học phải từ 2 ký tự trở lên').optional(),
  name: z.string().trim().min(3, 'Tên môn học phải từ 3 ký tự trở lên').optional(),
  credits: z.coerce.number().int().positive('Số tín chỉ phải lớn hơn 0').optional().nullable(),
  difficulty: difficultyEnum.optional(),
});

const createTopicSchema = z.object({
  course_id: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  courseId: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  name: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  description: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().optional().default(0),
  orderIndex: z.coerce.number().int().optional(),
});

const updateTopicSchema = z.object({
  course_id: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  courseId: z.coerce.number().int().positive('Mã môn học không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  name: z.string().trim().min(2, 'Tiêu đề chủ đề không được để trống').optional(),
  description: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().optional(),
  orderIndex: z.coerce.number().int().optional(),
});

const createMaterialSchema = z.object({
  topic_id: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  topicId: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  title: z.string().trim().min(2, 'Tiêu đề tài liệu không được để trống'),
  type: materialTypeEnum.default('READING'),
  content_type: z.string().optional(),
  content: z.string().min(1, 'Nội dung tài liệu không được để trống'),
  file_url: z.string().trim().optional().nullable(),
  fileUrl: z.string().trim().optional().nullable(),
  reading_time: z.coerce.number().int().min(1).optional().nullable(),
  readingTime: z.coerce.number().int().min(1).optional().nullable(),
  readingTimeMinutes: z.coerce.number().int().min(1).optional().nullable(),
  order_index: z.coerce.number().int().optional().default(0),
  orderIndex: z.coerce.number().int().optional(),
});

const updateMaterialSchema = z.object({
  topic_id: z.coerce.number().int().positive().optional(),
  topicId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(2, 'Tiêu đề tài liệu không được để trống').optional(),
  type: materialTypeEnum.optional(),
  content_type: z.string().optional(),
  content: z.string().min(1, 'Nội dung tài liệu không được để trống').optional(),
  file_url: z.string().trim().optional().nullable(),
  fileUrl: z.string().trim().optional().nullable(),
  reading_time: z.coerce.number().int().min(1).optional().nullable(),
  readingTime: z.coerce.number().int().min(1).optional().nullable(),
  order_index: z.coerce.number().int().optional(),
  orderIndex: z.coerce.number().int().optional(),
});

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

const createQuizSchema = z.object({
  topic_id: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  topicId: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  title: z.string().trim().min(3, 'Tiêu đề bài kiểm tra không được để trống'),
  description: z.string().trim().optional().nullable(),
  time_limit_minutes: z.coerce.number().int().positive().default(15),
  timeLimitMinutes: z.coerce.number().int().positive().optional(),
});

const updateQuizSchema = z.object({
  topic_id: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  topicId: z.coerce.number().int().positive('Mã chủ đề không hợp lệ').optional(),
  title: z.string().trim().min(3, 'Tiêu đề bài kiểm tra không được để trống').optional(),
  description: z.string().trim().optional().nullable(),
  time_limit_minutes: z.coerce.number().int().positive().optional(),
  timeLimitMinutes: z.coerce.number().int().positive().optional(),
});

const createQuestionSchema = z.object({
  quiz_id: z.coerce.number().int().positive('Mã bài kiểm tra không hợp lệ').optional(),
  quizId: z.coerce.number().int().positive('Mã bài kiểm tra không hợp lệ').optional(),
  question_text: z.string().trim().min(5, 'Nội dung câu hỏi không được để trống').optional(),
  questionText: z.string().trim().min(5, 'Nội dung câu hỏi không được để trống').optional(),
  options: z.union([
    z.array(z.string().min(1)).min(2, 'Phải có ít nhất 2 đáp án lựa chọn'),
    z.string().min(2),
  ]),
  correct_option_index: z.coerce.number().int().min(0, 'Chỉ số đáp án đúng không hợp lệ').optional(),
  correctOptionIndex: z.coerce.number().int().min(0, 'Chỉ số đáp án đúng không hợp lệ').optional(),
  explanation: z.string().trim().optional().nullable(),
  skill_tag: z.string().trim().min(2, 'Thẻ kỹ năng không được để trống').optional(),
  skillTag: z.string().trim().min(2, 'Thẻ kỹ năng không được để trống').optional(),
});

const updateQuestionSchema = z.object({
  quiz_id: z.coerce.number().int().positive().optional(),
  quizId: z.coerce.number().int().positive().optional(),
  question_text: z.string().trim().min(5).optional(),
  questionText: z.string().trim().min(5).optional(),
  options: z.union([
    z.array(z.string().min(1)).min(2),
    z.string().min(2),
  ]).optional(),
  correct_option_index: z.coerce.number().int().min(0).optional(),
  correctOptionIndex: z.coerce.number().int().min(0).optional(),
  explanation: z.string().trim().optional().nullable(),
  skill_tag: z.string().trim().min(2).optional(),
  skillTag: z.string().trim().min(2).optional(),
});

// Helper phân trang chuẩn
const parsePagination = (req: AuthRequest) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  return { page, limit, skip, search };
};

// ==========================================
// 1. COURSES CONTROLLER (MÔN HỌC)
// ==========================================

// GET /api/admin/courses - Lấy danh sách môn học kèm phân trang, tìm kiếm, lọc
export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePagination(req);
    const difficulty = req.query.difficulty as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
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
        difficulty: c.difficulty,
        credits: c.credits,
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

// GET /api/admin/courses/options - Lấy danh sách môn học gọn nhẹ cho Dropdown
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

// GET /api/admin/courses/:id - Xem chi tiết môn học kèm cây chủ đề và tài liệu
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

// GET /api/admin/courses/:id/cascade-info - Cảnh báo số lượng liên kết trước khi xóa
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

// DELETE /api/admin/courses/:id - Xóa môn học và cascade toàn diện
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const existing = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        topics: { select: { id: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy môn học cần xóa' });
      return;
    }

    // Xóa an toàn Course (Prisma cascade sẽ tự động xử lý do onDelete: Cascade)
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

// ==========================================
// 2. TOPICS CONTROLLER (CHỦ ĐỀ)
// ==========================================

// GET /api/admin/topics - Lấy danh sách chủ đề kèm phân trang, tìm kiếm, lọc theo courseId
export const getTopics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePagination(req);
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (courseId && Number.isInteger(courseId) && courseId > 0) {
      where.course_id = courseId;
    }

    const [totalRecords, topics] = await Promise.all([
      prisma.topic.count({ where }),
      prisma.topic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ course_id: 'asc' }, { order_index: 'asc' }],
        include: {
          course: {
            select: { id: true, code: true, name: true, difficulty: true },
          },
          _count: {
            select: {
              materials: true,
              quizzes: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: topics.map((t) => ({
        id: t.id,
        course_id: t.course_id,
        course_code: t.course.code,
        course_name: t.course.name,
        title: t.title,
        description: t.description,
        order_index: t.order_index,
        created_at: t.created_at,
        materials_count: t._count.materials,
        quizzes_count: t._count.quizzes,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/topics-by-course/:courseId - Lấy danh sách Topic thuộc một Course cho Cascading Dropdown
export const getTopicsByCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      res.status(400).json({ message: 'ID môn học không hợp lệ' });
      return;
    }

    const topics = await prisma.topic.findMany({
      where: { course_id: courseId },
      orderBy: { order_index: 'asc' },
      select: {
        id: true,
        course_id: true,
        title: true,
        order_index: true,
      },
    });

    res.status(200).json(topics);
  } catch (error) {
    console.error('Lỗi lấy topics theo course:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/topics/:id - Xem chi tiết chủ đề
export const getTopicById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        course: { select: { id: true, code: true, name: true, difficulty: true } },
        materials: { orderBy: { order_index: 'asc' } },
        quizzes: {
          include: {
            _count: { select: { questions: true, attempts: true } },
          },
        },
      },
    });

    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    res.status(200).json(topic);
  } catch (error) {
    console.error('Lỗi xem chi tiết chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/topics/:id/cascade-info - Cảnh báo số lượng liên kết trước khi xóa topic
export const getTopicCascadeInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        course: { select: { name: true, code: true } },
        _count: {
          select: {
            materials: true,
            quizzes: true,
          },
        },
      },
    });

    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    const questionsCount = await prisma.question.count({
      where: { quiz: { topic_id: topicId } },
    });

    res.status(200).json({
      topic_id: topic.id,
      title: topic.title,
      course_name: topic.course.name,
      materials_count: topic._count.materials,
      quizzes_count: topic._count.quizzes,
      questions_count: questionsCount,
      warning_message: `Xóa chủ đề "${topic.title}" sẽ xóa vĩnh viễn ${topic._count.materials} bài tài liệu học tập và ${topic._count.quizzes} bài quiz (${questionsCount} câu hỏi)!`,
    });
  } catch (error) {
    console.error('Lỗi tính toán cascade info chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/topics - Tạo chủ đề mới
export const createTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createTopicSchema.parse(req.body);
    const courseId = data.course_id || data.courseId;
    if (!courseId) {
      res.status(400).json({ message: 'Mã môn học (course_id) không được để trống' });
      return;
    }

    const title = (data.title || data.name)?.trim();
    if (!title) {
      res.status(400).json({ message: 'Tiêu đề chủ đề không được để trống' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ message: 'Không tìm thấy môn học liên kết' });
      return;
    }

    const orderIndex = data.order_index ?? data.orderIndex ?? 0;

    const topic = await prisma.topic.create({
      data: {
        course_id: courseId,
        title,
        description: data.description ?? null,
        order_index: orderIndex,
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json(topic);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/topics/:id - Cập nhật chủ đề
export const updateTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const existing = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    const data = updateTopicSchema.parse(req.body);
    const courseId = data.course_id || data.courseId;

    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        res.status(404).json({ message: 'Môn học liên kết không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (courseId !== undefined) updateData.course_id = courseId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.order_index !== undefined || data.orderIndex !== undefined) {
      updateData.order_index = data.order_index ?? data.orderIndex ?? 0;
    }

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data: updateData,
      include: {
        course: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/topics/:id - Xóa chủ đề
export const deleteTopic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topicId = Number(req.params.id);
    if (!Number.isInteger(topicId) || topicId <= 0) {
      res.status(400).json({ message: 'ID chủ đề không hợp lệ' });
      return;
    }

    const existing = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    await prisma.topic.delete({ where: { id: topicId } });

    res.status(200).json({
      message: `Đã xóa thành công chủ đề "${existing.title}"`,
      id: topicId,
    });
  } catch (error) {
    console.error('Lỗi xóa chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// ==========================================
// 3. MATERIALS CONTROLLER (TÀI LIỆU HỌC TẬP)
// ==========================================

// GET /api/admin/materials - Lấy danh sách tài liệu kèm phân trang, tìm kiếm, lọc topicId/courseId/type
export const getMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePagination(req);
    const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
    const type = req.query.type as any;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }
    if (topicId && Number.isInteger(topicId) && topicId > 0) {
      where.topic_id = topicId;
    }
    if (courseId && Number.isInteger(courseId) && courseId > 0) {
      where.topic = { course_id: courseId };
    }
    if (type && ['READING', 'VIDEO', 'DOCUMENT_URL', 'CODE_SNIPPET'].includes(type)) {
      where.type = type;
    }

    const [totalRecords, materials] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ topic_id: 'asc' }, { order_index: 'asc' }],
        include: {
          topic: {
            select: {
              id: true,
              title: true,
              course: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: materials.map((m) => ({
        id: m.id,
        topic_id: m.topic_id,
        topic_title: m.topic.title,
        course_id: m.topic.course.id,
        course_code: m.topic.course.code,
        course_name: m.topic.course.name,
        title: m.title,
        type: m.type,
        content: m.content,
        file_url: m.file_url,
        reading_time: m.reading_time,
        order_index: m.order_index,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/materials/:id - Chi tiết tài liệu
export const getMaterialById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ message: 'ID tài liệu không hợp lệ' });
      return;
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course_id: true,
            course: {
              select: { id: true, code: true, name: true, difficulty: true },
            },
          },
        },
      },
    });

    if (!material) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
      return;
    }

    res.status(200).json(material);
  } catch (error) {
    console.error('Lỗi xem chi tiết tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/materials - Đăng bài giảng / Tài liệu học tập mới
export const createMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = createMaterialSchema.parse(req.body);
    const topicId = raw.topic_id || raw.topicId;
    if (!topicId) {
      res.status(400).json({ message: 'Mã chủ đề (topic_id) không được để trống' });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { course: true },
    });
    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề' });
      return;
    }

    const fileUrl = (raw.file_url || raw.fileUrl || '').trim() || null;
    const readingTime = raw.reading_time ?? raw.readingTime ?? raw.readingTimeMinutes ?? 5;
    const orderIndex = raw.order_index ?? raw.orderIndex ?? 0;

    const material = await prisma.material.create({
      data: {
        topic_id: topicId,
        title: raw.title,
        type: raw.type,
        content_type: raw.content_type || (raw.type === 'VIDEO' ? 'VIDEO_URL' : 'MARKDOWN'),
        content: raw.content,
        file_url: fileUrl,
        reading_time: readingTime,
        order_index: orderIndex,
      },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.status(201).json(material);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/materials/:id - Chỉnh sửa / Cập nhật tài liệu
export const updateMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ message: 'Mã tài liệu không hợp lệ' });
      return;
    }

    const existing = await prisma.material.findUnique({ where: { id: materialId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
      return;
    }

    const raw = updateMaterialSchema.parse(req.body);
    const newTopicId = raw.topic_id || raw.topicId;

    if (newTopicId && newTopicId !== existing.topic_id) {
      const topicExists = await prisma.topic.findUnique({ where: { id: newTopicId } });
      if (!topicExists) {
        res.status(404).json({ message: 'Chủ đề mới không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (newTopicId !== undefined) updateData.topic_id = newTopicId;
    if (raw.title !== undefined) updateData.title = raw.title;
    if (raw.type !== undefined) {
      updateData.type = raw.type;
      updateData.content_type = raw.type === 'VIDEO' ? 'VIDEO_URL' : 'MARKDOWN';
    }
    if (raw.content !== undefined) updateData.content = raw.content;
    if (raw.file_url !== undefined || raw.fileUrl !== undefined) {
      updateData.file_url = raw.file_url ?? raw.fileUrl ?? null;
    }
    if (raw.reading_time !== undefined || raw.readingTime !== undefined) {
      updateData.reading_time = raw.reading_time ?? raw.readingTime ?? null;
    }
    if (raw.order_index !== undefined || raw.orderIndex !== undefined) {
      updateData.order_index = raw.order_index ?? raw.orderIndex ?? 0;
    }

    const updated = await prisma.material.update({
      where: { id: materialId },
      data: updateData,
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/materials/:id - Xóa tài liệu
export const deleteMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      res.status(400).json({ message: 'Mã tài liệu không hợp lệ' });
      return;
    }

    const existing = await prisma.material.findUnique({ where: { id: materialId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
      return;
    }

    await prisma.material.delete({ where: { id: materialId } });

    res.status(200).json({
      message: `Đã xóa tài liệu "${existing.title}" thành công`,
      id: materialId,
    });
  } catch (error) {
    console.error('Lỗi xóa tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// ==========================================
// 4. USERS CONTROLLER (NGƯỜI DÙNG & HỌC VIÊN)
// ==========================================

// GET /api/admin/users - Lấy danh sách người dùng kèm phân trang, tìm kiếm, lọc role & riskLevel
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePagination(req);
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (search) {
      where.email = { contains: search };
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

// ==========================================
// 5. QUIZZES & QUESTIONS CONTROLLER (BÀI KIỂM TRA & CÂU HỎI)
// ==========================================

// GET /api/admin/quizzes - Danh sách bài kiểm tra kèm phân trang, tìm kiếm, lọc topicId/courseId
export const getQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePagination(req);
    const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (topicId && Number.isInteger(topicId) && topicId > 0) {
      where.topic_id = topicId;
    }
    if (courseId && Number.isInteger(courseId) && courseId > 0) {
      where.topic = { course_id: courseId };
    }

    const [totalRecords, quizzes] = await Promise.all([
      prisma.quiz.count({ where }),
      prisma.quiz.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          topic: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, code: true, name: true } },
            },
          },
          _count: {
            select: {
              questions: true,
              attempts: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.status(200).json({
      data: quizzes.map((q) => ({
        id: q.id,
        topic_id: q.topic_id,
        topic_title: q.topic.title,
        course_id: q.topic.course.id,
        course_code: q.topic.course.code,
        course_name: q.topic.course.name,
        title: q.title,
        description: q.description,
        time_limit_minutes: q.time_limit_minutes,
        created_at: q.created_at,
        questions_count: q._count.questions,
        attempts_count: q._count.attempts,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/quizzes/:id - Chi tiết bài kiểm tra kèm toàn bộ danh sách câu hỏi
export const getQuizById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ message: 'ID bài kiểm tra không hợp lệ' });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, code: true, name: true } },
          },
        },
        questions: {
          orderBy: { id: 'asc' },
        },
        _count: {
          select: { attempts: true, questions: true },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
      return;
    }

    // Parse options từ JSON string sang mảng string an toàn
    const formattedQuestions = quiz.questions.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      } catch {
        parsedOptions = [q.options];
      }
      return {
        ...q,
        options: parsedOptions,
      };
    });

    res.status(200).json({
      ...quiz,
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error('Lỗi xem chi tiết bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/quizzes/:id/cascade-info - Cảnh báo trước khi xóa Quiz
export const getQuizCascadeInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ message: 'ID bài kiểm tra không hợp lệ' });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
      return;
    }

    res.status(200).json({
      quiz_id: quiz.id,
      title: quiz.title,
      questions_count: quiz._count.questions,
      attempts_count: quiz._count.attempts,
      warning_message: `Xóa bài kiểm tra "${quiz.title}" sẽ xóa toàn bộ ${quiz._count.questions} câu hỏi trắc nghiệm và ${quiz._count.attempts} lượt kết quả làm bài của học viên!`,
    });
  } catch (error) {
    console.error('Lỗi cascade info quiz:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/quizzes - Tạo bài kiểm tra
export const createQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createQuizSchema.parse(req.body);
    const topicId = data.topic_id || data.topicId;
    if (!topicId) {
      res.status(400).json({ message: 'Mã chủ đề (topic_id) không được để trống' });
      return;
    }

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      res.status(404).json({ message: 'Không tìm thấy chủ đề liên kết' });
      return;
    }

    const quiz = await prisma.quiz.create({
      data: {
        topic_id: topicId,
        title: data.title,
        description: data.description ?? null,
        time_limit_minutes: data.time_limit_minutes ?? data.timeLimitMinutes ?? 15,
      },
      include: {
        topic: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(quiz);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/quizzes/:id - Cập nhật bài kiểm tra
export const updateQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ message: 'ID bài kiểm tra không hợp lệ' });
      return;
    }

    const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
      return;
    }

    const data = updateQuizSchema.parse(req.body);
    const newTopicId = data.topic_id || data.topicId;

    if (newTopicId && newTopicId !== existing.topic_id) {
      const topic = await prisma.topic.findUnique({ where: { id: newTopicId } });
      if (!topic) {
        res.status(404).json({ message: 'Chủ đề mới không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (newTopicId !== undefined) updateData.topic_id = newTopicId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.time_limit_minutes !== undefined || data.timeLimitMinutes !== undefined) {
      updateData.time_limit_minutes = data.time_limit_minutes ?? data.timeLimitMinutes;
    }

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
      include: {
        topic: { select: { id: true, title: true } },
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/quizzes/:id - Xóa bài kiểm tra
export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ message: 'ID bài kiểm tra không hợp lệ' });
      return;
    }

    const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
      return;
    }

    await prisma.quiz.delete({ where: { id: quizId } });

    res.status(200).json({
      message: `Đã xóa bài kiểm tra "${existing.title}" thành công`,
      id: quizId,
    });
  } catch (error) {
    console.error('Lỗi xóa bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/questions - Danh sách câu hỏi kèm phân trang, tìm kiếm, lọc quizId
export const getQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip, search } = parsePagination(req);
    const quizId = req.query.quizId ? Number(req.query.quizId) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { question_text: { contains: search } },
        { skill_tag: { contains: search } },
      ];
    }
    if (quizId && Number.isInteger(quizId) && quizId > 0) {
      where.quiz_id = quizId;
    }

    const [totalRecords, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              topic: {
                select: { id: true, title: true, course: { select: { id: true, code: true, name: true } } },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const formatted = questions.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      } catch {
        parsedOptions = [q.options];
      }
      return {
        id: q.id,
        quiz_id: q.quiz_id,
        quiz_title: q.quiz.title,
        course_name: q.quiz.topic.course.name,
        question_text: q.question_text,
        options: parsedOptions,
        correct_option_index: q.correct_option_index,
        explanation: q.explanation,
        skill_tag: q.skill_tag,
      };
    });

    res.status(200).json({
      data: formatted,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách câu hỏi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// GET /api/admin/questions/:id - Chi tiết một câu hỏi
export const getQuestionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      res.status(400).json({ message: 'ID câu hỏi không hợp lệ' });
      return;
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!question) {
      res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
      return;
    }

    let parsedOptions: string[] = [];
    try {
      parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
    } catch {
      parsedOptions = [question.options];
    }

    res.status(200).json({
      ...question,
      options: parsedOptions,
    });
  } catch (error) {
    console.error('Lỗi xem câu hỏi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// POST /api/admin/questions - Soạn câu hỏi trắc nghiệm mới
export const createQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = createQuestionSchema.parse(req.body);
    const quizId = raw.quiz_id || raw.quizId;
    if (!quizId) {
      res.status(400).json({ message: 'Mã bài kiểm tra (quiz_id) không được để trống' });
      return;
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      res.status(404).json({ message: 'Không tìm thấy bài kiểm tra liên kết' });
      return;
    }

    const questionText = raw.question_text || raw.questionText;
    if (!questionText) {
      res.status(400).json({ message: 'Nội dung câu hỏi không được để trống' });
      return;
    }

    const correctIndex = raw.correct_option_index ?? raw.correctOptionIndex ?? 0;
    const skillTag = raw.skill_tag || raw.skillTag || 'general';

    const optionsStr = typeof raw.options === 'string' ? raw.options : JSON.stringify(raw.options);

    const question = await prisma.question.create({
      data: {
        quiz_id: quizId,
        question_text: questionText,
        options: optionsStr,
        correct_option_index: correctIndex,
        explanation: raw.explanation ?? null,
        skill_tag: skillTag,
      },
    });

    res.status(201).json(question);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo câu hỏi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// PUT /api/admin/questions/:id - Chỉnh sửa câu hỏi trắc nghiệm
export const updateQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      res.status(400).json({ message: 'ID câu hỏi không hợp lệ' });
      return;
    }

    const existing = await prisma.question.findUnique({ where: { id: questionId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
      return;
    }

    const raw = updateQuestionSchema.parse(req.body);
    const newQuizId = raw.quiz_id || raw.quizId;

    if (newQuizId && newQuizId !== existing.quiz_id) {
      const quiz = await prisma.quiz.findUnique({ where: { id: newQuizId } });
      if (!quiz) {
        res.status(404).json({ message: 'Bài kiểm tra liên kết mới không tồn tại' });
        return;
      }
    }

    const updateData: any = {};
    if (newQuizId !== undefined) updateData.quiz_id = newQuizId;
    if (raw.question_text !== undefined || raw.questionText !== undefined) {
      updateData.question_text = raw.question_text ?? raw.questionText;
    }
    if (raw.options !== undefined) {
      updateData.options = typeof raw.options === 'string' ? raw.options : JSON.stringify(raw.options);
    }
    if (raw.correct_option_index !== undefined || raw.correctOptionIndex !== undefined) {
      updateData.correct_option_index = raw.correct_option_index ?? raw.correctOptionIndex;
    }
    if (raw.explanation !== undefined) {
      updateData.explanation = raw.explanation;
    }
    if (raw.skill_tag !== undefined || raw.skillTag !== undefined) {
      updateData.skill_tag = raw.skill_tag ?? raw.skillTag;
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi cập nhật câu hỏi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// DELETE /api/admin/questions/:id - Xóa câu hỏi
export const deleteQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      res.status(400).json({ message: 'ID câu hỏi không hợp lệ' });
      return;
    }

    const existing = await prisma.question.findUnique({ where: { id: questionId } });
    if (!existing) {
      res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
      return;
    }

    await prisma.question.delete({ where: { id: questionId } });

    res.status(200).json({
      message: 'Đã xóa câu hỏi thành công',
      id: questionId,
    });
  } catch (error) {
    console.error('Lỗi xóa câu hỏi:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// ==========================================
// 6. GIÁM SÁT & BÁO CÁO THỐNG KÊ (ANALYTICS)
// ==========================================

// GET /api/admin/students - Giám sát sinh viên kèm mức nguy cơ AI
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

// GET /api/admin/analytics - Báo cáo thống kê toàn hệ thống
export const getAdminAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalUsers = await prisma.user.count();
    const totalCourses = await prisma.course.count();
    const totalTopics = await prisma.topic.count();
    const totalMaterials = await prisma.material.count();
    const totalQuizzes = await prisma.quiz.count();
    const totalQuestions = await prisma.question.count();
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
      total_users: totalUsers,
      total_courses: totalCourses,
      total_topics: totalTopics,
      total_materials: totalMaterials,
      total_quizzes: totalQuizzes,
      total_questions: totalQuestions,
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
