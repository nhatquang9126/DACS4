import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const positiveIntSchema = z.coerce
    .number()
    .int('ID phải là số nguyên')
    .positive('ID phải là số nguyên dương');

const addGradeComponentSchema = z.object({
    enrollment_id: z.number().int().positive('Mã đăng ký môn học không hợp lệ'),
    name: z
        .string()
        .trim()
        .min(1, 'Tên cột điểm không được để trống hoặc chỉ chứa khoảng trắng'),
    weight: z
        .number()
        .gt(0, 'Trọng số phải lớn hơn 0')
        .lte(1.0, 'Trọng số tối đa là 1.0 (tương ứng 100%)'),
    score: z
        .number()
        .gte(0, 'Điểm số không được nhỏ hơn 0')
        .lte(10, 'Điểm số không được lớn hơn 10')
        .nullable()
        .optional(),
});

const updateGradeScoreSchema = z.object({
    score: z
        .number()
        .gte(0, 'Điểm số không được nhỏ hơn 0')
        .lte(10, 'Điểm số không được lớn hơn 10'),
});

export const addGradeComponent = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const { enrollment_id, name, weight, score } = addGradeComponentSchema.parse(req.body);
    const userId = req.user!.id;

    // 1. Kiểm tra quyền sở hữu đối với Enrollment
    const enrollment = await prisma.enrollment.findFirst({
        where: { id: enrollment_id, user_id: userId },
        include: { gradeComponents: true },
    });

    if (!enrollment) {
    res.status(403).json({ message: 'Bạn không có quyền thao tác trên môn học này hoặc môn học không tồn tại' });
    return;
    }

    // 2. Chống tạo cột điểm trùng tên trong cùng một môn học
    const existingComponentByName = enrollment.gradeComponents.find(
    (gc) => gc.name.toLowerCase() === name.toLowerCase()
    );
    if (existingComponentByName) {
    res.status(400).json({ message: `Cột điểm "${name}" đã tồn tại trong môn học này` });
    return;
    }

    // 3. Kiểm tra tổng trọng số không vượt quá 1.0 (100%)
    const currentTotalWeight = enrollment.gradeComponents.reduce((acc, item) => acc + item.weight, 0);
    if (currentTotalWeight + weight > 1.0001) {
    res.status(400).json({
        message: `Tổng trọng số các cột điểm không được vượt quá 1.0 (100%). Trọng số hiện tại: ${currentTotalWeight.toFixed(2)}, thêm vào: ${weight}`,
    });
    return;
    }

    const gradeComponent = await prisma.gradeComponent.create({
    data: {
        enrollment_id,
        name,
        weight,
        score: score ?? null,
    },
    });

    res.status(201).json(gradeComponent);
} catch (error: any) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    return;
    }
    console.error('Lỗi khi thêm cột điểm:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

export const updateGradeComponent = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const componentIdResult = positiveIntSchema.safeParse(req.params.id);
    if (!componentIdResult.success) {
    res.status(400).json({ message: 'Mã cột điểm trên URL không hợp lệ', errors: componentIdResult.error.issues });
    return;
    }
    const componentId = componentIdResult.data;

    const { score } = updateGradeScoreSchema.parse(req.body);
    const userId = req.user!.id;

    // Kiểm tra quyền sở hữu đối với cột điểm thông qua quan hệ với Enrollment
    const component = await prisma.gradeComponent.findUnique({
    where: { id: componentId },
    include: { enrollment: true },
    });

    if (!component || component.enrollment.user_id !== userId) {
    res.status(404).json({ message: 'Không tìm thấy cột điểm hoặc bạn không có quyền chỉnh sửa' });
    return;
    }

    const updatedComponent = await prisma.gradeComponent.update({
    where: { id: componentId },
    data: { score },
    });

    res.status(200).json(updatedComponent);
} catch (error: any) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    return;
    }
    console.error('Lỗi khi cập nhật điểm:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

export const deleteGradeComponent = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const componentIdResult = positiveIntSchema.safeParse(req.params.id);
    if (!componentIdResult.success) {
    res.status(400).json({ message: 'Mã cột điểm trên URL không hợp lệ', errors: componentIdResult.error.issues });
    return;
    }
    const componentId = componentIdResult.data;
    const userId = req.user!.id;

    const component = await prisma.gradeComponent.findUnique({
    where: { id: componentId },
    include: { enrollment: true },
    });

    if (!component || component.enrollment.user_id !== userId) {
    res.status(404).json({ message: 'Không tìm thấy cột điểm hoặc bạn không có quyền xóa' });
    return;
    }

    await prisma.gradeComponent.delete({ where: { id: componentId } });
    res.status(200).json({ message: 'Xóa cột điểm thành công' });
} catch (error) {
    console.error('Lỗi khi xóa cột điểm:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};