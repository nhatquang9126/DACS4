import { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const enrollSchema = z.object({
course_id: z.number().int('Mã môn học phải là số nguyên dương').positive('Mã môn học không hợp lệ'),
semester: z
    .string()
    .trim()
    .min(1, 'Học kỳ không được để trống hoặc chỉ chứa khoảng trắng'),
});

export const getCourseCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const courses = await prisma.course.findMany({
    orderBy: { code: 'asc' },
    });
    res.status(200).json(courses);
} catch (error) {
    console.error('Lỗi khi lấy danh mục môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

export const enrollCourse = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const { course_id, semester } = enrollSchema.parse(req.body);
    const userId = req.user!.id;

    // 1. Kiểm tra môn học có tồn tại hay không
    const course = await prisma.course.findUnique({ where: { id: course_id } });
    if (!course) {
    res.status(404).json({ message: 'Không tìm thấy môn học' });
    return;
    }

    // 2. Tạo Enrollment
    const enrollment = await prisma.enrollment.create({
    data: {
        user_id: userId,
        course_id,
        semester,
        status: 'ACTIVE',
    },
    include: {
        course: true,
    },
    });

    res.status(201).json(enrollment);
} catch (error: any) {
    if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Lỗi dữ liệu đầu vào', errors: error.issues });
    return;
    }
    
    // Bắt lỗi vi phạm ràng buộc duy nhất (Unique constraint P2002) từ Prisma nếu có 2 request đồng thời
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(400).json({ message: 'Bạn đã đăng ký môn học này trong học kỳ hiện tại' });
    return;
    }

    console.error('Lỗi đăng ký môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};

export const getMyEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
try {
    const userId = req.user!.id;
    const { semester } = req.query;

    const whereCondition: any = { user_id: userId };
    if (semester && typeof semester === 'string' && semester.trim() !== '') {
    whereCondition.semester = semester.trim();
    }

    const enrollments = await prisma.enrollment.findMany({
    where: whereCondition,
    include: {
        course: true,
        gradeComponents: true,
    },
    orderBy: { id: 'desc' },
    });

    const result = enrollments.map((item) => {
    let totalWeightedScore = 0;
    let completedWeight = 0;
    let totalAssignedWeight = 0;

    item.gradeComponents.forEach((gc) => {
        totalAssignedWeight += gc.weight;
        if (gc.score !== null && gc.score !== undefined) {
        totalWeightedScore += gc.score * gc.weight;
        completedWeight += gc.weight;
        }
    });

    // Công thức: Điểm trung bình các cột đã có = \frac{\sum (Score_i \times Weight_i)}{\sum Weight_{completed}}
    const currentAverageScore =
        completedWeight > 0 ? parseFloat((totalWeightedScore / completedWeight).toFixed(2)) : null;

    // Đánh giá trạng thái hoàn thành các cột điểm (khi tổng trọng số các cột đã nhập đạt 1.0 = 100%)
    const isFinalScore = Math.abs(completedWeight - 1.0) < 0.0001;

    return {
        id: item.id,
        course: item.course,
        semester: item.semester,
        status: item.status,
        gradeComponents: item.gradeComponents,
        summary: {
        currentAverageScore, // Điểm trung bình trọng số của các cột ĐÃ CÓ ĐIỂM
        completedWeightRatio: parseFloat(completedWeight.toFixed(4)), // Tổng trọng số đã có điểm (VD: 0.3)
        totalAssignedWeightRatio: parseFloat(totalAssignedWeight.toFixed(4)), // Tổng trọng số các cột đã tạo (VD: 1.0)
        isFinalScore, // true nếu đã có đủ 100% trọng số điểm
        note: isFinalScore
            ? 'Đã đủ điểm thành phần'
            : 'Đây là điểm trung bình tạm tính từ các cột đã nhập, chưa phải điểm tổng kết cuối cùng.',
        },
    };
    });

    res.status(200).json(result);
} catch (error) {
    console.error('Lỗi khi lấy danh sách môn học:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
}
};