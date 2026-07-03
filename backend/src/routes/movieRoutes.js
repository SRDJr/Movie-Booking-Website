import express from 'express';
import {
  searchRemoteMovies,
  importMovie,
  getMovies,
  getMovieById
} from '../controllers/movieController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Route
router.get('/', getMovies);

// Admin Routes (Protected)
router.get('/search', protect, admin, searchRemoteMovies);
router.post('/import', protect, admin, importMovie);

// Public Route
router.get('/:id', getMovieById);

export default router;