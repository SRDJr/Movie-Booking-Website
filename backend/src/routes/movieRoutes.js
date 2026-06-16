import express from 'express';
import {
  searchRemoteMovies,
  importMovie,
  getMovies,
} from '../controllers/movieController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Route
router.get('/', getMovies);

// Admin Routes (Protected)
router.get('/search', protect, admin, searchRemoteMovies);
router.post('/import', protect, admin, importMovie);

export default router;