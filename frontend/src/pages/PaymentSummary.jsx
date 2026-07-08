import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import CheckoutButton from '../components/CheckoutButton';
import CancellationPolicy from '../components/CancellationPolicy';

const PaymentSummary = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showId } = useParams();
    // 1. EXTRACT VARIABLES
    const {
        showDetails,
        selectedSeats,
        basePrice,
        userDetails,
        fromSeatSelection,
        transactionId,
        sessionTimestamp
    } = location.state || {};

    useEffect(() => {
        // KICKOUT RULE: Verify the session storage key matches the state key
        const activeTxn = sessionStorage.getItem('active_checkout');

        if (!fromSeatSelection || !transactionId || transactionId !== activeTxn) {
            navigate(`/seat-selection/${showId}`, { replace: true });
            return;
        }
    }, [fromSeatSelection, transactionId, navigate, showId]);

    // 2. STATE DECLARATIONS
    const [isPolicyOpen, setIsPolicyOpen] = useState(false);
    const [isDonating, setIsDonating] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // UI visual timer
    const [isExpired, setIsExpired] = useState(false); // New state to trigger the fallback UI

    // 3. PERSISTENT TIMER LOGIC
    // useEffect(() => {
    //     if (!showDetails?._id) return; // Safety check

    //     // Create a unique storage key for this specific booking session
    //     const timerKey = `booking_timer_${showDetails._id}`;
    //     let expiryTime = sessionStorage.getItem(timerKey);

    //     if (!expiryTime) {
    //         // First time landing on this page: Set expiry to exactly 5 minutes from now
    //         expiryTime = Date.now() + 5 * 60 * 1000;
    //         sessionStorage.setItem(timerKey, expiryTime);
    //     }

    //     // 1. Declare the variable up here so the function can see it
    //     let intervalId;

    //     const updateTimer = () => {
    //         const now = Date.now();
    //         const remainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

    //         setTimeLeft(remainingSeconds);

    //         if (remainingSeconds === 0) {
    //             setIsExpired(true);
    //             sessionStorage.removeItem(timerKey);

    //             // 2. Safely check if it exists before clearing
    //             if (intervalId) clearInterval(intervalId);
    //         }
    //     };

    //     // Run immediately, then check every second
    //     updateTimer();

    //     // 3. Assign the setInterval to the variable we declared earlier
    //     intervalId = setInterval(updateTimer, 1000);

    //     return () => clearInterval(intervalId);
    // }, [showDetails]);

    useEffect(() => {
        // Safety check: Ensure we have a timestamp
        if (!sessionTimestamp) return;

        // The expiry time is exactly 5 minutes from the millisecond they clicked "Proceed"
        const expiryTime = sessionTimestamp + (5 * 60 * 1000);
        let intervalId;

        const updateTimer = () => {
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

            setTimeLeft(remainingSeconds);

            if (remainingSeconds === 0) {
                setIsExpired(true);
                if (intervalId) clearInterval(intervalId);
            }
        };

        // Run immediately to prevent the 1-second lag
        updateTimer();

        // Check every second
        intervalId = setInterval(updateTimer, 1000);

        // Cleanup on unmount
        return () => clearInterval(intervalId);

    }, [sessionTimestamp]);

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

    // Urgency
    const isOneMinuteLeft = timeLeft <= 60;
    const isThirtySecondsLeft = timeLeft <= 30;

    // Switch from light red to solid alert red at 1 minute
    const bannerClasses = isOneMinuteLeft
        ? "bg-red-600 text-white text-center py-2 font-bold text-sm shadow-md transition-colors duration-500"
        : "bg-red-50 text-red-600 text-center py-2 font-semibold text-sm shadow-sm transition-colors duration-500";

    // Add the heartbeat zoom at 30 seconds
    const timerClasses = isThirtySecondsLeft
        ? "animate-timer-zoom inline-block font-extrabold"
        : "inline-block";

    return (
        <div className="min-h-screen bg-gray-50 pb-64 md:pd-48">
            {/* Top Warning/Timer Bar */}
            <div className={bannerClasses}>
                Please complete your payment within <span className={timerClasses}>{formatTime(timeLeft)}</span>
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
                <CancellationPolicy />
            </div>

            {/* FIXED BOTTOM BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 px-6 z-50">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {/* Info Icon SVG here */}
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                <strong>Important:</strong> Please complete your payment before the timer expires. If the session times out, your seats will be released.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                *In the event of a late payment capture, a refund will be auto-issued, excluding standard gateway processing fees.
                            </p>
                        </div>
                    </div>
                </div>
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