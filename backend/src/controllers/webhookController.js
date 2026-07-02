import crypto from 'crypto';
import { executeBookingCore } from './bookingController.js';
import Booking from '../models/Booking.js';

export const handleRazorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // 1. Verify the signature
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    return res.status(400).send('Invalid webhook signature');
  }

  // 2. Process the event
  const event = JSON.parse(req.body.toString());

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    
    // Check if we already processed this
    const existing = await Booking.findOne({ paymentId: payment.id });
    if (!existing) {
      // Extract metadata sent during order creation
      const { showId, userId, selectedSeats, amount } = payment.notes;
      
      try {
        await executeBookingCore({
          showId,
          selectedSeats: JSON.parse(selectedSeats),
          amount: amount / 100,
          paymentId: payment.id,
          user: { _id: userId }
        });
        console.log(`Webhook: Successfully booked for payment ${payment.id}`);
      } catch (err) {
        console.error('Webhook: Booking failed', err);
      }
    }
  }

  // 3. Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
};