import { Router } from 'express';
import {
  chatWithTutor,
  explainConcept,
  getChatSessions,
  getSessionMessages,
  generateQuestions
} from '../controllers/tutor.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/tutor/chat', chatWithTutor);
router.post('/tutor/explain', explainConcept);
router.get('/tutor/sessions', getChatSessions);
router.get('/tutor/sessions/:id/messages', getSessionMessages);
router.post('/tutor/generate-questions', generateQuestions);

export default router;