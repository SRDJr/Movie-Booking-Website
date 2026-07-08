import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieBooking from './pages/MovieBooking';
import SeatSelection from './pages/SeatSelection';
import PaymentSummary from './pages/PaymentSummary';
import MyBookings from './pages/MyBookings';

// Components
import Navbar from './components/layout/Navbar';

// Admin Files
import AdminRoute from './components/layout/AdminRoute';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Helper for Popups */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          // Container: Centers it on mobile, restricts width, leaves desktop alone
          className="!w-11/12 max-w-sm !top-4 !left-1/2 !-translate-x-1/2 sm:!left-auto sm:!translate-x-0 sm:!right-0 sm:!top-0"
          // Inner Toast: Makes it a rounded pill on mobile, standard box on desktop
          toastClassName="!rounded-full !rounded-tr-none sm:!rounded-md sm:!rounded-tr-md shadow-lg !overflow-hidden"
        />

        <Navbar />

        <div className="container mx-auto px-4 py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/movie/:movieId" element={<MovieBooking />} />
            <Route path="/seat-selection/:showId" element={<SeatSelection />} />
            <Route path="/checkout/:showId" element={<ProtectedRoute><PaymentSummary /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />

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