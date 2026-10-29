import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import courseRoutes from './routes/course.routes';
import gradeRoutes from './routes/grade.routes';
import aiRoutes from './routes/ai.routes';
import contentRoutes from './routes/content.routes';
import quizRoutes from './routes/quiz.routes';
import learningRoutes from './routes/learning.routes';
import tutorRoutes from './routes/tutor.routes';
import sessionRoutes from './routes/session.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', contentRoutes);
app.use('/api', quizRoutes);
app.use('/api', learningRoutes);
app.use('/api', tutorRoutes);
app.use('/api', sessionRoutes);

app.get('/health', async (req: Request, res: Response) => {
try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', database: 'Connected' });
} catch (error) {
    console.error('Lỗi kết nối CSDL:', error); // Ghi log chi tiết ở server
    res.status(500).json({ status: 'ERROR', message: 'Lỗi máy chủ nội bộ' }); // Chỉ báo lỗi chung cho client
}
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Backend server is running on port ${port}`);
});