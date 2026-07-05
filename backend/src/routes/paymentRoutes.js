import express from 'express';
import { createRazorpayOrder, verifyPaymentSignature } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js'; // Assuming you have this

const router = express.Router();

router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify-payment-order', protect, verifyPaymentSignature);

export default router;