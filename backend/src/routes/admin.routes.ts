import { Router } from 'express';
import {
  createCourse,
  createTopic,
  createMaterial,
  createQuiz,
  createQuestion,
  getStudentsOverview,
  getAdminAnalytics,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Toàn bộ router này yêu cầu token hợp lệ và role ADMIN
router.use(authenticate, authorize(['ADMIN']));

// Quản lý Môn học, Chủ đề, Bài giảng, Quiz
router.post('/courses', createCourse);
router.post('/topics', createTopic);
router.post('/materials', createMaterial);
router.post('/quizzes', createQuiz);
router.post('/questions', createQuestion);

// Giám sát sinh viên & Thống kê toàn trường
router.get('/students', getStudentsOverview);
router.get('/analytics', getAdminAnalytics);

export default router;

