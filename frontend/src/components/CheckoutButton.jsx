import React, { useState } from 'react';
import axios from 'axios';
import { loadRazorpayScript } from '../services/loadScript'; // Adjust path as needed

const CheckoutButton = ({ showId, selectedSeats, userDetails }) => {
  const [loading, setLoading] = useState(false);

  const displayRazorpay = async () => {
    setLoading(true);

    try {
      // 1. Load the Razorpay SDK dynamically
      const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      
      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        setLoading(false);
        return;
      }

      // 2. Call your backend to create the Order (Step 1)
      // Make sure your Axios instance passes the authorization token!
      const orderResponse = await axios.post(
        '/api/payments/create-order', 
        { showId, selectedSeats },
        { headers: { Authorization: `Bearer ${userDetails.token}` } } 
      );

      const { order_id, amount, currency } = orderResponse.data;

      // 3. Configure the Razorpay Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use process.env.REACT_APP_RAZORPAY_KEY_ID if using Create React App
        amount: amount.toString(),
        currency: currency,
        name: 'The Blog Xpress Ticketing', // Replace with your actual app name
        description: 'Movie Ticket Booking',
        order_id: order_id, 
        
        // 4. The Success Handler
        handler: async function (response) {
          // This function runs when the payment is successful in the modal
          const paymentData = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            showId,
            selectedSeats
          };

          // Proceed to Step 3: Verify Signature on the backend
          await verifyPayment(paymentData);
        },
        
        // Prefill user data so they don't have to type it again
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone || '9999999999', 
        },
        theme: {
          color: '#3b82f6', // Tailwind blue-500 or any brand color
        },
      };

      // 5. Open the modal
      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response) {
        console.error('Payment Failed:', response.error);
        alert(`Payment Failed: ${response.error.description}`);
      });

      paymentObject.open();

    } catch (error) {
      console.error('Checkout Error:', error);
      alert('Something went wrong during checkout initialization.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to send the success data back to your server (Step 3)
  const verifyPayment = async (paymentData) => {
    try {
      // We will build this endpoint in Step 3!
      const verifyRes = await axios.post(
        '/api/payments/verify-payment', 
        paymentData,
        { headers: { Authorization: `Bearer ${userDetails.token}` } }
      );

      if (verifyRes.data.success) {
        alert('Payment Successful! Ticket Booked.');
        // Redirect user to "My Bookings" page here
      }
    } catch (error) {
      console.error('Verification Error:', error);
      alert('Payment succeeded, but ticket generation failed. Please contact support.');
    }
  };

  return (
    <button 
      onClick={displayRazorpay} 
      disabled={loading || selectedSeats.length === 0}
      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-bold"
    >
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
};

export default CheckoutButton;