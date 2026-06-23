import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Components
import Navbar from './components/layout/Navbar'; 

// Admin Files
import AdminRoute from './components/layout/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Helper for Popups */}
        <ToastContainer position="top-right" autoClose={3000} />
        
        {/* Navigation Bar (We will build this next) */}
        <Navbar />

        <div className="container mx-auto px-4 py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard/></AdminRoute>} 
            />
            
            {/* Future Routes */}
            {/* <Route path="/movie/:id" element={<MovieDetails />} /> */}
            {/* <Route path="/booking/:showId" element={<BookingPage />} /> */}
            {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;