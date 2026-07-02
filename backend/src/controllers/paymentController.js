import { razorpayInstance } from '../config/razorpay.js';
import Show from '../models/Show.js';
import crypto from 'crypto';
import { createBooking } from './bookingController.js'; 
import { calculateFinalPrice } from '../utils/finalPriceCalculator.js';

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  const { showId, selectedSeats } = req.body;

  try {
    // 1. Calculate the exact amount on the backend (Never trust the frontend price!)
    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ message: 'Show not found' });

    let totalAmount = 0;
    selectedSeats.forEach(reqSeat => {
      const dbSeat = show.seats.find(s => s.row === reqSeat.row && s.col === reqSeat.col);
      if (dbSeat) totalAmount += dbSeat.price;
    });

    const finalAmountInPaise = calculateFinalPrice(totalAmount);
    // Razorpay requires a minimum of 1 INR (100 paise)
    if (finalAmountInPaise < 10) {
      return res.status(400).json({ message: 'Amount must be at least ₹1' });
    }

    // 2. Create the order configuration
    const options = {
      amount: finalAmountInPaise * 100, // Convert Rupees to Paise
      currency: 'INR',
      receipt: `receipt_${req.user._id}_${Date.now()}`, // Unique receipt string
      notes: {
        // Storing this metadata helps if we need to trace the transaction later
        showId: showId,
        userId: req.user._id.toString(),
        seatsCount: selectedSeats.length
      }
    };

    // 3. Call Razorpay to generate the Order ID
    const order = await razorpayInstance.orders.create(options);

    // 4. Send the critical order details back to the frontend
    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

// @desc    Verify Razorpay Payment Signature and finalize ticket
// @route   POST /api/payments/verify-payment
// @access  Private
export const verifyPaymentSignature = async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    showId, 
    selectedSeats 
  } = req.body;

  try {
    // 1. Verify payment authenticity via HMAC-SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid signature. Payment verification failed.' 
      });
    }

    // 2. Signature matches! Let's calculate the amount to fulfill the core engine criteria
    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ message: 'Associated show records missing' });

    let baseAmount = 0;
    selectedSeats.forEach(reqSeat => {
      const dbSeat = show.seats.find(s => s.row === reqSeat.row && s.col === reqSeat.col);
      if (dbSeat) baseAmount += dbSeat.price;
    });

    const finalCalculatedAmount = calculateFinalPrice(baseAmount);
    // 3. Directly call the transactional booking system inside the backend!
    const { booking } = await createBooking({
      showId,
      selectedSeats,
      amount: finalCalculatedAmount,
      paymentId: razorpay_payment_id,
      user: req.user // Pass the authenticated user session context
    });

    // 4. Return both verification and booking confirmation to the React client
    return res.status(200).json({ 
      success: true, 
      message: 'Payment verified and ticket secured successfully!',
      booking
    });

  } catch (error) {
    console.error('Signature Verification & Booking Failure:', error);
    // Gracefully separate booking engine errors from global network crashes
    if (error.message.includes('seats are not held by you')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during final processing.' });
  }
};