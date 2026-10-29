import { Router } from 'express';
import {
  getTopicMastery,
  getCurrentStudyPlan,
  generateStudyPlan,
  updatePlanItemStatus
} from '../controllers/learning.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/topics/:topicId/mastery', getTopicMastery);
router.get('/study-plans/current', getCurrentStudyPlan);
router.post('/study-plans/generate', generateStudyPlan);
router.patch('/study-plans/items/:id/status', updatePlanItemStatus);

export default router;