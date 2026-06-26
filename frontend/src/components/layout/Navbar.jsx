import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
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
  );
};

export default Navbar;