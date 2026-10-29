import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { buildStudyPlanForUser } from './learning.controller';

const positiveIntParam = z.coerce
.number()
.int('ID phải là số nguyên')
.positive('ID phải là số nguyên dương');

const submitQuizSchema = z.object({
answers: z
    .array(
    z.object({
        question_id: z.number().int().positive('Mã câu hỏi không hợp lệ'),
        selected_option_index: z.number().int().min(0, 'Chỉ số đáp án không hợp lệ'),
    })
    )
    .min(1, 'Bài nộp phải có ít nhất một câu trả lời'),
});

// 1. GET /api/topics/:topicId/quizzes - Danh sách bài kiểm tra của chủ đề
export const getTopicQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const topicIdResult = positiveIntParam.safeParse(req.params.topicId);
    if (!topicIdResult.success) {
    res.status(400).json({ message: 'Mã chủ đề không hợp lệ', errors: topicIdResult.error.issues });
    return;
    }
    const topicId = topicIdResult.data;

    const quizzes = await prisma.quiz.findMany({
    where: { topic_id: topicId },
    include: {
        _count: { select: { questions: true } },
    },
    orderBy: { id: 'asc' },
    });

    res.status(200).json(quizzes);
} catch (error) {
    console.error('Lỗi lấy danh sách bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 2. GET /api/quizzes/:quizId/questions - Lấy câu hỏi (ẨN ĐÁP ÁN ĐÚNG & BÀI GIẢI)
export const getQuizQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const quizIdResult = positiveIntParam.safeParse(req.params.quizId);
    if (!quizIdResult.success) {
    res.status(400).json({ message: 'Mã bài kiểm tra không hợp lệ', errors: quizIdResult.error.issues });
    return;
    }
    const quizId = quizIdResult.data;

    const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
        questions: {
        select: {
            id: true,
            quiz_id: true,
            question_text: true,
            options: true,
            skill_tag: true,
            // KHÔNG select: correct_option_index, explanation
        },
        },
    },
    });

    if (!quiz) {
    res.status(404).json({ message: 'Không tìm thấy bài kiểm tra' });
    return;
    }

    // Parse chuỗi JSON options thành mảng
    const formattedQuestions = quiz.questions.map((q) => ({
    ...q,
    options: JSON.parse(q.options),
    }));

    res.status(200).json({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    time_limit_minutes: quiz.time_limit_minutes,
    total_questions: formattedQuestions.length,
    questions: formattedQuestions,
    });
} catch (error) {
    console.error('Lỗi lấy câu hỏi bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 3. POST /api/quizzes/:quizId/submit - Nộp bài, chấm điểm & lưu kết quả
export const submitQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const quizIdResult = positiveIntParam.safeParse(req.params.quizId);
    if (!quizIdResult.success) {
    res.status(400).json({ message: 'Mã bài kiểm tra không hợp lệ', errors: quizIdResult.error.issues });
    return;
    }
    const quizId = quizIdResult.data;

    const { answers } = submitQuizSchema.parse(req.body);
    const userId = req.user!.id;

    const questions = await prisma.question.findMany({
    where: { quiz_id: quizId },
    });

    if (questions.length === 0) {
    res.status(404).json({ message: 'Bài kiểm tra không có câu hỏi nào' });
    return;
    }

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let correctCount = 0;
    const answerRecords: { question_id: number; selected_option_index: number; is_correct: boolean }[] = [];

    // Phân tích theo skill_tag
    const skillStats: Record<string, { total: number; correct: number }> = {};

    answers.forEach((ans) => {
    const q = questionMap.get(ans.question_id);
    if (q) {
        const isCorrect = q.correct_option_index === ans.selected_option_index;
        if (isCorrect) correctCount++;

        answerRecords.push({
        question_id: q.id,
        selected_option_index: ans.selected_option_index,
        is_correct: isCorrect,
        });

        if (!skillStats[q.skill_tag]) {
        skillStats[q.skill_tag] = { total: 0, correct: 0 };
        }
        skillStats[q.skill_tag].total += 1;
        if (isCorrect) skillStats[q.skill_tag].correct += 1;
    }
    });

    // Tính tỷ lệ % thành thạo theo từng skill_tag
    const skillBreakdown: Record<string, { total: number; correct: number; percentage: number }> = {};
    Object.keys(skillStats).forEach((tag) => {
    const { total, correct } = skillStats[tag];
    skillBreakdown[tag] = {
        total,
        correct,
        percentage: parseFloat(((correct / total) * 100).toFixed(1)),
    };
    });

    const score = parseFloat(((correctCount / questions.length) * 10).toFixed(2));

    // Lưu vào CSDL trong một Transaction
    const attempt = await prisma.$transaction(async (tx) => {
    const newAttempt = await tx.quizAttempt.create({
        data: {
        user_id: userId,
        quiz_id: quizId,
        score,
        total_questions: questions.length,
        correct_answers_count: correctCount,
        skill_breakdown: JSON.stringify(skillBreakdown),
        },
    });

    await tx.quizAnswer.createMany({
        data: answerRecords.map((ar) => ({
        attempt_id: newAttempt.id,
        question_id: ar.question_id,
        selected_option_index: ar.selected_option_index,
        is_correct: ar.is_correct,
        })),
    });

    return newAttempt;
    });

    // Tự động cập nhật Lộ trình cá nhân hóa (StudyPlan) và làm mới Cache Dự đoán AI
    try {
      const quizInfo = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { topic_id: true },
      });

      if (quizInfo?.topic_id) {
        await buildStudyPlanForUser(userId, quizInfo.topic_id);
      }

      // Vô hiệu hóa cache AI dự đoán nguy cơ cũ để Dashboard tự động tính lại theo kết quả mới
      await prisma.prediction.deleteMany({
        where: { user_id: userId },
      });
    } catch (syncError) {
      console.warn('Lỗi khi tự động cập nhật lộ trình/AI sau khi nộp quiz:', syncError);
    }

    res.status(201).json({
      attempt_id: attempt.id,
      score,
      correct_answers_count: correctCount,
      total_questions: questions.length,
      skill_breakdown: skillBreakdown,
    });
} catch (error: any) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Lỗi dữ liệu nộp bài', errors: error.issues });
    return;
    }
    console.error('Lỗi nộp bài kiểm tra:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 4. GET /api/quiz-attempts/history - Lịch sử làm bài của sinh viên
export const getAttemptHistory = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const userId = req.user!.id;

    const attempts = await prisma.quizAttempt.findMany({
    where: { user_id: userId },
    include: {
        quiz: {
        select: {
            id: true,
            title: true,
            topic: {
            select: { id: true, title: true, course: { select: { code: true, name: true } } },
            },
        },
        },
    },
    orderBy: { created_at: 'desc' },
    });

    const formattedAttempts = attempts.map((a) => ({
    ...a,
    skill_breakdown: JSON.parse(a.skill_breakdown),
    }));

    res.status(200).json(formattedAttempts);
} catch (error) {
    console.error('Lỗi xem lịch sử làm bài:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 5. GET /api/quiz-attempts/:id - Xem chi tiết kết quả làm bài
export const getAttemptDetail = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const attemptIdResult = positiveIntParam.safeParse(req.params.id);
    if (!attemptIdResult.success) {
    res.status(400).json({ message: 'Mã lượt làm bài không hợp lệ', errors: attemptIdResult.error.issues });
    return;
    }
    const attemptId = attemptIdResult.data;
    const userId = req.user!.id;

    const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
        quiz: { select: { title: true } },
        answers: {
        include: {
            question: {
            select: {
                id: true,
                question_text: true,
                options: true,
                correct_option_index: true,
                explanation: true,
                skill_tag: true,
            },
            },
        },
        },
    },
    });

    if (!attempt || attempt.user_id !== userId) {
    res.status(404).json({ message: 'Không tìm thấy lượt làm bài hoặc bạn không có quyền truy cập' });
    return;
    }

    const detailedAnswers = attempt.answers.map((ans) => ({
    question_id: ans.question.id,
    question_text: ans.question.question_text,
    options: JSON.parse(ans.question.options),
    selected_option_index: ans.selected_option_index,
    correct_option_index: ans.question.correct_option_index,
    is_correct: ans.is_correct,
    explanation: ans.question.explanation,
    skill_tag: ans.question.skill_tag,
    }));

    res.status(200).json({
    attempt_id: attempt.id,
    quiz_title: attempt.quiz.title,
    score: attempt.score,
    correct_answers_count: attempt.correct_answers_count,
    total_questions: attempt.total_questions,
    skill_breakdown: JSON.parse(attempt.skill_breakdown),
    created_at: attempt.created_at,
    details: detailedAnswers,
    });
} catch (error) {
    console.error('Lỗi xem chi tiết lượt làm bài:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};