import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const positiveIntParam = z.coerce
.number()
.int('ID phải là số nguyên')
.positive('ID phải là số nguyên dương');

// GET /api/courses/:courseId/topics - Lấy chủ đề, bài học & bài quiz theo môn học
export const getCourseTopics = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const courseIdResult = positiveIntParam.safeParse(req.params.courseId);
    if (!courseIdResult.success) {
    res.status(400).json({ message: 'Mã môn học không hợp lệ', errors: courseIdResult.error.issues });
    return;
    }
    const courseId = courseIdResult.data;

    const topics = await prisma.topic.findMany({
    where: { course_id: courseId },
    include: {
        materials: {
        orderBy: { order_index: 'asc' },
        },
        quizzes: {
        select: {
            id: true,
            title: true,
            description: true,
            time_limit_minutes: true,
        },
        },
    },
    orderBy: { order_index: 'asc' },
    });

    res.status(200).json(topics);
} catch (error) {
    console.error('Lỗi lấy danh sách chủ đề:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

// GET /api/materials/:id - Lấy chi tiết tài liệu học tập
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
    });

    if (!material) {
    res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    return;
    }

    res.status(200).json(material);
} catch (error) {
    console.error('Lỗi lấy chi tiết tài liệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};