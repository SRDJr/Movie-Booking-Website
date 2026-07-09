import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

// ==========================================
// REUSABLE CONFIRMATION MODAL COMPONENT
// ==========================================
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText, confirmColor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 font-bold text-white rounded-md transition shadow-sm ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  // 1. Initialize state from localStorage (fallback to 'movies')
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_active_tab') || 'movies';
  });

  // 2. Auto-save the active tab whenever it changes
  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  // --- UNIVERSAL MODAL STATE ---
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    confirmColor: 'bg-blue-600'
  });

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }));

  // ==========================================
  // 1. MOVIE IMPORT STATE & LOGIC
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const MAX_ADMIN_ATTEMPTS = 3;

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

  const confirmImport = (tmdbId, title) => {
    setModalConfig({
      isOpen: true,
      title: 'Import Movie',
      message: `Are you sure you want to import "${title}" into the database?`,
      confirmText: 'Import Movie',
      confirmColor: 'bg-green-600 hover:bg-blue-700',
      onConfirm: () => {
        closeModal();
        executeImport(tmdbId, title);
      }
    });
  };

  const executeImport = async (tmdbId, title) => {
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
  const DEFAULT_SIZE = 10;
  const MAX_ROWS = 40;
  const MAX_COLS = 40;
  const MAX_SCREENS = 50;

  // Retrieve initial draft state
  const getTheaterDraft = () => {
    const saved = localStorage.getItem('admin_theater_draft');
    return saved ? JSON.parse(saved) : null;
  };
  const theaterDraft = getTheaterDraft();

  const [theaterName, setTheaterName] = useState(theaterDraft?.theaterName ?? '');
  const [city, setCity] = useState(theaterDraft?.city ?? '');
  const [address, setAddress] = useState(theaterDraft?.address ?? '');
  const [screenNumber, setScreenNumber] = useState(theaterDraft?.screenNumber ?? 1);
  const [screenType, setScreenType] = useState(theaterDraft?.screenType ?? 'Standard');
  const [screenTypesList, setScreenTypesList] = useState([]);
  const [rows, setRows] = useState(theaterDraft?.rows ?? DEFAULT_SIZE);
  const [cols, setCols] = useState(theaterDraft?.cols ?? DEFAULT_SIZE);
  const [seatLayout, setSeatLayout] = useState(
    theaterDraft?.seatLayout ?? Array.from({ length: DEFAULT_SIZE }, () => Array(DEFAULT_SIZE).fill(1))
  );

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentBrush, setCurrentBrush] = useState(1);

  // Auto-save to localStorage
  useEffect(() => {
    const draft = { theaterName, city, address, screenNumber, screenType, rows, cols, seatLayout };
    localStorage.setItem('admin_theater_draft', JSON.stringify(draft));
  }, [theaterName, city, address, screenNumber, screenType, rows, cols, seatLayout]);

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
      newLayout[rIdx] = [...newLayout[rIdx]];
      newLayout[rIdx][cIdx] = currentBrush;
      return newLayout;
    });
  };

  const confirmCreateTheater = (e) => {
    e.preventDefault();
    setModalConfig({
      isOpen: true,
      title: 'Save Theater Details',
      message: 'Are you sure you want to save this theater and screen layout? Please ensure your seat mapping and aisles are correct.',
      confirmText: 'Save Theater',
      confirmColor: 'bg-blue-600 hover:bg-green-700',
      onConfirm: () => {
        closeModal();
        executeCreateTheater();
      }
    });
  };

  const executeCreateTheater = async () => {
    const flatLayout = seatLayout.flat();
    const totalSeats = flatLayout.filter(seat => seat > 0).length;
    const totalAisles = flatLayout.filter(seat => seat === 0).length;

    if (totalSeats === 0) {
      toast.error('Cannot create a screen with zero seats!');
      return;
    }
    if (totalAisles < rows - 1) {
      toast.error(`Fire Safety Warning: Please leave at least ${rows - 1} empty spaces to create aisles.`);
      return;
    }

    const payload = {
      name: theaterName,
      location: { city, address },
      screens: [{ screenNumber, screenType, seatLayout }]
    };

    const toastId = toast.loading('Saving theater...');
    try {
      await api.post('/theaters', payload);
      toast.update(toastId, { render: 'Theater created successfully!', type: 'success', isLoading: false, autoClose: 3000 });

      // Reset form and clear draft
      executeDiscardTheater(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create theater';
      toast.update(toastId, { render: msg, type: 'error', isLoading: false, autoClose: 5000 });
    }
  };

  const confirmDiscardTheater = () => {
    setModalConfig({
      isOpen: true,
      title: 'Discard Layout?',
      message: 'Are you sure you want to discard this theater layout? All unsaved seating data will be permanently lost.',
      confirmText: 'Discard Changes',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        closeModal();
        executeDiscardTheater(true);
      }
    });
  };

  const executeDiscardTheater = (showToast = true) => {
    setTheaterName('');
    setCity('');
    setAddress('');
    setScreenNumber(1);
    setScreenType(screenTypesList[0] || 'Standard');
    handleGridResize(DEFAULT_SIZE, DEFAULT_SIZE);
    localStorage.removeItem('admin_theater_draft');
    if (showToast) toast.info('Theater draft discarded.');
  };

  const getSeatColor = (val) => {
    switch (val) {
      case 0: return 'bg-transparent border border-gray-300';
      case 1: return 'bg-blue-500 hover:bg-blue-400 border-blue-600';
      case 2: return 'bg-yellow-400 hover:bg-yellow-300 border-yellow-500';
      case 3: return 'bg-purple-500 hover:bg-purple-400 border-purple-600';
      default: return 'bg-gray-200';
    }
  };

  // ==========================================
  // 3. SHOW SCHEDULER STATE & LOGIC
  // ==========================================
  const getShowDraft = () => {
    const saved = localStorage.getItem('admin_show_draft');
    return saved ? JSON.parse(saved) : null;
  };
  const showDraft = getShowDraft();

  const [moviesList, setMoviesList] = useState([]);
  const [theatersList, setTheatersList] = useState([]);

  const [selectedMovie, setSelectedMovie] = useState(showDraft?.selectedMovie ?? '');
  const [selectedTheater, setSelectedTheater] = useState(showDraft?.selectedTheater ?? '');
  const [selectedScreen, setSelectedScreen] = useState(showDraft?.selectedScreen ?? '');
  const [showStartTime, setShowStartTime] = useState(showDraft?.showStartTime ?? '');
  const [prices, setPrices] = useState(showDraft?.prices ?? { Platinum: 250, Gold: 350, Diamond: 500 });

  // Auto-save to localStorage
  useEffect(() => {
    const draft = { selectedMovie, selectedTheater, selectedScreen, showStartTime, prices };
    localStorage.setItem('admin_show_draft', JSON.stringify(draft));
  }, [selectedMovie, selectedTheater, selectedScreen, showStartTime, prices]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [moviesRes, theatersRes, screenTypesRes] = await Promise.all([
          api.get('/movies'),
          api.get('/theaters'),
          api.get('/theaters/screen-types')
        ]);
        setMoviesList(moviesRes.data);
        setTheatersList(theatersRes.data);

        if (screenTypesRes.data && screenTypesRes.data.length > 0) {
          setScreenTypesList(screenTypesRes.data);
          if (!theaterDraft?.screenType) setScreenType(screenTypesRes.data[0]);
        }
      } catch (error) {
        toast.error('Failed to load initial data');
      }
    };
    fetchDropdownData();
  }, [theaterDraft]);

  const availableScreens = selectedTheater
    ? theatersList.find(t => t._id === selectedTheater)?.screens || []
    : [];

  const activeScreenObj = availableScreens.find(s => s.screenNumber === Number(selectedScreen));

  const existingTiers = new Set();
  if (activeScreenObj?.seatLayout) {
    activeScreenObj.seatLayout.flat().forEach(val => {
      if (val === 1) existingTiers.add('Platinum');
      if (val === 2) existingTiers.add('Gold');
      if (val === 3) existingTiers.add('Diamond');
    });
  }

  const handlePriceChange = (tier, value) => {
    setPrices(prev => ({ ...prev, [tier]: Number(value) }));
  };

  const getMinDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const confirmCreateShow = (e) => {
    e.preventDefault();
    if (!selectedMovie || !selectedTheater || !selectedScreen || !showStartTime) {
      toast.error('Please fill all required fields');
      return;
    }
    setModalConfig({
      isOpen: true,
      title: 'Publish Show',
      message: 'Are you sure you want to publish this show schedule?',
      confirmText: 'Publish Show',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      onConfirm: () => {
        closeModal();
        executeCreateShow();
      }
    });
  };

  const executeCreateShow = async () => {
    const toastId = toast.loading('Scheduling show...');
    try {
      await api.post('/shows', {
        movieId: selectedMovie,
        theaterId: selectedTheater,
        screenNumber: Number(selectedScreen),
        startTime: new Date(showStartTime).toISOString(),
        pricing: prices
      });

      toast.update(toastId, { render: 'Show scheduled successfully!', type: 'success', isLoading: false, autoClose: 3000 });
      executeDiscardShow(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to schedule show';
      if (error.response?.status === 400 && error.response?.data?.conflictDetails) {
        toast.update(toastId, {
          render: `Conflict! Another show runs from ${new Date(error.response.data.conflictDetails.existingStart).toLocaleTimeString()} to ${new Date(error.response.data.conflictDetails.existingEnd).toLocaleTimeString()}`,
          type: 'error',
          isLoading: false,
          autoClose: 5000
        });
      } else {
        toast.update(toastId, { render: errorMsg, type: 'error', isLoading: false, autoClose: 3000 });
      }
    }
  };

  const confirmDiscardShow = () => {
    setModalConfig({
      isOpen: true,
      title: 'Discard Show Details?',
      message: 'Are you sure you want to discard this show schedule? Unsaved details will be lost.',
      confirmText: 'Discard Changes',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        closeModal();
        executeDiscardShow(true);
      }
    });
  };

  const executeDiscardShow = (showToast = true) => {
    setSelectedMovie('');
    setSelectedTheater('');
    setSelectedScreen('');
    setShowStartTime('');
    setPrices({ Platinum: 250, Gold: 350, Diamond: 500 });
    localStorage.removeItem('admin_show_draft');
    if (showToast) toast.info('Show schedule draft discarded.');
  };

  return (
    <div className="max-w-6xl mx-auto py-8 relative">
      <ConfirmationModal {...modalConfig} onCancel={closeModal} />

      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* TABS */}
      <div className="flex space-x-4 border-b border-gray-300 mb-8">
        {['movies', 'theaters', 'shows'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-semibold capitalize transition ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Manage {tab}
          </button>
        ))}
      </div>

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
                      onClick={() => confirmImport(movie.id, movie.title)}
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Create Theater & Screen Layout</h2>
              <button
                onClick={confirmDiscardTheater}
                className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition text-sm font-semibold"
              >
                Discard Draft
              </button>
            </div>

            <form onSubmit={confirmCreateTheater} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="text" placeholder="Theater Name (e.g., PVR)" required value={theaterName} onChange={(e) => setTheaterName(e.target.value)} className="px-4 py-2 border rounded-md" />
                <input type="number" placeholder="Screen Number" required min="1" max={MAX_SCREENS} value={screenNumber} onChange={(e) => setScreenNumber(Number(e.target.value))} className="px-4 py-2 border rounded-md" />
                <select
                  value={screenType}
                  onChange={(e) => setScreenType(e.target.value)}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  {screenTypesList.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
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
              <div className="border border-gray-200 shadow-sm py-4 sm:p-10 rounded-2xl overflow-x-auto text-center bg-gray-50">

                {/* FIX 1: Added px-4 sm:px-0 to ensure the white box doesn't touch the edge of the mobile screen */}
                <div className="min-w-[600px] sm:min-w-0 inline-block w-max min-w-full px-4 sm:px-0">

                  <div className="inline-block w-4/5 max-w-2xl h-8 sm:h-10 bg-gradient-to-b from-gray-300 to-gray-200 mb-10 sm:mb-16 rounded-b-[40px] mx-auto flex items-center justify-center text-[10px] sm:text-sm font-bold text-gray-500 tracking-[0.2em] sm:tracking-[0.3em] shadow-inner border border-gray-300">
                    SCREEN THIS WAY
                  </div>

                  <div
                    className="inline-grid gap-y-2 gap-x-2 sm:gap-3 p-4 sm:p-6 bg-white rounded-xl border shadow-sm mx-auto w-max"
                    style={{ gridTemplateColumns: `repeat(${cols}, max-content)` }}
                    onMouseLeave={() => setIsMouseDown(false)}
                    // --- FIX 2: NEW MOBILE TOUCH EVENTS (Swipe to Paint) ---
                    onTouchStart={() => setIsMouseDown(true)}
                    onTouchEnd={() => setIsMouseDown(false)}
                    onTouchMove={(e) => {
                      if (!isMouseDown) return;
                      e.preventDefault(); // Prevents screen from scrolling while painting

                      const touch = e.touches[0];
                      const target = document.elementFromPoint(touch.clientX, touch.clientY);

                      if (target && target.dataset.row !== undefined) {
                        const r = parseInt(target.dataset.row);
                        const c = parseInt(target.dataset.col);
                        applyBrush(r, c);
                      }
                    }}
                  >
                    {seatLayout.map((row, rIdx) => (
                      row.map((seat, cIdx) => (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          // --- DATA ATTRIBUTES FOR MOBILE TRACKING ---
                          data-row={rIdx}
                          data-col={cIdx}
                          // -------------------------------------------
                          onMouseDown={() => { setIsMouseDown(true); applyBrush(rIdx, cIdx); }}
                          onMouseEnter={() => { if (isMouseDown) applyBrush(rIdx, cIdx); }}
                          className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 rounded-t-lg cursor-pointer border ${getSeatColor(seat)}`}
                          title={`Row ${rIdx + 1}, Col ${cIdx + 1}`}
                        />
                      ))
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-500 font-semibold">
                  Select a brush and drag to paint seats. <span className="md:hidden text-blue-600">Swipe on the gray area to scroll sideways.</span>
                </p>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition">
                Save Theater & Screen
              </button>
            </form>
          </div>
        )}

        {/* ======================= SHOWS TAB ======================= */}
        {activeTab === 'shows' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Schedule a Show</h2>
              <button
                onClick={confirmDiscardShow}
                className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition text-sm font-semibold"
              >
                Discard Draft
              </button>
            </div>

            <form onSubmit={confirmCreateShow} className="space-y-6 max-w-2xl bg-gray-50 p-6 rounded-lg border border-gray-200">
              {/* Select Movie */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-2">Select Movie</label>
                <select
                  value={selectedMovie}
                  onChange={(e) => setSelectedMovie(e.target.value)}
                  required
                  className="px-4 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a Movie --</option>
                  {moviesList.map(movie => (
                    <option key={movie._id} value={movie._id}>{movie.title}</option>
                  ))}
                </select>
              </div>

              {/* Select Theater */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-2">Select Theater</label>
                <select
                  value={selectedTheater}
                  onChange={(e) => {
                    setSelectedTheater(e.target.value);
                    setSelectedScreen('');
                  }}
                  required
                  className="px-4 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a Theater --</option>
                  {theatersList.map(theater => (
                    <option key={theater._id} value={theater._id}>{theater.name} ({theater.location.city})</option>
                  ))}
                </select>
              </div>

              {/* Select Screen */}
              <div className="flex flex-col">
                <label className="font-semibold text-gray-700 mb-2">Select Screen</label>
                <select
                  value={selectedScreen}
                  onChange={(e) => setSelectedScreen(e.target.value)}
                  required
                  disabled={!selectedTheater}
                  className="px-4 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Choose a Screen --</option>
                  {availableScreens.map(screen => (
                    <option key={screen._id || screen.screenNumber} value={screen.screenNumber}>
                      Screen {screen.screenNumber} ({screen.screenType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date/Time and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={showStartTime}
                    onChange={(e) => setShowStartTime(e.target.value)}
                    required
                    min={getMinDatetime()}
                    className="px-4 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedScreen && existingTiers.size > 0 && (
                  <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm mt-4 col-span-1 md:col-span-2">
                    <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Set Ticket Prices (₹)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {existingTiers.has('Platinum') && (
                        <div className="flex flex-col">
                          <label className="text-sm font-bold text-blue-600 mb-1">Platinum Seats</label>
                          <input
                            type="number" min="50" required
                            value={prices.Platinum}
                            onChange={(e) => handlePriceChange('Platinum', e.target.value)}
                            className="px-3 py-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {existingTiers.has('Gold') && (
                        <div className="flex flex-col">
                          <label className="text-sm font-bold text-yellow-600 mb-1">Gold Seats</label>
                          <input
                            type="number" min="50" required
                            value={prices.Gold}
                            onChange={(e) => handlePriceChange('Gold', e.target.value)}
                            className="px-3 py-2 border border-yellow-200 rounded focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      )}

                      {existingTiers.has('Diamond') && (
                        <div className="flex flex-col">
                          <label className="text-sm font-bold text-purple-600 mb-1">Diamond Seats</label>
                          <input
                            type="number" min="50" required
                            value={prices.Diamond}
                            onChange={(e) => handlePriceChange('Diamond', e.target.value)}
                            className="px-3 py-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition shadow-sm">
                Publish Show
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;