import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import CancellationPolicy from '../components/CancellationPolicy';
import { QRCodeSVG } from 'qrcode.react';

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'
    const [bookingToCancel, setBookingToCancel] = useState(null);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            const { data } = await api.get('/bookings/mybookings');
            setBookings(data);
        } catch (error) {
            toast.error('Failed to load bookings.');
        } finally {
            setLoading(false);
        }
    };

    const executeCancel = async () => {
        if (!bookingToCancel) return;

        try {
            const { data } = await api.put(`/bookings/${bookingToCancel}/cancel`);
            toast.success(data.message);
            loadBookings();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cancellation failed.');
        } finally {
            // Close the modal whether it succeeds or fails
            setBookingToCancel(null);
        }
    };

    // --- FILTERING LOGIC ---
    const now = new Date();

    const upcomingBookings = bookings.filter(b =>
        b.status === 'Confirmed' && new Date(b.showSnapshot.startTime) > now
    );

    const pastBookings = bookings.filter(b =>
        b.status === 'Confirmed' && new Date(b.showSnapshot.startTime) <= now
    );

    const cancelledBookings = bookings.filter(b => b.status === 'Cancelled');

    const getDisplayedBookings = () => {
        if (activeTab === 'upcoming') return upcomingBookings;
        if (activeTab === 'past') return pastBookings;
        if (activeTab === 'cancelled') return cancelledBookings;
        return [];
    };

    const displayedBookings = getDisplayedBookings();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading your tickets...</div>;
    }

    return (
        <>
            <div className="container mx-auto px-4 py-8 max-w-5xl mb-24">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">My Bookings</h1>

                {/* TABS */}
                <div className="flex space-x-4 border-b mb-6">
                    {['upcoming', 'past', 'cancelled'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 px-1 capitalize font-medium transition-colors ${activeTab === tab
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab} ({
                                tab === 'upcoming' ? upcomingBookings.length :
                                    tab === 'past' ? pastBookings.length :
                                        cancelledBookings.length
                            })
                        </button>
                    ))}
                </div>

                {/* BOOKINGS LIST */}
                {displayedBookings.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                        <p className="text-gray-500">No {activeTab} bookings found.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {displayedBookings.map((booking) => {
                            // Safely fallback to snapshot if populate fails or show is deleted
                            const posterUrl = booking.show?.movie?.posterUrl || '/placeholder-movie.jpg';
                            const movieTitle = booking.show?.movie?.title || booking.showSnapshot.movieTitle;
                            const theaterName = booking.showSnapshot.theaterName;
                            const theaterAddress = booking.show?.theater
                                ? `${booking.show.theater.location.address}, ${booking.show.theater.location.city}`
                                : 'Address not available';

                            const showTime = new Date(booking.showSnapshot.startTime);

                            // Calculate if cancellation is allowed (more than 1 hr before)
                            const hoursUntilShow = (showTime - now) / (1000 * 60 * 60);
                            const canCancel = activeTab === 'upcoming' && hoursUntilShow > 1;
                            // QR code for M-Ticket
                            const qrHash = btoa(booking.paymentId || booking._id);

                            return (
                                <div key={booking._id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col md:flex-row">

                                    {/* Poster Section */}
                                    <div className="w-full md:w-48 h-64 md:h-auto bg-gray-200 flex-shrink-0">
                                        <img src={posterUrl} alt={movieTitle} className="w-full h-full object-cover" />
                                    </div>

                                    {/* Details Section */}
                                    <div className="p-6 flex-grow flex flex-col justify-between">

                                        {/* Title and ID Row */}
                                        <div className="flex justify-between items-start mb-4">
                                            <h2 className="text-2xl font-bold text-gray-800">{movieTitle}</h2>
                                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-mono">
                                                ID: {booking._id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>

                                        {/* FULL-WIDTH VENUE INFO */}
                                        <div className="mb-4">
                                            <p className="text-gray-800 font-bold text-lg">{theaterName}</p>
                                            <p className="text-sm text-gray-500 leading-relaxed">{theaterAddress}</p>
                                        </div>

                                        {/* TWO-COLUMN DETAILS & TICKET SECTION */}
                                        <div className="flex justify-between items-start mb-4">

                                            {/* Left Column: Date, Screen, Seats */}
                                            <div className="flex-grow pr-3 sm:pr-4">

                                                {/* Date & Screen */}
                                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                                                    <div>
                                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Date & Time</p>
                                                        <p className="font-semibold text-gray-800">
                                                            {showTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {showTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Screen</p>
                                                        <p className="font-semibold text-gray-800">Screen {booking.showSnapshot.screenNumber}</p>
                                                    </div>
                                                </div>

                                                {/* Seats */}
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Seats</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {booking.seats.map((seat, idx) => (
                                                            <span key={idx} className="bg-blue-50 text-blue-700 text-sm font-bold px-3 py-1 rounded border border-blue-200">
                                                                {seat.seatNumber}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column: QR Code M-Ticket */}
                                            {activeTab !== 'cancelled' && (
                                                <div className="flex-shrink-0 flex flex-col items-center justify-center p-2 sm:p-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mt-1 sm:mt-0">
                                                    <div className="bg-white p-1.5 sm:p-2 rounded-lg shadow-sm mb-1 sm:mb-2">
                                                        <QRCodeSVG
                                                            value={qrHash}
                                                            className="w-16 h-16 sm:w-20 sm:h-20"
                                                            level="L"
                                                            includeMargin={false}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">M-Ticket</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Row: Actions */}
                                        <div className="mt-2 pt-4 border-t flex items-center justify-between">
                                            <div className="flex items-center gap-8">
                                                <div>
                                                    <p className="text-sm text-gray-500">Total Amount</p>
                                                    <p className={`text-xl font-bold ${activeTab === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                        ₹{booking.totalAmount}
                                                    </p>
                                                </div>

                                                {/* NEW: Refund Details (Only shows on cancelled tab) */}
                                                {activeTab === 'cancelled' && (
                                                    <div>
                                                        <p className="text-sm text-gray-500">
                                                            Refund Amount
                                                        </p>
                                                        <p className="text-xl font-bold text-green-600">
                                                            ₹{booking.refundAmount || 0}
                                                        </p>
                                                        {/* Optional micro-text to reduce customer support tickets */}
                                                        {booking.refundAmount > 0 && (
                                                            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                                                Usually credits in 5-7 days
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            {activeTab === 'upcoming' && (
                                                <button
                                                    onClick={() => setBookingToCancel(booking._id)}
                                                    disabled={!canCancel}
                                                    className={`px-6 py-2 rounded-md font-semibold transition-colors ${canCancel
                                                        ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                                                        : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {canCancel ? 'Cancel Booking' : 'Cancellation Closed'}
                                                </button>
                                            )}

                                            {activeTab === 'cancelled' && (
                                                <span className="text-red-600 font-semibold flex items-center bg-red-50 px-4 py-2 rounded-md">
                                                    Cancelled
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* CANCELLATION CONFIRMATION MODAL */}
            {
                bookingToCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 overflow-hidden">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Ticket?</h3>
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to cancel this booking? This action cannot be undone and your seats will be released immediately.
                            </p>

                            {/* Your new Reusable Component */}
                            <CancellationPolicy />

                            {/* Action Buttons */}
                            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                                <button
                                    onClick={() => setBookingToCancel(null)}
                                    className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    Exit
                                </button>
                                <button
                                    onClick={executeCancel}
                                    className="px-5 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Confirm Cancellation
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default MyBookings;