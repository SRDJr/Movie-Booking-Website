import express from 'express';
import { createShow, getShowsByMovie, getShowDetails, getActiveMoviesByCity } from '../controllers/showController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.get('/active-movies', getActiveMoviesByCity);  // List Movies for a city
router.get('/movie/:movieId', getShowsByMovie); // List shows for a movie
router.get('/:id', getShowDetails);             // Get seat map for a specific show

// Admin
router.post('/', protect, admin, createShow);

export default router;