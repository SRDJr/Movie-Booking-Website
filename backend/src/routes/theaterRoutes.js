import express from 'express';
import { createTheater, getTheaters } from '../controllers/theaterController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: Users can search theaters
router.get('/', getTheaters);

// Protected: Only Admin can add theaters
router.post('/', protect, admin, createTheater);

export default router;