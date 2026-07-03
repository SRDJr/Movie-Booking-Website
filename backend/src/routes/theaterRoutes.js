import express from 'express';
import { createTheater, getTheaters, getDistinctCities, getScreenTypes } from '../controllers/theaterController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: Users can search theaters
router.get('/cities', getDistinctCities);
// Protected: Only Admin
router.get('/screen-types', protect, admin, getScreenTypes);
// Public
router.get('/', getTheaters);

// Protected: Only Admin can add theaters
router.post('/', protect, admin, createTheater);

export default router;