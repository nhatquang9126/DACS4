import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { calculateSM2 } from '../services/sm2.service';

const createFlashcardSchema = z.object({
  front: z.string().trim().min(1, 'Mặt trước (câu hỏi/khái niệm) không được để trống'),
  back: z.string().trim().min(1, 'Mặt sau (câu trả lời/định nghĩa) không được để trống'),
  course_id: z.number().int().positive().optional().nullable(),
});

const reviewFlashcardSchema = z.object({
  quality: z
    .number()
    .min(0, 'Điểm đánh giá tối thiểu là 0')
    .max(5, 'Điểm đánh giá tối đa là 5'),
});

// 1. GET /api/flashcards/due - Lấy danh sách thẻ đến hạn ôn tập hôm nay (next_review <= now)
export const getDueFlashcards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { course_id } = req.query;

    const now = new Date();
    const whereCondition: any = {
      user_id: userId,
      next_review: { lte: now },
    };

    if (course_id) {
      const cId = Number(course_id);
      if (Number.isInteger(cId) && cId > 0) {
        whereCondition.course_id = cId;
      }
    }

    const dueCards = await prisma.flashcard.findMany({
      where: whereCondition,
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { next_review: 'asc' },
    });

    res.status(200).json(dueCards);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thẻ cần ôn tập:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách thẻ đến hạn' });
  }
};

// 2. GET /api/flashcards - Lấy toàn bộ thẻ của sinh viên
export const getAllFlashcards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { course_id } = req.query;

    const whereCondition: any = { user_id: userId };
    if (course_id) {
      const cId = Number(course_id);
      if (Number.isInteger(cId) && cId > 0) {
        whereCondition.course_id = cId;
      }
    }

    const cards = await prisma.flashcard.findMany({
      where: whereCondition,
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    res.status(200).json(cards);
  } catch (error) {
    console.error('Lỗi khi lấy toàn bộ thẻ flashcard:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi truy vấn thẻ flashcard' });
  }
};

// 3. POST /api/flashcards - Tạo thẻ flashcard mới
export const createFlashcard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { front, back, course_id } = createFlashcardSchema.parse(req.body);

    if (course_id) {
      const course = await prisma.course.findUnique({ where: { id: course_id } });
      if (!course) {
        res.status(404).json({ message: 'Không tìm thấy môn học liên kết' });
        return;
      }
    }

    const newCard = await prisma.flashcard.create({
      data: {
        user_id: userId,
        course_id: course_id || null,
        front,
        back,
        repetition: 0,
        interval: 1,
        ease_factor: 2.5,
        next_review: new Date(), // Sẵn sàng ôn ngay
      },
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    res.status(201).json(newCard);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi tạo thẻ flashcard:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo thẻ flashcard' });
  }
};

// 4. POST /api/flashcards/:id/review - Đánh giá và cập nhật theo thuật toán SM-2
export const reviewFlashcard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cardId = Number(req.params.id);

    if (!Number.isInteger(cardId) || cardId <= 0) {
      res.status(400).json({ message: 'Mã thẻ flashcard không hợp lệ' });
      return;
    }

    const { quality } = reviewFlashcardSchema.parse(req.body);

    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, user_id: userId },
    });

    if (!card) {
      res.status(404).json({ message: 'Không tìm thấy thẻ flashcard hoặc bạn không có quyền truy cập' });
      return;
    }

    // Áp dụng thuật toán SM-2 tính toán các tham số mới
    const sm2Result = calculateSM2({
      quality,
      repetition: card.repetition,
      interval: card.interval,
      easeFactor: card.ease_factor,
    });

    // Cập nhật CSDL
    const updatedCard = await prisma.flashcard.update({
      where: { id: card.id },
      data: {
        repetition: sm2Result.repetition,
        interval: sm2Result.interval,
        ease_factor: sm2Result.easeFactor,
        next_review: sm2Result.nextReviewDate,
      },
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    res.status(200).json({
      message: 'Cập nhật tiến trình ôn tập thành công',
      flashcard: updatedCard,
      sm2: {
        quality,
        repetition: sm2Result.repetition,
        interval_days: sm2Result.interval,
        ease_factor: sm2Result.easeFactor,
        next_review: sm2Result.nextReviewDate,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Điểm đánh giá không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi khi chấm điểm thẻ flashcard:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thẻ' });
  }
};

// 5. DELETE /api/flashcards/:id - Xóa thẻ flashcard
export const deleteFlashcard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cardId = Number(req.params.id);

    if (!Number.isInteger(cardId) || cardId <= 0) {
      res.status(400).json({ message: 'Mã thẻ flashcard không hợp lệ' });
      return;
    }

    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, user_id: userId },
    });

    if (!card) {
      res.status(404).json({ message: 'Không tìm thấy thẻ cần xóa' });
      return;
    }

    await prisma.flashcard.delete({ where: { id: card.id } });
    res.status(200).json({ message: 'Đã xóa thẻ flashcard thành công' });
  } catch (error) {
    console.error('Lỗi xóa thẻ flashcard:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa thẻ flashcard' });
  }
};

