import express from 'express';
import { createShow, getShowsByMovie, getShowDetails, getActiveMoviesByCity, getGroupedShows } from '../controllers/showController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.get('/grouped', getGroupedShows);
router.get('/active-movies', getActiveMoviesByCity);  // List Movies for a city

router.get('/movie/:movieId', getShowsByMovie); // List shows for a movie

// Admin
router.post('/', protect, admin, createShow);

// Public
router.get('/:id', getShowDetails);             // Get seat map for a specific show«
export default router;