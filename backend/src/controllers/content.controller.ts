import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const positiveIntParam = z.coerce
.number()
.int('ID phải là số nguyên')
.positive('ID phải là số nguyên dương');

// 1. GET /api/courses/:courseId/topics - Lấy danh sách chủ đề của môn học
export const getCourseTopics = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const courseIdResult = positiveIntParam.safeParse(req.params.courseId);
    if (!courseIdResult.success) {
    res.status(400).json({ message: 'Mã môn học không hợp lệ', errors: courseIdResult.error.issues });
    return;
    }
    const courseId = courseIdResult.data;

    // Kiểm tra môn học có tồn tại không
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
    res.status(404).json({ message: 'Không tìm thấy môn học' });
    return;
    }

    const topics = await prisma.topic.findMany({
    where: { course_id: courseId },
    orderBy: { order_index: 'asc' },
    include: {
        materials: {
        orderBy: { order_index: 'asc' },
        },
        quizzes: {
        select: {
            id: true,
            topic_id: true,
            title: true,
            description: true,
            time_limit_minutes: true,
        },
        orderBy: { id: 'asc' },
        },
    },
    });

    res.status(200).json(topics);
} catch (error) {
    console.error('Lỗi lấy danh sách chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 2. GET /api/topics/:topicId/materials - Lấy danh sách tài liệu của một chủ đề
export const getTopicMaterials = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const topicIdResult = positiveIntParam.safeParse(req.params.topicId);
    if (!topicIdResult.success) {
    res.status(400).json({ message: 'Mã chủ đề không hợp lệ', errors: topicIdResult.error.issues });
    return;
    }
    const topicId = topicIdResult.data;

    const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
        materials: {
        orderBy: { order_index: 'asc' },
        select: {
            id: true,
            topic_id: true,
            title: true,
            content_type: true,
            order_index: true,
            created_at: true,
        },
        },
    },
    });
    if (!topic) {
    res.status(404).json({ message: 'Không tìm thấy chủ đề' });
    return;
    }

    res.status(200).json({
    topic: { id: topic.id, title: topic.title, description: topic.description },
    materials: topic.materials,
    });
} catch (error) {
    console.error('Lỗi lấy danh sách tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// 3. GET /api/materials/:id - Xem chi tiết tài liệu học tập
export const getMaterialDetail = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const materialIdResult = positiveIntParam.safeParse(req.params.id);
    if (!materialIdResult.success) {
    res.status(400).json({ message: 'Mã tài liệu không hợp lệ', errors: materialIdResult.error.issues });
    return;
    }
    const materialId = materialIdResult.data;

    const material = await prisma.material.findUnique({
    where: { id: materialId },
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