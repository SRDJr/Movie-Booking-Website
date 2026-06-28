import { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('movies');

  // --- MOVIE IMPORT STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const MAX_ADMIN_ATTEMPTS = 3;

  // --- MOVIE IMPORT LOGIC ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setLoading(true);
    try {
      const { data } = await api.get(`/movies/search?query=${searchQuery}`);
      setSearchResults(data);
    } catch (error) {
      toast.error('Failed to search TMDB');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (tmdbId, title) => {
    if (failedAttempts >= MAX_ADMIN_ATTEMPTS) {
      toast.error('Service unavailable. Please come back later.');
      return;
    }

    const toastId = toast.loading(`Importing ${title}...`);
    try {
      await api.post('/movies/import', { tmdbId });
      toast.update(toastId, { render: `${title} imported successfully!`, type: "success", isLoading: false, autoClose: 3000 });
      setFailedAttempts(0); 
    } catch (error) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      const errorMsg = error.response?.data?.message || 'Failed to import';
      
      if (newFails >= MAX_ADMIN_ATTEMPTS) {
        toast.update(toastId, { render: `Critical Failure: TMDB is down. Try again later.`, type: "error", isLoading: false, autoClose: 5000 });
      } else {
        toast.update(toastId, { render: `${errorMsg}. Attempt ${newFails}/3`, type: "error", isLoading: false, autoClose: 3000 });
      }
    }
  };

  const isLockedOut = failedAttempts >= MAX_ADMIN_ATTEMPTS;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* The Tabs */}
      <div className="flex space-x-4 border-b border-gray-300 mb-8">
        <button
          onClick={() => setActiveTab('movies')}
          className={`py-2 px-4 font-semibold ${activeTab === 'movies' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Movies
        </button>
        <button
          onClick={() => setActiveTab('theaters')}
          className={`py-2 px-4 font-semibold ${activeTab === 'theaters' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Theaters
        </button>
        <button
          onClick={() => setActiveTab('shows')}
          className={`py-2 px-4 font-semibold ${activeTab === 'shows' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Shows
        </button>
      </div>

      {/* The Content Areas */}
      <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px]">
        {activeTab === 'movies' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Import Movies from TMDB</h2>
            
            {isLockedOut && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-300">
                ⚠️ Movie imports are temporarily locked due to repeated upstream failures. Please try again in a few minutes.
              </div>
            )}

            <form onSubmit={handleSearch} className="flex gap-4 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TMDB (e.g., Inception)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={isLockedOut}
              />
              <button
                type="submit"
                disabled={loading || isLockedOut}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((movie) => (
                <div key={movie.id} className="flex gap-4 p-4 border border-gray-100 rounded-md bg-gray-50">
                  <img 
                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} 
                    alt={movie.title}
                    className="w-16 h-24 object-cover rounded shadow-sm"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/200x300?text=No+Poster'}
                  />
                  <div className="flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm line-clamp-2">{movie.title}</h3>
                      <p className="text-xs text-gray-500">{movie.release_date?.substring(0, 4)}</p>
                    </div>
                    <button
                      onClick={() => handleImport(movie.id, movie.title)}
                      disabled={isLockedOut}
                      className="mt-2 text-xs py-1.5 px-3 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Import to DB
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'theaters' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Create Theaters & Screens</h2>
            <p className="text-gray-500">Theater layout builder goes here.</p>
          </div>
        )}

        {activeTab === 'shows' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Schedule Shows</h2>
            <p className="text-gray-500">Show scheduling form goes here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;