import express from 'express';
import { createBooking, getMyBookings, verifyBeforePayment } from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/verify', protect, verifyBeforePayment);
router.get('/mybookings', protect, getMyBookings);
router.put('/:id/cancel', protect, cancelBooking);

export default router;