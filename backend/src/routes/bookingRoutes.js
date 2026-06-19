import express from 'express';
import { createBooking, getMyBookings, verifyBeforePayment } from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.post('/verify', protect, verifyBeforePayment);
router.get('/mybookings', protect, getMyBookings);

export default router;