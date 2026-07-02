import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

// Dummy Razorpay payload
const payload = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_test_12345',
        notes: {
          showId: 'dummy_show_id',
          userId: 'dummy_user_id',
          selectedSeats: JSON.stringify([{ row: 0, col: 1 }]),
          amount: 50000 // In paise (500 INR)
        }
      }
    }
  }
};

// Generate the valid cryptographic signature
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

console.log('Sending Webhook with Valid Signature:', signature);

// Fire the request directly to your local server
fetch('http://localhost:5000/api/payments/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature
  },
  body: JSON.stringify(payload)
})
  .then(async (res) => {
    console.log(`Status Code: ${res.status}`);
    const data = await res.json();
    console.log('Server Response:', data);
  })
  .catch((err) => console.error('Request failed:', err));