import { Router } from 'express';
import { analyzeAndPredictRisk } from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/dashboard-analysis', analyzeAndPredictRisk);

export default router;