import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 1. State for the confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 2. Open the modal instead of logging out immediately
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // 3. The actual confirmation and cleanup execution
  const confirmAndLogout = () => {
    setShowLogoutConfirm(false); // Close the modal
    sessionStorage.clear();      // Wipe the strict 5-minute booking timer
    logout();                    // Clear user auth state
    navigate('/login');          // Redirect to login page
  };

  return (
    <>
      <nav className="bg-primary text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold flex items-center gap-2">
            🎟️ CineMatch
          </Link>

          {/* Auth Links */}
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin/dashboard" className="font-bold text-yellow-400 hover:text-yellow-300">
                    Dashboard
                  </Link>
                )}
                <span className="font-medium">Welcome, {user.name}</span>
                <button
                  onClick={() => navigate('/my-bookings')}
                  className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 px-4 py-2 rounded-md font-medium text-sm transition-all shadow-sm"
                >
                  My Bookings
                </button>
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
        </div>
      </nav>
      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 transform transition-all text-left">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Are you sure you want to log out? Any unbooked seats in your cart will be released.
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