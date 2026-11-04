import { Router } from 'express';
import {
  getCourseCatalog,
  enrollCourse,
  getMyEnrollments,
  getLearningGoals,
  getCourseDetail,
} from '../controllers/course.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/catalog', getCourseCatalog);
router.post('/enroll', enrollCourse);
router.get('/my-courses', getMyEnrollments);
router.get('/goals', getLearningGoals);
router.get('/:id', getCourseDetail);

export default router;