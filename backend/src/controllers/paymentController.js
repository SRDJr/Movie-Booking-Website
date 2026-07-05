import { razorpayInstance } from '../config/razorpay.js';
import Show from '../models/Show.js';
import crypto from 'crypto';
import { createBooking } from './bookingController.js';
import { calculateFinalPrice } from '../utils/finalPriceCalculator.js';

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
    const { showId, selectedSeats, isDonating } = req.body;

    try {
        // 1. Calculate the exact amount on the backend (Never trust the frontend price!)
        const show = await Show.findById(showId);
        if (!show) return res.status(404).json({ message: 'Show not found' });

        let totalAmount = 0;
        selectedSeats.forEach(reqSeat => {
            const dbSeat = show.seats.find(s => s.row === reqSeat.row && s.col === reqSeat.col);
            if (dbSeat) totalAmount += show.pricing[dbSeat.type];
        });

        const finalAmount = calculateFinalPrice(totalAmount) + ((isDonating) ? 2 : 0);

        // Razorpay requires a minimum of 1 INR (100 paise)
        if (finalAmount < 1) {
            return res.status(400).json({ message: 'Amount must be at least ₹1' });
        }

        // 2. Create the order configuration
        const options = {
            amount: finalAmount * 100, // Convert Rupees to Paise
            currency: 'INR',
            receipt: `Rcpt-${req.user._id}_${Math.floor(Date.now() / 1000)}`, // Unique receipt string
            notes: {
                // Storing this metadata helps if we need to trace the transaction later
                showId: showId,
                userId: req.user._id.toString(),
                seatsCount: selectedSeats.length
            }
        };

        // console.log("SENDING TO RAZORPAY:", {
        //     key_id: process.env.RAZORPAY_KEY_ID,
        //     key_secret: process.env.RAZORPAY_KEY_SECRET
        // });
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
        selectedSeats,
        isDonating
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
            if (dbSeat) baseAmount += show.pricing[dbSeat.type];
        });

        const finalCalculatedAmount = calculateFinalPrice(baseAmount) + ((isDonating) ? 2 : 0);
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

        if (error.message.includes('seats are not held by you') || error.message.includes('expired')) {
            console.log(`Session expired! Initiating calculated partial refund for payment: ${razorpay_payment_id}`);

            try {
                // 1. Fetch the payment from Razorpay to get the final amount captured (y) in paise
                const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
                const totalAmountPaidInPaise = payment.amount;

                // 2. Reverse-calculate to remove Razorpay's fee + GST using your exact math
                // x = y / 1.0839924
                const baseAmountInPaise = Math.round(totalAmountPaidInPaise / 1.0839924);
                const refundAmountInPaise = Math.round(baseAmountInPaise * 1.059);
                // 3. Issue the refund using your existing instance and formatting
                await razorpayInstance.payments.refund(razorpay_payment_id, {
                    amount: refundAmountInPaise,
                    notes: {
                        reason: 'Session expired during checkout',
                        showId: showId.toString()
                    }
                });

                return res.status(400).json({
                    success: false,
                    message: 'Session expired. Your seats were released. A partial refund (excluding gateway fees) has been initiated and will reflect in your account within 3-5 business days.'
                });
            } catch (refundError) {
                console.error("Critical: Refund failed!", refundError);
                return res.status(500).json({
                    success: false,
                    message: 'Session expired. Payment captured but automatic refund failed. Please contact support.'
                });
            }
        }

        // Catch-all for other server/database crashes
        res.status(500).json({ message: 'Server error during final processing.' });
    }
};