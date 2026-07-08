import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../services/api';
import ProceedButton from '../components/ProceedButton';
import { useAuth } from '../context/AuthContext';

const SeatSelection = () => {
    const { showId } = useParams();
    const navigate = useNavigate();

    const [show, setShow] = useState(null);
    const [seats, setSeats] = useState([]);
    const [socket, setSocket] = useState(null);
    const { user, isAdmin } = useAuth();

    const [maxRows, setMaxRows] = useState(0);
    const [maxCols, setMaxCols] = useState(0);

    const currentUserId = user?._id || user?.id || null;

    useEffect(() => {
        const fetchShowDetails = async () => {
            try {
                const { data } = await api.get(`/shows/${showId}`);
                setShow(data);
                setSeats(data.seats);

                let highestRow = 0;
                let highestCol = 0;
                data.seats.forEach((seat) => {
                    if (seat.row > highestRow) highestRow = seat.row;
                    if (seat.col > highestCol) highestCol = seat.col;
                });

                setMaxRows(highestRow + 1);
                setMaxCols(highestCol + 1);
            } catch (error) {
                console.error("Failed to fetch show details", error);
            }
        };

        fetchShowDetails();
    }, [showId]);

    useEffect(() => {
        const rawToken = localStorage.getItem('token');
        if (!rawToken) return;

        const token = rawToken.replace(/^"(.*)"$/, '$1');

        let socketUrl = import.meta.env.VITE_SOCKET_URL;
        socketUrl = socketUrl.replace(/\/api$/, '');

        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket']
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ FRONTEND: Socket Connected!', newSocket.id);
            newSocket.emit('join_show', showId);
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ FRONTEND CONNECTION ERROR:', err.message);
        });

        newSocket.on('unauthorized', (data) => {
            console.error('🚫 FRONTEND UNAUTHORIZED:', data.message);
        });

        newSocket.on('seat_updated', (updatedSeat) => {
            setSeats((prevSeats) =>
                prevSeats.map((seat) =>
                    seat.row === updatedSeat.row && seat.col === updatedSeat.col
                        ? { ...seat, status: updatedSeat.status, lockedBy: updatedSeat.lockedBy }
                        : seat
                )
            );
        });

        return () => newSocket.disconnect();
    }, [showId]);

    const getRowLabel = (rowIndex) => {
        let label = '';
        let n = rowIndex;
        while (n >= 0) {
            label = String.fromCharCode(65 + (n % 26)) + label;
            n = Math.floor(n / 26) - 1;
        }
        return label;
    };

    const handleSeatClick = (seat) => {
        if (!user) {
            toast.warning('Please login to select seats and book movies.', {
                position: "top-center"
            });
            return;
        }

        if (isAdmin) {
            toast.error('Admin accounts cannot book tickets. Please use a regular account.', {
                position: "top-center"
            });
            return;
        }

        if (!socket) {
            toast.error('Connecting to live seat map... Please wait a moment.', { autoClose: 2000 });
            return;
        }

        const myLockedSeats = seats.filter(s => s.status === 'locked' && s.lockedBy === currentUserId);

        if (seat.status === 'available') {
            if (myLockedSeats.length >= 6) {
                toast.warning('You can only select up to 6 seats per transaction.');
                return;
            }
            socket.emit('request_seat_lock', { showId, row: seat.row, col: seat.col });
        } else if (seat.status === 'locked' && seat.lockedBy === currentUserId) {
            socket.emit('request_seat_unlock', { showId, row: seat.row, col: seat.col });
        } else if (seat.status === 'locked') {
            toast.info('This seat is currently being reviewed by someone else.');
        } else if (seat.status === 'sold') {
            toast.error('This seat is already sold out.');
        }
    };

    const getSeatStyling = (seat) => {
        if (!seat) return 'bg-transparent border border-transparent cursor-default';

        if (seat.status === 'sold') {
            return 'bg-gray-700 border-gray-800 cursor-not-allowed opacity-80';
        }

        if (seat.status === 'locked' && seat.lockedBy !== currentUserId) {
            return 'bg-gray-300 border-gray-400 cursor-not-allowed opacity-60';
        }

        if (seat.status === 'locked' && seat.lockedBy === currentUserId) {
            return 'bg-green-500 border-green-600 shadow-lg ring-2 ring-green-300 ring-offset-1 scale-110 transition-transform';
        }

        switch (seat.type) {
            case 'Platinum': return 'bg-blue-500 hover:bg-blue-400 border-blue-600 cursor-pointer transition-colors';
            case 'Gold': return 'bg-yellow-400 hover:bg-yellow-300 border-yellow-500 cursor-pointer transition-colors';
            case 'Diamond': return 'bg-purple-500 hover:bg-purple-400 border-purple-600 cursor-pointer transition-colors';
            default: return 'bg-gray-200 cursor-pointer';
        }
    };

    const myLockedSeats = seats.filter(s => s.status === 'locked' && s.lockedBy === currentUserId);
    const totalPrice = myLockedSeats.reduce((sum, seat) => {
        const seatPrice = show.pricing?.[seat.type] || 0;
        return sum + seatPrice;
    }, 0);

    const totalBookableSeats = seats.length;
    const availableSeatsCount = seats.filter(s => s.status === 'available').length;
    const availabilityPercentage = totalBookableSeats === 0 ? 0 : Math.round((availableSeatsCount / totalBookableSeats) * 100);

    const gridMatrix = Array.from({ length: maxRows }, () => Array(maxCols).fill(null));
    seats.forEach(seat => {
        if (seat.row !== undefined && seat.col !== undefined) {
            gridMatrix[seat.row][seat.col] = seat;
        }
    });

    if (!show) return <div className="text-center py-20 animate-pulse text-lg">Loading Seat Map...</div>;

    return (
        <div className="relative min-h-screen pb-56 sm:pb-40 bg-white">

            {/* MAIN SEAT GRID AREA */}
            <div className="max-w-7xl mx-auto py-4 sm:py-8 px-4">

                {/* FIX 3: Reverted to flex-row so badge stays strictly on the right side */}
                <div className="flex justify-between items-center mb-6 sm:mb-8 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight truncate">{show.movie?.title}</h2>
                    <span className={`flex-shrink-0 font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm border shadow-sm ${availabilityPercentage > 50 ? 'bg-green-50 text-green-700 border-green-200' :
                        availabilityPercentage > 15 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {availabilityPercentage}% Available
                    </span>
                </div>

                {/* FIX 4: Grid Scrolling. Added a min-w-[600px] wrapper to prevent seats from squishing */}
                <div className="border border-gray-200 shadow-sm p-4 sm:p-10 rounded-2xl overflow-x-auto text-center bg-gray-50">
                    <div className="min-w-[600px] sm:min-w-0 inline-block w-full">
                        <div className="inline-block w-4/5 max-w-2xl h-8 sm:h-10 bg-gradient-to-b from-gray-300 to-gray-200 mb-10 sm:mb-16 rounded-b-[40px] mx-auto flex items-center justify-center text-[10px] sm:text-sm font-bold text-gray-500 tracking-[0.2em] sm:tracking-[0.3em] shadow-inner border border-gray-300">
                            SCREEN THIS WAY
                        </div>

                        <div
                            className="inline-grid gap-y-2 gap-x-9 sm:gap-3 p-4 sm:p-6 bg-white rounded-xl border shadow-sm mx-auto"
                            style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
                        >
                            {gridMatrix.map((row, rIdx) => (
                                row.map((seat, cIdx) => (
                                    <div
                                        key={`${rIdx}-${cIdx}`}
                                        onClick={() => seat && handleSeatClick(seat)}
                                        // Removed the shrinking! Seats will always be 10x10 with consistent spacing
                                        className={`w-7 h-7 sm:w-10 sm:h-10 rounded-t flex-shrink-0 border ${getSeatStyling(seat)} flex items-center justify-center`}
                                        title={seat ? `Row ${getRowLabel(rIdx)}, Col ${cIdx + 1} - ₹${seat.price}` : 'Aisle'}
                                    >
                                        {seat && seat.status === 'available' && (
                                            <span className="text-[0.55rem] font-bold text-white opacity-40">
                                                {cIdx + 1}
                                            </span>
                                        )}
                                    </div>
                                ))
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-3 md:hidden">
                    ← Swipe grid to see more seats →
                </p>
            </div>

            {/* FIXED BOTTOM BAR */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50 p-3 sm:p-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">

                    {/* Horizontal Legend */}
                    <div className="grid grid-cols-3 gap-y-3 gap-x-2 md:flex md:flex-wrap md:items-center md:gap-4 text-[11px] sm:text-sm font-medium text-gray-600 w-full md:w-auto px-10 md:px-0">

                        {/* Hidden on mobile so it doesn't break the grid, visible on desktop */}
                        <span className="hidden md:block text-gray-400 font-bold uppercase tracking-wider mr-2"></span>

                        {show.pricing?.Platinum && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-t bg-blue-500 border border-blue-600 flex-shrink-0"></div>
                                <span className="truncate">Platinum (₹{show.pricing.Platinum})</span>
                            </div>
                        )}

                        {show.pricing?.Gold && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-t bg-yellow-400 border border-yellow-500 flex-shrink-0"></div>
                                <span className="truncate">Gold (₹{show.pricing.Gold})</span>
                            </div>
                        )}

                        {show.pricing?.Diamond && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-t bg-purple-500 border border-purple-600 flex-shrink-0"></div>
                                <span className="truncate">Diamond (₹{show.pricing.Diamond})</span>
                            </div>
                        )}

                        {/* Untouched Divider */}
                        <div className="h-4 w-px bg-gray-300 hidden md:block mx-2"></div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-t bg-green-500 border border-green-600 flex-shrink-0"></div>
                            <span>Selected</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-t bg-gray-300 border border-gray-400 flex-shrink-0"></div>
                            <span>Locked</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-t bg-gray-700 border border-gray-800 flex-shrink-0"></div>
                            <span>Sold</span>
                        </div>
                    </div>

                    {/* FIX 1: Checkout text back to "Selected Seats" and forcing right alignment */}
                    {/* Checkout Controls */}
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="flex flex-col text-right flex-1 md:flex-none">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Selected Seats</span>
                            <span className="text-sm font-bold text-gray-800 line-clamp-1 max-w-[200px]">
                                {myLockedSeats.length === 0
                                    ? 'None'
                                    : myLockedSeats.map(s => `${getRowLabel(s.row)}${s.col + 1}`).join(', ')}
                            </span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total</span>
                            <span className="text-xl font-extrabold text-blue-600">₹{totalPrice}</span>
                        </div>

                        <ProceedButton
                            showId={showId}
                            selectedSeats={myLockedSeats}
                            userDetails={{ token: localStorage.getItem('token')?.replace(/^"(.*)"$/, '$1') }}
                            onSuccess={() => {
                                // 0. GENERATE THE UNIQUE TRANSACTION KEY
                                const transactionId = `txn_${Date.now()}`;
                                sessionStorage.setItem('active_checkout', transactionId);

                                // 1. Parse the ISO string (use show.date or show.startTime depending on your schema)

                                const showDateTime = new Date(show.startTime);

                                // 2. Extract and format the Date (e.g., "Sat, Jul 4, 2026")
                                const formattedDate = showDateTime.toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });

                                // 3. Extract and format the Time (e.g., "06:30 PM")
                                const formattedTime = showDateTime.toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                });

                                // 4. Navigate and pass the nicely formatted strings
                                navigate(`/checkout/${showId}`, {
                                    state: {
                                        showDetails: {
                                            _id: show._id,
                                            movieTitle: show.movie?.title,
                                            posterUrl: show.movie?.posterUrl,
                                            date: formattedDate, // Inserted the clean date
                                            time: formattedTime, // Inserted the clean time
                                            theaterName: show.theater?.name,
                                            screenNumber: show.screenNumber,
                                            address: show.theater?.location?.address,
                                            city: show.theater?.location?.city
                                        },
                                        selectedSeats: myLockedSeats,
                                        basePrice: totalPrice,
                                        userDetails: {
                                            token: localStorage.getItem('token')?.replace(/^"(.*)"$/, '$1')
                                        },
                                        fromSeatSelection: true, // The secure baton
                                        transactionId,
                                        sessionTimestamp: Date.now() // Forces a fresh Timer
                                    }
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeatSelection;