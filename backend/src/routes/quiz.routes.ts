import { Router } from 'express';
import {
  getTopicQuizzes,
  getQuizQuestions,
  submitQuiz,
  getAttemptHistory,
  getAttemptDetail,
} from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/topics/:topicId/quizzes', getTopicQuizzes);
router.get('/quizzes/:quizId/questions', getQuizQuestions);
router.post('/quizzes/:quizId/submit', submitQuiz);
router.get('/quiz-attempts/history', getAttemptHistory);
router.get('/quiz-attempts/:id', getAttemptDetail);

export default router;