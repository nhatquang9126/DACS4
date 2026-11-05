import { Router } from 'express';
import { getDashboardKPI, getUserGrowthChart, getStudyActivityChart } from '../controllers/dashboard.controller';
// AI Monitor
import {
  getAIHealth,
  getAIStats,
  getAIRiskDistribution,
  getAILogs,
  getAIConfig,
  updateAIConfig,
} from '../controllers/aiMonitor.controller';

// System Health & Backup
import { getSystemHealth, triggerBackup } from '../controllers/system.controller';

// Audit Logs
import { getAuditLogs } from '../controllers/auditLog.controller';

// Notifications
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  publishNotification,
} from '../controllers/notification.controller';

// Topic Sections
import {
  getSections,
  getSectionsByTopic,
  getSectionById,
  getSectionCascadeInfo,
  createSection,
  updateSection,
  deleteSection,
} from '../controllers/section.controller';
import {
  // Courses
  getCourses,
  getCourseOptions,
  getCourseById,
  getCourseCascadeInfo,
  createCourse,
  updateCourse,
  deleteCourse,

  // Topics
  getTopics,
  getTopicsByCourse,
  getTopicById,
  getTopicCascadeInfo,
  createTopic,
  updateTopic,
  deleteTopic,

  // Materials
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,

  // Users
  getUsers,
  getUserById,
  getUserCascadeInfo,
  createUser,
  updateUser,
  deleteUser,

  // Quizzes
  getQuizzes,
  getQuizById,
  getQuizCascadeInfo,
  createQuiz,
  updateQuiz,
  deleteQuiz,

  // Questions
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,

  // Analytics & Monitoring
  getStudentsOverview,
  getAdminAnalytics,
} from '../controllers/admin.controller';
import { lockUser, changeUserRole, softDeleteUser } from '../controllers/user.controller';
import { verifyAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Toàn bộ router này yêu cầu token hợp lệ và quyền ADMIN
router.use(...verifyAdmin);

// ==========================================
// 1. MÔN HỌC (COURSES)
// ==========================================
router.get('/courses/options', getCourseOptions);
router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.get('/courses/:id/cascade-info', getCourseCascadeInfo);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.patch('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// ==========================================
// 2. CHỦ ĐỀ (TOPICS)
// ==========================================
router.get('/topics-by-course/:courseId', getTopicsByCourse);
router.get('/topics', getTopics);
router.get('/topics/:id', getTopicById);
router.get('/topics/:id/cascade-info', getTopicCascadeInfo);
router.post('/topics', createTopic);
router.put('/topics/:id', updateTopic);
router.patch('/topics/:id', updateTopic);
router.delete('/topics/:id', deleteTopic);

// ==========================================
// 3. TÀI LIỆU HỌC TẬP (MATERIALS)
// ==========================================
router.get('/materials', getMaterials);
router.get('/materials/:id', getMaterialById);
router.post('/materials', createMaterial);
router.put('/materials/:id', updateMaterial);
router.patch('/materials/:id', updateMaterial);
router.delete('/materials/:id', deleteMaterial);

// ==========================================
// 4. NGƯỜI DÙNG & HỌC VIÊN (USERS)
// ==========================================
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.get('/users/:id/cascade-info', getUserCascadeInfo);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/lock', lockUser);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id/soft', softDeleteUser);

// ==========================================
// 5. BÀI KIỂM TRA (QUIZZES) & CÂU HỎI (QUESTIONS)
// ==========================================
router.get('/quizzes', getQuizzes);
router.get('/quizzes/:id', getQuizById);
router.get('/quizzes/:id/cascade-info', getQuizCascadeInfo);
router.post('/quizzes', createQuiz);
router.put('/quizzes/:id', updateQuiz);
router.patch('/quizzes/:id', updateQuiz);
router.delete('/quizzes/:id', deleteQuiz);

router.get('/questions', getQuestions);
router.get('/questions/:id', getQuestionById);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.patch('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// ==========================================
// 6. GIÁM SÁT & THỐNG KÊ (ANALYTICS)
// ==========================================
router.get('/students', getStudentsOverview);
router.get('/analytics', getAdminAnalytics);

// ==========================================
// 7. DASHBOARD KPI
// ==========================================
router.get('/dashboard/kpi', getDashboardKPI);
router.get('/dashboard/charts/user-growth', getUserGrowthChart);
router.get('/dashboard/charts/study-activity', getStudyActivityChart);

// ==========================================
// 8. AI MONITOR
// ==========================================
router.get('/ai-monitor/health', getAIHealth);
router.get('/ai-monitor/stats', getAIStats);
router.get('/ai-monitor/risk-distribution', getAIRiskDistribution);
router.get('/ai-monitor/logs', getAILogs);
router.get('/ai-monitor/config', getAIConfig);
router.put('/ai-monitor/config/:key', updateAIConfig);

// ==========================================
// 9. AUDIT LOGS
// ==========================================
router.get('/audit-logs', getAuditLogs);

// ==========================================
// 10. NOTIFICATIONS
// ==========================================
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);
router.put('/notifications/:id', updateNotification);
router.delete('/notifications/:id', deleteNotification);
router.post('/notifications/:id/publish', publishNotification);

// ==========================================
// 11. TOPIC SECTIONS
// ==========================================
router.get('/sections', getSections);
router.get('/sections-by-topic/:topicId', getSectionsByTopic);
router.get('/sections/:id', getSectionById);
router.get('/sections/:id/cascade-info', getSectionCascadeInfo);
router.post('/sections', createSection);
router.put('/sections/:id', updateSection);
router.patch('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

// ==========================================
// 12. SYSTEM MANAGEMENT
// ==========================================
router.get('/system/health', getSystemHealth);
router.post('/system/backup', triggerBackup);

export default router;
