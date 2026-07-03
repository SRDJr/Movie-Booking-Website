import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Home = () => {
  // 1. State Management
  // Default to Nuapada, or use whatever the user previously saved in localStorage
  const [city, setCity] = useState(() => localStorage.getItem('userCity') || 'Nuapada');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchInput, setCitySearchInput] = useState('');
  const [availableCities, setAvailableCities] = useState([]);

  // 2. Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      localStorage.setItem('userCity', city);

      try {
        // Fetch both cities and movies concurrently for speed
        const [citiesRes, moviesRes] = await Promise.all([
          api.get('/theaters/cities'),
          api.get(`/shows/active-movies?city=${city}`)
        ]);

        setAvailableCities(citiesRes.data);
        setMovies(moviesRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [city]);

  // 3. Client-Side Search Filtering (Title & Genre)
  const filteredMovies = movies.filter(movie => {
    const searchLower = searchQuery.toLowerCase();

    // Check title
    const titleMatch = movie.title.toLowerCase().includes(searchLower);

    // Format genre safely and check
    const genreData = movie.genre || movie.genres || '';
    const genreString = Array.isArray(genreData) ? genreData.join(' ') : genreData;
    const genreMatch = genreString.toLowerCase().includes(searchLower);

    return titleMatch || genreMatch;
  });

  // Helper to safely render genres as markdown-style badges
  const renderGenres = (genreData) => {
    if (!genreData) return null;

    // If it's a comma-separated string, split it. If already an array, use it.
    const genreArray = Array.isArray(genreData) ? genreData : genreData.split(',');

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {genreArray.map((g, index) => (
          <span
            key={index}
            className="text-[11px] text-sm text-gray-1000 mt-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200"
          >
            {g.trim()}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* --- HERO SECTION & CONTROLS --- */}
      <div className="bg-blue-900 text-white py-12 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">Welcome to CineMatch</h1>
            <p className="text-blue-200 text-lg">Discover the best movies playing in your city.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* City Selector */}
            {/* Searchable City Dropdown */}
            <div className="relative w-full sm:w-48">
              <input
                type="text"
                placeholder="Search city..."
                value={isCityDropdownOpen ? citySearchInput : city}
                onClick={() => {
                  setIsCityDropdownOpen(true);
                  setCitySearchInput(''); // Clear input to show all on click
                }}
                onChange={(e) => setCitySearchInput(e.target.value)}
                onBlur={() => setTimeout(() => setIsCityDropdownOpen(false), 150)} // Slightly shorter timeout is fine now
                className="w-full px-4 py-2.5 rounded-md text-gray-800 font-semibold border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm cursor-pointer"
              />

              {isCityDropdownOpen && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                  {availableCities
                    .filter(c => c.toLowerCase().includes(citySearchInput.toLowerCase()))
                    .map(c => (
                      <div
                        key={c}
                        // CHANGED HERE: onClick is now onMouseDown
                        onMouseDown={() => {
                          setCity(c);
                          setIsCityDropdownOpen(false);
                        }}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-200 text-gray-800 transition"
                      >
                        {c}
                      </div>
                    ))}
                  {/* Fallback if user types a city not in the list */}
                  {availableCities.filter(c => c.toLowerCase().includes(citySearchInput.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2 text-gray-500 text-sm">No cities found</div>
                  )}
                </div>
              )}
            </div>

            {/* Local Search Bar */}
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-3 rounded-md text-gray-800 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

        </div>
      </div>

      {/* --- MOVIE GRID SECTION --- */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Now Showing in <span className="text-blue-600">{city}</span>
          </h2>
          <span className="text-gray-500 font-medium">{filteredMovies.length} Movies found</span>
        </div>

        {loading ? (
          // Loading Skeleton
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="bg-gray-200 animate-pulse h-80 rounded-lg shadow-sm"></div>
            ))}
          </div>
        ) : filteredMovies.length === 0 ? (
          // Empty State
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-600 mb-2">No shows found</h3>
            <p className="text-gray-500">
              There are currently no active shows for {searchQuery ? `"${searchQuery}"` : 'any movies'} in {city}.
            </p>
          </div>
        ) : (
          // Movie Grid
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => (
              <Link
                to={`/movie/${movie._id}?city=${city}`}
                key={movie._id}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col group"
              >
                <div className="relative overflow-hidden aspect-[2/3]">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/500x750?text=No+Poster' }}
                  />
                  {/* Overlay for hover effect */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <span className="text-white font-bold px-4 py-2 bg-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Book Tickets
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1" title={movie.title}>
                      {movie.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {movie.duration} mins • {renderGenres(movie.genre || movie.genres)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;