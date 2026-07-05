import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../services/api';
import ProceedButton from '../components/ProceedButton';

const SeatSelection = () => {
    const { showId } = useParams();
    const navigate = useNavigate();

    const [show, setShow] = useState(null);
    const [seats, setSeats] = useState([]);
    const [socket, setSocket] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    const [maxRows, setMaxRows] = useState(0);
    const [maxCols, setMaxCols] = useState(0);

    // 1. Fetch Show Details
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

    // 2. Initialize WebSocket Connection
    useEffect(() => {
        const rawToken = localStorage.getItem('token');
        if (!rawToken) return;

        const token = rawToken.replace(/^"(.*)"$/, '$1');

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUserId(payload.id || payload._id);
        } catch (e) {
            console.error("Invalid token format");
        }

        // THE FIX: Strip "/api" from the environment variable to ensure we connect to the root namespace
        let socketUrl = import.meta.env.VITE_SOCKET_URL;
        socketUrl = socketUrl.replace(/\/api$/, '');

        // Connect to Socket
        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket']
        });

        setSocket(newSocket);

        // --- NEW DEBUG LISTENERS ---
        newSocket.on('connect', () => {
            console.log('✅ FRONTEND: Socket Connected!', newSocket.id);
            // Only join the room AFTER we are successfully connected
            newSocket.emit('join_show', showId);
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ FRONTEND CONNECTION ERROR:', err.message);
        });

        newSocket.on('unauthorized', (data) => {
            console.error('🚫 FRONTEND UNAUTHORIZED:', data.message);
        });
        // ---------------------------

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

    // Helper function to convert 0-indexed rows into Base-26 alphabetical labels (A, B... Z, AA, AB...)
    const getRowLabel = (rowIndex) => {
        let label = '';
        let n = rowIndex;
        while (n >= 0) {
            label = String.fromCharCode(65 + (n % 26)) + label;
            n = Math.floor(n / 26) - 1;
        }
        return label;
    };
    // 3. Handle Seat Clicks (With Authentication Check)
    const handleSeatClick = (seat) => {
        const token = localStorage.getItem('token');

        // Feature: Graceful message for non-logged in users
        if (!token) {
            toast.warning('Please login to select seats and book movies.', {
                position: "top-center"
            });
            return;
        }

        if (!socket) {
            toast.error('Connecting to live seat map... Please wait a moment.', { autoClose: 2000 });
            return;
        }

        const myLockedSeats = seats.filter(s => s.status === 'locked' && s.lockedBy === currentUserId);

        console.log("Seat clicked:", seat.status);

        if (seat.status === 'available') {
            if (myLockedSeats.length >= 6) {
                toast.warning('You can only select up to 6 seats per transaction.');
                return; // Stop the execution here
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

    // 4. Seat Styling Logic
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
        // Safety check to ensure the row and col exist before placing
        if (seat.row !== undefined && seat.col !== undefined) {
            gridMatrix[seat.row][seat.col] = seat;
        }
    });

    if (!show) return <div className="text-center py-20 animate-pulse text-lg">Loading Seat Map...</div>;

    return (
        // Added padding-bottom (pb-32) to ensure the grid doesn't hide behind the fixed footer
        <div className="relative min-h-screen pb-40 bg-white">

            {/* MAIN SEAT GRID AREA */}
            <div className="max-w-7xl mx-auto py-8 px-4">

                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900">{show.movie?.title}</h2>
                    <span className={`font-bold px-4 py-2 rounded-full text-sm border shadow-sm ${availabilityPercentage > 50 ? 'bg-green-50 text-green-700 border-green-200' :
                        availabilityPercentage > 15 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {availabilityPercentage}% Available
                    </span>
                </div>

                <div className="border border-gray-200 shadow-sm p-6 sm:p-10 rounded-2xl overflow-x-auto text-center bg-gray-50 touch-none">
                    <div className="inline-block w-4/5 max-w-2xl h-10 bg-gradient-to-b from-gray-300 to-gray-200 mb-16 rounded-b-[40px] mx-auto flex items-center justify-center text-sm font-bold text-gray-500 tracking-[0.3em] shadow-inner border border-gray-300">
                        SCREEN THIS WAY
                    </div>

                    <div
                        className="inline-grid gap-2 p-6 bg-white rounded-xl border shadow-sm"
                        style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
                    >
                        {gridMatrix.map((row, rIdx) => (
                            row.map((seat, cIdx) => (
                                <div
                                    key={`${rIdx}-${cIdx}`}
                                    onClick={() => seat && handleSeatClick(seat)}
                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-t-lg border ${getSeatStyling(seat)} flex items-center justify-center`}
                                    title={seat ? `Row ${getRowLabel(rIdx)}, Col ${cIdx + 1} - ₹${seat.price}` : 'Aisle'}
                                >
                                    {/* Optional: Add a subtle seat number inside the box for better UX */}
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

            {/* FIXED BOTTOM BAR (Legend & Checkout) */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

                    {/* Horizontal Legend */}
                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium text-gray-600">
                        <span className="text-gray-400 font-bold uppercase tracking-wider mr-2"></span>
                        {show.pricing?.Platinum && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-t bg-blue-500 border border-blue-600"></div>
                                <span>Platinum (₹{show.pricing.Platinum})</span>
                            </div>
                        )}
                        {show.pricing?.Gold && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-t bg-yellow-400 border border-yellow-500"></div>
                                <span>Gold (₹{show.pricing.Gold})</span>
                            </div>
                        )}
                        {show.pricing?.Diamond && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-t bg-purple-500 border border-purple-600"></div>
                                <span>Diamond (₹{show.pricing.Diamond})</span>
                            </div>
                        )}
                        <div className="h-4 w-px bg-gray-300 hidden md:block mx-2"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-t bg-green-500 border border-green-600"></div>
                            <span>Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-t bg-gray-300 border border-gray-400"></div>
                            <span>Locked</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-t bg-gray-700 border border-gray-800"></div>
                            <span>Sold</span>
                        </div>
                    </div>

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
                                        }
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