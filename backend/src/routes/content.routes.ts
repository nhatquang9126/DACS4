import { Router } from 'express';
import { getCourseTopics, getTopicMaterials, getMaterialDetail } from '../controllers/content.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/courses/:courseId/topics', getCourseTopics);
router.get('/topics/:topicId/materials', getTopicMaterials);
router.get('/materials/:id', getMaterialDetail);

export default router;