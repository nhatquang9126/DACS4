import { Router } from 'express';
import { getMyTasks, createTask, updateTaskStatus } from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate); // Bảo vệ toàn bộ route task

router.get('/', getMyTasks);
router.post('/', createTask);
router.patch('/:id/status', updateTaskStatus);

export default router;