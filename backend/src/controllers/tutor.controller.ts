import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { askAITutor } from '../services/ai.service';

const positiveIntParam = z.coerce.number().int().positive();

// 1. POST /api/tutor/chat - Trò chuyện với AI
export const chatWithTutor = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const { session_id, message } = z.object({
    session_id: z.number().int().positive().optional(),
    message: z.string().min(1),
    }).parse(req.body);
    
    const userId = req.user!.id;
    let sessionId = session_id;

    // Kiểm tra quyền sở hữu phiên chat hoặc tạo session mới
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

    // Lưu tin nhắn của User
    await prisma.tutorMessage.create({
    data: { session_id: sessionId, sender: 'USER', content: message }
    });

    // Gọi AI Service
    const aiReply = await askAITutor(message);

    // Lưu tin nhắn của AI
    const aiMessage = await prisma.tutorMessage.create({
    data: { session_id: sessionId, sender: 'AI', content: aiReply }
    });

    res.status(200).json({ session_id: sessionId, reply: aiMessage });
} catch (error) {
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
    const { topic, count } = req.body;
    
    // Ép AI trả về JSON Object có chứa mảng "questions"
    const prompt = `Hãy tạo ${count || 3} câu hỏi trắc nghiệm về chủ đề "${topic}". 
Yêu cầu trả về DUY NHẤT một JSON Object có định dạng sau, không có markdown text dư thừa:
{
"questions": [
    {
    "question_text": "Nội dung câu hỏi?",
    "options": ["A", "B", "C", "D"],
    "correct_option_index": 0,
    "explanation": "Giải thích vì sao A đúng."
    }
]
}`;

    const jsonString = await askAITutor(prompt);
    
    // Parse chuỗi JSON từ AI trả về để gửi xuống Client như một mảng thực thụ
    const data = JSON.parse(jsonString);
    
    res.status(200).json(data);
} catch (error) {
    res.status(500).json({ message: 'Lỗi khi sinh câu hỏi', error });
}
};