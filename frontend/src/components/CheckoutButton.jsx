import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { loadRazorpayScript } from '../services/loadScript';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const CheckoutButton = ({ showId, selectedSeats, userDetails, isDonating }) => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
            const orderResponse = await api.post(
                '/payments/create-order',
                { showId, selectedSeats, isDonating },
                { headers: { Authorization: `Bearer ${userDetails.token}` } }
            );

            const { order_id, amount, currency } = orderResponse.data;

            // 3. Configure the Razorpay Modal
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use process.env.REACT_APP_RAZORPAY_KEY_ID if using Create React App
                amount: amount.toString(),
                currency: currency,
                name: 'CineMatch', // Replace with your actual app name
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
                        selectedSeats,
                        isDonating
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
                    color: '#16a34a', // Tailwind blue-500 or any brand color
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
            const verifyRes = await api.post(
                '/payments/verify-payment-order',
                paymentData,
                { headers: { Authorization: `Bearer ${userDetails.token}` } }
            );

            if (verifyRes.data.success) {
                alert('Payment Successful! Ticket Booked.');
                // Redirect user to "My Bookings" page here
                if (verifyRes.data.success) {
                    toast.success("Payment successful! Your tickets are booked.");
                    // DESTROY THE LOCK AND TIMERS
                    sessionStorage.removeItem('active_checkout');
                    localStorage.removeItem('checkout_timer_expiry');
                    navigate('/my-bookings', { replace: true });
                }
            }
        } catch (error) {
            // 🛑 ERROR CATCH: Timer expired while Razorpay was open
            const errorMsg = error.response?.data?.message || 'Ticket generation failed.';

            if (errorMsg.includes('refund') || errorMsg.includes('expired')) {
                // Show the specific refund message to calm the user down
                toast.error(errorMsg, { autoClose: 10000 });
                navigate(`/seat-selection/${showId}`);
            } else {
                toast.error(errorMsg);
            }
        }
    };

    return (
        <button
            onClick={displayRazorpay}
            disabled={loading || selectedSeats.length === 0}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-sm hover:bg-green-700 disabled:bg-gray-400 transition-colors active:scale-95"
        >
            {loading ? 'Processing...' : 'Pay Now'}
        </button>
    );
};

export default CheckoutButton;