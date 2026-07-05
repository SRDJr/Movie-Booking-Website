import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CheckoutButton from '../components/CheckoutButton';

const PaymentSummary = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. EXTRACT VARIABLES
    const {
        showDetails,
        selectedSeats,
        basePrice,
        userDetails
    } = location.state || {};

    // 2. STATE DECLARATIONS
    const [isPolicyOpen, setIsPolicyOpen] = useState(false);
    const [isDonating, setIsDonating] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // UI visual timer
    const [isExpired, setIsExpired] = useState(false); // New state to trigger the fallback UI

    // 3. PERSISTENT TIMER LOGIC
    useEffect(() => {
        if (!showDetails?._id) return; // Safety check

        // Create a unique storage key for this specific booking session
        const timerKey = `booking_timer_${showDetails._id}`;
        let expiryTime = sessionStorage.getItem(timerKey);

        if (!expiryTime) {
            // First time landing on this page: Set expiry to exactly 5 minutes from now
            expiryTime = Date.now() + 5 * 60 * 1000;
            sessionStorage.setItem(timerKey, expiryTime);
        }

        // 1. Declare the variable up here so the function can see it
        let intervalId; 

        const updateTimer = () => {
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

            setTimeLeft(remainingSeconds);

            if (remainingSeconds === 0) {
                setIsExpired(true); 
                sessionStorage.removeItem(timerKey); 
                
                // 2. Safely check if it exists before clearing
                if (intervalId) clearInterval(intervalId); 
            }
        };

        // Run immediately, then check every second
        updateTimer();
        
        // 3. Assign the setInterval to the variable we declared earlier
        intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [showDetails]);

    // 4. THE SAFETY NET (Now includes the expiration check)
    if (!showDetails || !selectedSeats || !Array.isArray(selectedSeats) || isExpired) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    {isExpired
                        ? "Your session has expired. Seats have been released."
                        : "No seats selected or session invalid."}
                </h2>
                <button
                    // Using an explicit path here instead of navigate(-1) so if they refreshed, it doesn't break
                    onClick={() => navigate(`/seat-selection/${showDetails?._id || ''}`)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 transition-colors"
                >
                    Return to Seat Selection
                </button>
            </div>
        );
    }

    // --- Pricing Logic ---
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const websiteFee = basePrice * 0.05;
    const websiteGST = websiteFee * 0.18;
    const subTotal = basePrice + websiteFee + websiteGST;

    const razorpayFee = subTotal * 0.02;
    const razorpayGST = razorpayFee * 0.18;

    const totalConvenienceFee = websiteFee + razorpayFee;
    const totalTaxes = websiteGST + razorpayGST;

    // Optional ₹2 donation
    const donationAmount = isDonating ? 2 : 0;
    const finalTotal = Math.round(subTotal + razorpayFee + razorpayGST) + donationAmount;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Top Warning/Timer Bar */}
            <div className="bg-red-50 text-red-600 text-center py-2 font-semibold text-sm shadow-sm">
                Please complete your payment within {formatTime(timeLeft)}
            </div>

            <div className="max-w-3xl mx-auto p-4 mt-4 space-y-6">

                {/* TOP BOX: Show Details */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 relative">
                    <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                        {selectedSeats.length} Ticket{selectedSeats.length > 1 ? 's' : ''}
                    </div>
                    <img
                        src={showDetails.posterUrl}
                        alt="Movie Poster"
                        className="w-24 h-36 object-cover rounded-md shadow-sm"
                    />
                    <div className="flex flex-col justify-center space-y-1 pr-16">
                        <h2 className="text-xl font-bold text-gray-900">{showDetails.movieTitle}</h2>
                        <p className="text-sm text-gray-600 font-medium">
                            {showDetails.date} • {showDetails.time}
                        </p>
                        <p className="text-sm text-gray-700 mt-2">
                            <span className="font-semibold text-gray-900">Seats:</span> {selectedSeats.map(s => `${String.fromCharCode(65 + s.row)}${s.col + 1}`).join(', ')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            <span className="font-semibold text-gray-800">{showDetails.theaterName}</span> - Screen {showDetails.screenNumber}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                            {showDetails.address}, {showDetails.city}
                        </p>
                    </div>
                </div>

                {/* MIDDLE BOX: Pricing Summary */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Booking Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-gray-700">
                            <span>Total Base Price (x{selectedSeats.length})</span>
                            <span className="font-medium">₹{basePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Convenience Fee (Platform & Gateway)</span>
                            <span>₹{totalConvenienceFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 border-b pb-3">
                            <span>Taxes (GST)</span>
                            <span>₹{totalTaxes.toFixed(2)}</span>
                        </div>

                        {/* Social Impact Checkbox */}
                        <div className="flex items-center justify-between py-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100 mt-2">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="donate"
                                    checked={isDonating}
                                    onChange={(e) => setIsDonating(e.target.checked)}
                                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="donate" className="text-sm text-gray-700 cursor-pointer">
                                    <span className="font-bold text-gray-900 block">Add ₹2 to your order</span>
                                    Support AASRA in providing education to underprivileged children.
                                </label>
                            </div>
                            <span className="font-medium text-gray-900">₹2.00</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 text-lg font-extrabold text-gray-900">
                            <span>Order Total</span>
                            <span>₹{finalTotal}</span>
                        </div>
                    </div>
                </div>

                {/* ACCORDION: Cancellation Policy in PaymentSummary.jsx */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <button
                        onClick={() => setIsPolicyOpen(!isPolicyOpen)}
                        className="w-full p-4 text-left flex justify-between items-center focus:outline-none hover:bg-gray-50 transition-colors"
                    >
                        <span className="font-semibold text-gray-800">Cancellation Policy</span>
                        <span className="text-gray-500 text-xl">{isPolicyOpen ? '−' : '+'}</span>
                    </button>

                    {isPolicyOpen && (
                        <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-100 space-y-2">
                            <p>• Cancellations are not permitted less than 1 hour before the showtime.</p>
                            <p>• <span className="font-semibold">48+ hours before show:</span> 75% of Base Price refunded.</p>
                            <p>• <span className="font-semibold">12 - 48 hours before show:</span> 50% of Base Price refunded.</p>
                            <p>• <span className="font-semibold">1 - 12 hours before show:</span> 25% of Base Price refunded.</p>
                            <p className="text-red-500 mt-2 text-xs font-semibold">• Note: Platform convenience fees and taxes are strictly non-refundable.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* FIXED BOTTOM BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 px-6 z-50">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</span>
                        <span className="text-2xl font-extrabold text-blue-600">₹{finalTotal}</span>
                    </div>

                    {/* MODULAR COMPONENT INTEGRATION */}
                    <CheckoutButton
                        showId={showDetails._id}
                        selectedSeats={selectedSeats}
                        userDetails={userDetails}
                        finalTotal={finalTotal}
                        isDonating={isDonating}
                    />
                </div>
            </div>
        </div>
    );
};

export default PaymentSummary;