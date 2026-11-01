import { Router } from 'express';
import {
  getDueFlashcards,
  getAllFlashcards,
  createFlashcard,
  reviewFlashcard,
  deleteFlashcard,
} from '../controllers/flashcard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/due', getDueFlashcards);
router.get('/', getAllFlashcards);
router.post('/', createFlashcard);
router.post('/:id/review', reviewFlashcard);
router.delete('/:id', deleteFlashcard);

export default router;

