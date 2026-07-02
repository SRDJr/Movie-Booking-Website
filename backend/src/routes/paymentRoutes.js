import express from 'express';
import { createRazorpayOrder } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming you have this

const router = express.Router();

router.post('/create-order', protect, createRazorpayOrder);

export default router;