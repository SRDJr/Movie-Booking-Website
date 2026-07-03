import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const MovieBooking = () => {
    const { movieId } = useParams(); // Extracts :movieId from the URL path
    const [searchParams] = useSearchParams(); // Extracts query parameters
    const navigate = useNavigate();

    // Dynamically grab the city from the URL (e.g., ?city=Mumbai)
    // Fallback to the same default you used in Home.jsx just in case
    const currentCity = searchParams.get('city') || 'Nuapada';

    // --- Date Logic ---
    const generateDateArray = () => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const dates = generateDateArray();
    const formatDateForAPI = (dateObj) => {
        // Pad single digits with leading zeros for YYYY-MM-DD format
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(formatDateForAPI(dates[0]));
    const [groupedShows, setGroupedShows] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Fetch Shows ---
    useEffect(() => {
        const fetchShows = async () => {
            setLoading(true);
            try {
                // Fetching dynamically based on URL parameters and selected date
                const { data } = await api.get(`/shows/grouped?movieId=${movieId}&city=${currentCity}&date=${selectedDate}`);
                setGroupedShows(data);
            } catch (error) {
                console.error("Failed to fetch shows", error);
                setGroupedShows([]);
            } finally {
                setLoading(false);
            }
        };

        if (movieId && currentCity) {
            fetchShows();
        }
    }, [movieId, currentCity, selectedDate]);

    // New state for the movie details
    const [movieDetails, setMovieDetails] = useState(null);

    // New isolated useEffect just for fetching the movie once
    useEffect(() => {
        const fetchMovieDetails = async () => {
            try {
                // Assuming you have a standard GET route for a single movie
                const { data } = await api.get(`/movies/${movieId}`);
                setMovieDetails(data);
            } catch (error) {
                console.error("Failed to fetch movie details:", error);
            }
        };

        if (movieId) {
            fetchMovieDetails();
        }
    }, [movieId]); // Only runs when the movieId changes

    // --- Time formatting & validation ---
    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isShowInPast = (isoString) => {
        return new Date(isoString).getTime() < new Date().getTime();
    };

    // Helper to color-code the tiny badges
    const getBadgeColor = (type) => {
        switch (type?.toUpperCase()) {
            case 'IMAX': return 'bg-blue-600 text-white';
            case 'VIP': return 'bg-yellow-500 text-black';
            case '4DX': return 'bg-purple-600 text-white';
            default: return 'bg-gray-200 text-gray-700';
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">

            {/* --- MOVIE DETAILS HERO SECTION --- */}
            {movieDetails ? (
                <div className="flex flex-col md:flex-row gap-8 mb-10 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    {/* Poster */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <img
                            src={movieDetails.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'}
                            alt={movieDetails.title}
                            className="w-full h-auto rounded-lg shadow-md object-cover aspect-[2/3]"
                        />
                    </div>

                    {/* Movie Info */}
                    <div className="flex flex-col justify-center">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                            {movieDetails.title}
                        </h1>

                        {/* Markdown-style Genre Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {movieDetails.genre?.map((g, i) => (
                                <span key={i} className="text-[11px] text-sm text-gray-1000 mt-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                    {g}
                                </span>
                            ))}
                        </div>

                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {movieDetails.description || "No description available for this movie."}
                        </p>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-medium text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            {movieDetails.duration && (
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Duration</span>
                                    <span>⏱ {movieDetails.duration} mins</span>
                                </div>
                            )}
                            {movieDetails.language && (
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Language</span>
                                    <span>🗣 {movieDetails.language}</span>
                                </div>
                            )}
                            {movieDetails.rating && (
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Rating</span>
                                    <span>⭐ {movieDetails.rating}/10</span>
                                </div>
                            )}
                            {movieDetails.releaseDate && (
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Release</span>
                                    <span>📅 {new Date(movieDetails.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Skeleton Loader for Movie Details
                <div className="flex flex-col md:flex-row gap-8 mb-10 bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
                    <div className="w-full md:w-64 h-96 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    <div className="flex flex-col justify-center w-full">
                        <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="h-24 bg-gray-200 rounded w-full mb-6"></div>
                        <div className="h-16 bg-gray-200 rounded w-full"></div>
                    </div>
                </div>
            )}

            {/* --- SHOW SELECTION HEADER --- */}
            <div className="mb-6 flex justify-between items-end">
                <h1 className="text-3xl font-bold text-gray-800">Select Show Time</h1>
                <p className="text-gray-500 font-medium">Showing results for: <span className="text-blue-600 font-bold">{currentCity}</span></p>
            </div>

            {/* 7-Day Date Picker */}
            <div className="flex space-x-4 overflow-x-auto pb-4 mb-8 border-b scrollbar-hide">
                {dates.map((dateObj, index) => {
                    const apiString = formatDateForAPI(dateObj);
                    const isSelected = selectedDate === apiString;

                    return (
                        <button
                            key={apiString}
                            onClick={() => setSelectedDate(apiString)}
                            className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-4 rounded-lg transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                        >
                            <span className="text-xs uppercase font-semibold">
                                {index === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-xl font-bold">
                                {dateObj.getDate()}
                            </span>
                            <span className="text-xs">
                                {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : groupedShows.length === 0 ? (
                // Graceful Fallback
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-4xl block mb-4">🍿</span>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">No Shows Available</h2>
                    <p className="text-gray-500">
                        It looks like this movie isn't playing in {currentCity} on this date. Try selecting another date!
                    </p>
                </div>
            ) : (
                // Theater List
                <div className="space-y-6">
                    {groupedShows.map((theater) => (
                        <div key={theater.theaterId} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="mb-4 border-b pb-4">
                                <h2 className="text-xl font-bold text-gray-800">{theater.theaterName}</h2>
                                <p className="text-sm text-gray-500 mt-1">{theater.address}</p>
                            </div>

                            {/* Time Pills Grid */}
                            <div className="flex flex-wrap gap-4 mt-4">
                                {theater.shows.map((show) => {
                                    const past = isShowInPast(show.startTime);

                                    return (
                                        <button
                                            key={show.showId}
                                            disabled={past}
                                            onClick={() => navigate(`/seat-selection/${show.showId}`)}
                                            className={`relative px-6 py-3 border rounded-md font-semibold transition-all ${past
                                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50 hover:shadow-md'
                                                }`}
                                        >
                                            {formatTime(show.startTime)}

                                            {/* Tiny Format Badge */}
                                            {show.screenType !== 'Standard' && (
                                                <span className={`absolute -top-2 -right-2 text-[0.6rem] px-2 py-0.5 rounded-full font-bold shadow-sm border border-white ${getBadgeColor(show.screenType)}`}>
                                                    {show.screenType}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MovieBooking;