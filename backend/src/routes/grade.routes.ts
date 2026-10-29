import { Router } from 'express';
import { addGradeComponent, updateGradeComponent, deleteGradeComponent } from '../controllers/grade.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/components', addGradeComponent);
router.patch('/components/:id', updateGradeComponent);
router.delete('/components/:id', deleteGradeComponent);

export default router;