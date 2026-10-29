import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const createTaskSchema = z.object({
title: z.string().min(1, 'Tiêu đề không được để trống'),
description: z.string().optional(),
due_date: z.string().datetime('Định dạng ngày đến hạn không hợp lệ (ISO 8601)'),
enrollment_id: z.number().int('Mã môn học phải là số nguyên'),
});

const updateStatusSchema = z.object({
status: z.enum(['TODO', 'IN_PROGRESS', 'DONE'], { error: 'Trạng thái không hợp lệ' }),
});

export const getMyTasks = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const tasks = await prisma.task.findMany({
    where: { user_id: req.user!.id },
    orderBy: { due_date: 'asc' },
    });
    res.status(200).json(tasks);
} catch (error) {
    res.status(500).json({ message: 'Lỗi khi truy xuất danh sách nhiệm vụ' });
}
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const { title, description, due_date, enrollment_id } = createTaskSchema.parse(req.body);

    const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollment_id, user_id: req.user!.id }
    });

    if (!enrollment) {
    res.status(403).json({ message: 'Bạn không có quyền tạo nhiệm vụ cho môn học này hoặc môn học không tồn tại' });
    return;
    }

    const task = await prisma.task.create({
    data: { title, description, due_date: new Date(due_date), user_id: req.user!.id, enrollment_id },
    });

    res.status(201).json(task);
} catch (error: any) {
    if (error instanceof z.ZodError) res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    else res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
        res.status(400).json({ message: 'Mã nhiệm vụ không hợp lệ' });
        return;
    }

    const { status } = updateStatusSchema.parse(req.body);

    const existingTask = await prisma.task.findFirst({
    where: { id: taskId, user_id: req.user!.id }
    });

    if (!existingTask) {
    res.status(404).json({ message: 'Không tìm thấy nhiệm vụ hoặc bạn không có quyền truy cập' });
    return;
    }

    const task = await prisma.task.update({
    where: { id: taskId },
    data: { status, completed_at: status === 'DONE' ? new Date() : null },
    });

    res.status(200).json(task);
} catch (error: any) {
    if (error instanceof z.ZodError) res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    else res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};