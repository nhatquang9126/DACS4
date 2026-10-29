import { Router } from 'express';
import {
  startStudySession,
  finishStudySession,
  getStudySessionHistory,
  getLearningStatistics,
} from '../controllers/session.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/study-sessions', startStudySession);
router.patch('/study-sessions/:id/finish', finishStudySession);
router.get('/study-sessions/history', getStudySessionHistory);
router.get('/learning/statistics', getLearningStatistics);

export default router;