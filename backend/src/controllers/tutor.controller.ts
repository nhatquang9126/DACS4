import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { askAITutor } from '../services/ai.service';

const positiveIntParam = z.coerce.number().int().positive();

// 1. POST /api/tutor/chat - Trò chuyện với AI (kèm Conversational Memory & Ngữ cảnh môn học)
export const chatWithTutor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { session_id, message } = z
      .object({
        session_id: z.number().int().positive().optional(),
        message: z.string().min(1, 'Nội dung tin nhắn không được để trống'),
      })
      .parse(req.body);

    const userId = req.user!.id;
    let sessionId = session_id;

    // 1. Kiểm tra quyền sở hữu phiên chat hoặc tạo session mới
    if (sessionId) {
      const existingSession = await prisma.tutorSession.findFirst({
        where: { id: sessionId, user_id: userId },
      });
      if (!existingSession) {
        res.status(403).json({ message: 'Bạn không có quyền truy cập phiên chat này' });
        return;
      }
    } else {
      const newSession = await prisma.tutorSession.create({
        data: { user_id: userId, topic: message.substring(0, 50) },
      });
      sessionId = newSession.id;
    }

    // 2. Lấy tối đa 8 tin nhắn gần nhất của phiên này để làm conversational memory
    const previousMessages = await prisma.tutorMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
      take: 8,
    });

    const historyPayload = previousMessages.map((m) => ({
      sender: m.sender as 'USER' | 'AI',
      content: m.content,
    }));

    // 3. Lấy danh sách các môn học sinh viên đang đăng ký
    const enrollments = await prisma.enrollment.findMany({
      where: { user_id: userId, status: 'ACTIVE' },
      include: { course: true },
    });
    const enrolledCourses = enrollments.map((e) => `${e.course.code} - ${e.course.name}`);

    // 4. Lưu tin nhắn của User
    await prisma.tutorMessage.create({
      data: { session_id: sessionId, sender: 'USER', content: message },
    });

    // 5. Gọi AI Service kèm lịch sử hội thoại và ngữ cảnh môn học
    const aiReply = await askAITutor(message, undefined, historyPayload, enrolledCourses);

    // 6. Lưu tin nhắn của AI
    const aiMessage = await prisma.tutorMessage.create({
      data: { session_id: sessionId, sender: 'AI', content: aiReply },
    });

    res.status(200).json({ session_id: sessionId, reply: aiMessage });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: error.issues });
      return;
    }
    console.error('Lỗi khi chat với Gia sư AI:', error.message);
    res.status(500).json({ message: 'Lỗi khi chat với AI' });
  }
};

// 2. POST /api/tutor/explain - Giải thích một khái niệm hoặc câu hỏi sai
export const explainConcept = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const { concept, context } = z.object({
    concept: z.string().min(1),
    context: z.string().optional(),
    }).parse(req.body);

    const prompt = `Hãy giải thích khái niệm: ${concept}. Context: ${context || 'Không có'}`;
    const explanation = await askAITutor(prompt, context);

    res.status(200).json({ explanation });
} catch (error) {
    res.status(500).json({ message: 'Lỗi khi yêu cầu giải thích' });
}
};

// 3. GET /api/tutor/sessions - Lấy lịch sử chat
export const getChatSessions = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const sessions = await prisma.tutorSession.findMany({
    where: { user_id: req.user!.id },
    orderBy: { created_at: 'desc' }
    });
    res.status(200).json(sessions);
} catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
}
};

// 4. GET /api/tutor/sessions/:id/messages - Chi tiết một phiên chat

export const getSessionMessages = async (
req: AuthRequest,
res: Response
): Promise<void> => {
try {
    const parsedId = positiveIntParam.safeParse(req.params.id);

    if (!parsedId.success) {
    res.status(400).json({
        message: 'ID phiên chat không hợp lệ',
    });
    return;
    }

    const session = await prisma.tutorSession.findFirst({
    where: {
        id: parsedId.data,
        user_id: req.user!.id,
    },
    });

    if (!session) {
    res.status(404).json({
        message: 'Không tìm thấy phiên chat',
    });
    return;
    }

    const messages = await prisma.tutorMessage.findMany({
    where: {
        session_id: session.id,
    },
    orderBy: {
        created_at: 'asc',
    },
    });

    res.status(200).json(messages);
} catch (error) {
    console.error('getSessionMessages error:', error);

    res.status(500).json({
    message: 'Lỗi lấy tin nhắn',
    });
}
};

// Thêm vào src/controllers/tutor.controller.ts

export const generateQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topicId, materialId, topic, count } = req.body;
    const numQuestions = count ? Math.min(Math.max(Number(count), 1), 10) : 4;

    let targetTopicId: number | null = null;
    let contentContext = '';
    let contentTitle = '';

    // 1. Lấy dữ liệu từ Material nếu truyền materialId
    if (materialId) {
      const matId = Number(materialId);
      const material = await prisma.material.findUnique({
        where: { id: matId },
        include: { topic: true },
      });
      if (!material) {
        res.status(404).json({ message: 'Không tìm thấy tài liệu học tập' });
        return;
      }
      targetTopicId = material.topic_id;
      contentTitle = material.title;
      contentContext = `Tài liệu: "${material.title}"\nNội dung:\n${material.content.slice(0, 2500)}`;
    }
    // 2. Lấy dữ liệu từ Topic nếu truyền topicId
    else if (topicId) {
      const topId = Number(topicId);
      const top = await prisma.topic.findUnique({
        where: { id: topId },
        include: { materials: true },
      });
      if (!top) {
        res.status(404).json({ message: 'Không tìm thấy chủ đề học tập' });
        return;
      }
      targetTopicId = top.id;
      contentTitle = top.title;
      const combinedMaterials = top.materials.map((m) => m.content).join('\n---\n');
      contentContext = `Chủ đề: "${top.title}"\n${top.description ? `Mô tả: ${top.description}\n` : ''}Tài liệu tổng hợp:\n${combinedMaterials.slice(0, 2500)}`;
    } else if (topic && typeof topic === 'string') {
      contentTitle = topic;
      contentContext = `Chủ đề: "${topic}"`;
    } else {
      res.status(400).json({ message: 'Vui lòng cung cấp materialId, topicId hoặc tên chủ đề' });
      return;
    }

    // 3. Prompt gửi cho LLM để sinh bộ câu hỏi trắc nghiệm
    const prompt = `Bạn là chuyên gia giáo dục biên soạn đề thi. Hãy tạo đúng ${numQuestions} câu hỏi trắc nghiệm chất lượng cao bám sát nội dung sau:
${contentContext}

Yêu cầu định dạng đầu ra:
Trả về DUY NHẤT một chuỗi JSON thuần (không kèm định dạng markdown \`\`\`json hay văn bản giải thích phụ):
{
  "title": "Quiz ôn tập AI: ${contentTitle.slice(0, 40)}",
  "questions": [
    {
      "question_text": "Nội dung câu hỏi rõ ràng, bám sát bài học?",
      "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      "correct_option_index": 0,
      "explanation": "Giải thích chi tiết vì sao đáp án này đúng.",
      "skill_tag": "khai_niem_co_ban"
    }
  ]
}`;

    const jsonString = await askAITutor(prompt);

    // Xử lý chuỗi JSON nếu LLM có bọc markdown
    let cleanJson = jsonString.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const data = JSON.parse(cleanJson);
    const questionsList = Array.isArray(data.questions) ? data.questions : [];

    if (questionsList.length === 0) {
      throw new Error('AI không sinh được câu hỏi hợp lệ.');
    }

    // 4. Lưu Quiz vào Database nếu có targetTopicId để sinh viên làm bài ngay
    if (targetTopicId) {
      const createdQuiz = await prisma.quiz.create({
        data: {
          topic_id: targetTopicId,
          title: data.title || `Quiz AI: ${contentTitle.slice(0, 40)}`,
          description: `Đề thi trắc nghiệm được sinh tự động bởi AI từ bài học "${contentTitle}".`,
          time_limit_minutes: Math.max(5, questionsList.length * 2),
          questions: {
            create: questionsList.map((q: any) => ({
              question_text: q.question_text || 'Câu hỏi',
              options: JSON.stringify(q.options || ['A', 'B', 'C', 'D']),
              correct_option_index: Number.isInteger(q.correct_option_index) ? q.correct_option_index : 0,
              explanation: q.explanation || '',
              skill_tag: q.skill_tag || 'on_tap_ai',
            })),
          },
        },
        include: {
          questions: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Đã sinh câu hỏi và tạo bài kiểm tra Quiz thành công!',
        quiz_id: createdQuiz.id,
        quiz: createdQuiz,
      });
      return;
    }

    res.status(200).json({
      success: true,
      questions: questionsList,
    });
  } catch (error: any) {
    console.error('Lỗi khi sinh câu hỏi trắc nghiệm:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể sinh câu hỏi trắc nghiệm lúc này. Vui lòng thử lại.',
      error: error?.message,
    });
  }
};