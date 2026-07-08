import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Create a reference to attach to our mobile menu
  const mobileMenuRef = useRef(null);

  // 2. Add an event listener to detect clicks outside the referenced area
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the menu is open, and the click happened outside the mobileMenuRef element, close it
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    // Only attach the listener when the menu is actually open for performance
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Also handle touch events for better mobile responsiveness
      document.addEventListener('touchstart', handleClickOutside);
    }

    // Cleanup function
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setIsMobileMenuOpen(false);
  };

  const confirmAndLogout = () => {
    setShowLogoutConfirm(false);
    sessionStorage.clear();
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-primary text-white p-4 shadow-md sticky top-0 z-50 relative">
        <div className="container mx-auto flex justify-between items-center">

          <Link to="/" onClick={closeMobileMenu} className="text-2xl font-bold flex items-center gap-2">
            🎟️ CineFlix
          </Link>

          {/* DESKTOP VIEW - 100% Untouched */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <span className="font-medium">Welcome, {user.name}</span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 px-4 py-2 rounded-md font-medium text-sm transition-all shadow-sm"
                  >
                    Dashboard
                  </button>
                )}
                {user.role === 'client' && (
                  <button
                    onClick={() => navigate('/my-bookings')}
                    className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 px-4 py-2 rounded-md font-medium text-sm transition-all shadow-sm"
                  >
                    My Bookings
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded text-sm transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-gray-200 font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-primary px-4 py-2 rounded font-bold hover:bg-gray-100 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* MOBILE VIEW TOGGLE & DROPDOWN */}
          {/* 3. Attach the ref to the parent div containing BOTH the button and the dropdown */}
          <div className="flex md:hidden items-center" ref={mobileMenuRef}>
            {!user ? (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="hover:text-gray-200 text-sm font-medium">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-primary px-3 py-1.5 rounded font-bold hover:bg-gray-100 transition text-sm"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-white hover:text-gray-300 focus:outline-none p-1"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>

                {/* MOBILE FLOATING DROPDOWN CARD */}
                {isMobileMenuOpen && (
                  <div className="absolute top-[70px] right-4 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-down z-50">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 text-center text-gray-800">
                      <span className="text-sm font-medium">Welcome,</span>
                      <p className="font-bold text-primary truncate">{user.name}</p>
                    </div>

                    <div className="flex flex-col p-2">
                      {user.role === 'admin' && (
                        <button
                          onClick={() => { navigate('/admin/dashboard'); closeMobileMenu(); }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors"
                        >
                          Dashboard
                        </button>
                      )}
                      {user.role === 'client' && (
                        <button
                          onClick={() => { navigate('/my-bookings'); closeMobileMenu(); }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors"
                        >
                          My Bookings
                        </button>
                      )}

                      <div className="h-px bg-gray-100 my-1 mx-2"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* LOGOUT CONFIRMATION MODAL - Untouched */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 transform transition-all text-left">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-6 text-sm">
              {user.role === 'client' ? "Are you sure you want to log out? Any unbooked seats in your cart will be released." : "Are you sure you want to log out? Any unsaved changes will be lost."}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndLogout}
                className="px-4 py-2 text-white font-bold bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;