import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

// 1. Create the Context object
const AuthContext = createContext();

// Hook to easily use Auth state
export const useAuth = () => useContext(AuthContext);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
  // State to hold user info, token, and loading status
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // 3. Effect to check for token on mount and update API header
  useEffect(() => {
    // If token exists, try to fetch user details or just set the token header
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser(); 
    } else {
      setLoading(false);
    }
  }, [token]);

  // Function to fetch user details after login/token is set
  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // If fetching fails (e.g., token expired), clear local storage
      logout(false);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      toast.success('Login Successful!');

      // fetchUser will run automatically due to the useEffect dependency on 'token'

    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
      toast.error(message);
    }
  };

  // Register function
  const register = async (name, email, password, adminSecret) => {
    try {
      await api.post('/auth/register', { name, email, password, adminSecret });
      toast.success('Registration successful! Please log in.');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed.';
      toast.error(message);
      return false;
    }
  };

  // Logout function
  const logout = (showToast = true) => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    if (showToast) {
      toast.info('Logged out successfully.');
    }
  };

  const contextData = {
    user,
    token,
    loading,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    fetchUser // Useful for re-fetching after an action
  };

  return (
    <AuthContext.Provider value={contextData}>
      {loading ? <div className="p-20 text-center">Loading Application...</div> : children}
    </AuthContext.Provider>
  );
};