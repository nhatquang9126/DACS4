import { Router } from 'express';
import { getCourseCatalog, enrollCourse, getMyEnrollments } from '../controllers/course.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/catalog', getCourseCatalog);
router.post('/enroll', enrollCourse);
router.get('/my-courses', getMyEnrollments);

export default router;