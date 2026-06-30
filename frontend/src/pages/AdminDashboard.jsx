import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('movies');

  // ==========================================
  // 1. MOVIE IMPORT STATE & LOGIC
  // ==========================================

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


  // ==========================================
  // 2. THEATER & SEAT MAP BUILDER STATE & LOGIC
  // ==========================================

  // --- LIMIT CONSTANTS ---
  const DEFAULT_SIZE = 10;
  const MAX_ROWS = 40;
  const MAX_COLS = 40;
  const MAX_SCREENS = 50; // Max number of screens a single theater can have

    // --- STATE ---
  const [theaterName, setTheaterName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [screenNumber, setScreenNumber] = useState(1);
  const [screenType, setScreenType] = useState('Standard'); // Dynamic Screen Type
  
  const [rows, setRows] = useState(DEFAULT_SIZE);
  const [cols, setCols] = useState(DEFAULT_SIZE);
  
    // --- LOGIC ---
  // 0: Aisle, 1: Platinum, 2: Gold, 3: Diamond
  const [seatLayout, setSeatLayout] = useState(
    Array.from({ length: DEFAULT_SIZE }, () => Array(DEFAULT_SIZE).fill(1))
  );

  // Drag-to-Paint Logic
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentBrush, setCurrentBrush] = useState(1);

  // Stop drawing if the mouse is released anywhere on the screen
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleGridResize = (newRows, newCols) => {
    setRows(newRows);
    setCols(newCols);
    setSeatLayout(Array.from({ length: newRows }, () => Array(newCols).fill(1)));
  };

  const applyBrush = (rIdx, cIdx) => {
    setSeatLayout((prev) => {
      const newLayout = [...prev];
      newLayout[rIdx] = [...newLayout[rIdx]]; // Deep copy row
      newLayout[rIdx][cIdx] = currentBrush;
      return newLayout;
    });
  };

  const handleCreateTheater = async (e) => {
    e.preventDefault();

    const flatLayout = seatLayout.flat();
    const totalSeats = flatLayout.filter(seat => seat > 0).length;
    const totalAisles = flatLayout.filter(seat => seat === 0).length;

    // VALIDATION 1: Cannot be all zeros
    if (totalSeats === 0) {
      toast.error('Cannot create a screen with zero seats!');
      return;
    }

    // VALIDATION 2: Must have adequate walking space (User Request)
    if (totalAisles < rows - 1) {
      toast.error(`Fire Safety Warning: Please leave at least ${rows - 1} empty spaces to create aisles.`);
      return;
    }

    const payload = {
      name: theaterName,
      location: { city, address },
      screens: [
        {
          screenNumber,
          screenType,
          seatLayout: seatLayout
        }
      ]
    };

    try {
      const toastId = toast.loading('Saving theater...');
      await api.post('/theaters', payload);
      toast.update(toastId, { render: 'Theater created successfully!', type: 'success', isLoading: false, autoClose: 3000 });
      
      // Reset form
      setTheaterName('');
      setCity('');
      setAddress('');
      setScreenNumber(1);
      setScreenType('Standard');
      handleGridResize(DEFAULT_SIZE, DEFAULT_SIZE);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create theater';
      toast.error(msg);
    }
  };

  // Helper for rendering seat colors
  const getSeatColor = (val) => {
    switch(val) {
      case 0: return 'bg-transparent border border-gray-300'; // Aisle
      case 1: return 'bg-blue-500 hover:bg-blue-400 border-blue-600'; // Platinum
      case 2: return 'bg-yellow-400 hover:bg-yellow-300 border-yellow-500'; // Gold
      case 3: return 'bg-purple-500 hover:bg-purple-400 border-purple-600'; // Diamond
      default: return 'bg-gray-200';
    }
  };


  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* TABS */}
      <div className="flex space-x-4 border-b border-gray-300 mb-8">
        {['movies', 'theaters', 'shows'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-semibold capitalize transition ${
              activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage {tab}
          </button>
        ))}
      </div>

      {/* The Content Areas */}
      <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px]">

        {/* ======================= MOVIE TAB ======================= */}
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
        

        {/* ======================= THEATER TAB ======================= */}
        {activeTab === 'theaters' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Create Theater & Screen Layout</h2>
            
            <form onSubmit={handleCreateTheater} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="text" placeholder="Theater Name (e.g., PVR)" required value={theaterName} onChange={(e) => setTheaterName(e.target.value)} className="px-4 py-2 border rounded-md" />
                <input type="number" placeholder="Screen Number" required min="1" max={MAX_SCREENS} value={screenNumber} onChange={(e) => setScreenNumber(Number(e.target.value))} className="px-4 py-2 border rounded-md" />
                <select value={screenType} onChange={(e) => setScreenType(e.target.value)} className="px-4 py-2 border rounded-md bg-white">
                  <option value="Standard">Standard</option>
                  <option value="IMAX">IMAX</option>
                  <option value="VIP">VIP</option>
                </select>
                <input type="text" placeholder="City" required value={city} onChange={(e) => setCity(e.target.value)} className="px-4 py-2 border rounded-md" />
                <input type="text" placeholder="Full Address" required value={address} onChange={(e) => setAddress(e.target.value)} className="px-4 py-2 border rounded-md lg:col-span-2" />
              </div>

              {/* Grid & Brush Controls */}
              <div className="flex flex-col md:flex-row gap-6 bg-gray-50 p-4 rounded-md border items-center justify-between">
                <div className="flex gap-4 items-center">
                  <label className="font-semibold text-gray-700">Grid Size:</label>
                  <input type="number" min="3" max={MAX_ROWS} value={rows} onChange={(e) => handleGridResize(Number(e.target.value), cols)} className="w-16 px-2 py-1 border rounded" title="Rows" />
                  <span className="text-gray-400">X</span>
                  <input type="number" min="3" max={MAX_COLS} value={cols} onChange={(e) => handleGridResize(rows, Number(e.target.value))} className="w-16 px-2 py-1 border rounded" title="Columns" />
                </div>

                {/* Brush Toolbar */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-semibold text-gray-600 mr-2">Paint Brush:</span>
                  <button type="button" onClick={() => setCurrentBrush(1)} className={`px-3 py-1 rounded border text-sm font-semibold ${currentBrush === 1 ? 'bg-blue-100 border-blue-600 text-blue-800' : 'bg-white'}`}>Platinum</button>
                  <button type="button" onClick={() => setCurrentBrush(2)} className={`px-3 py-1 rounded border text-sm font-semibold ${currentBrush === 2 ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-white'}`}>Gold</button>
                  <button type="button" onClick={() => setCurrentBrush(3)} className={`px-3 py-1 rounded border text-sm font-semibold ${currentBrush === 3 ? 'bg-purple-100 border-purple-600 text-purple-800' : 'bg-white'}`}>Diamond</button>
                  <button type="button" onClick={() => setCurrentBrush(0)} className={`px-3 py-1 rounded border text-sm font-semibold ${currentBrush === 0 ? 'bg-gray-200 border-gray-600 text-gray-800' : 'bg-white'}`}>Eraser (Aisle)</button>
                </div>
              </div>

              {/* Interactive Grid */}
              <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg overflow-x-auto text-center bg-gray-50 touch-none">
                <div className="inline-block w-4/5 h-8 bg-gray-300 mb-8 rounded-b-3xl mx-auto flex items-center justify-center text-sm font-bold text-gray-500 tracking-widest shadow-inner">SCREEN THIS WAY</div>
                
                <div 
                  className="inline-grid gap-1.5 p-2 bg-white rounded border shadow-sm" 
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                  onMouseLeave={() => setIsMouseDown(false)} // Safety stop if mouse leaves grid
                >
                  {seatLayout.map((row, rIdx) => (
                    row.map((seat, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onMouseDown={() => { setIsMouseDown(true); applyBrush(rIdx, cIdx); }}
                        onMouseEnter={() => { if (isMouseDown) applyBrush(rIdx, cIdx); }}
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-t-lg cursor-pointer border ${getSeatColor(seat)}`}
                        title={`Row ${rIdx + 1}, Col ${cIdx + 1}`}
                      />
                    ))
                  ))}
                </div>
                <p className="mt-4 text-xs text-gray-500 font-semibold">Select a brush and Drag to paint seats. Leave blank spaces for aisles.</p>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-md hover:bg-green-700 transition">
                Save Theater & Screen
              </button>
            </form>
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