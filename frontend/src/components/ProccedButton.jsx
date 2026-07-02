import React, { useState } from 'react';
import axios from 'axios';

const ProceedButton = ({ showId, selectedSeats, userDetails, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleProceed = async () => {
    setLoading(true);

    try {
      // 1. Call the backend verify route
      const response = await axios.post(
        '/api/bookings/verify', 
        { showId, selectedSeats },
        { headers: { Authorization: `Bearer ${userDetails.token}` } } 
      );

      // 2. If backend confirms seats are valid, trigger the transition
      if (response.data.success) {
        onSuccess(response.data);
      }

    } catch (error) {
      console.error('Verification Error:', error);
      
      // Extract the exact error message sent from your controller
      const errorMessage = error.response?.data?.message || 'Seats are no longer available. Please select again.';
      alert(`Cannot proceed: ${errorMessage}`);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleProceed} 
      // Disable button if loading or if no seats are selected[cite: 4]
      disabled={loading || selectedSeats.length === 0}
      // Using a different color (green) to distinguish it from the final Pay button[cite: 4]
      className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-bold"
    >
      {loading ? 'Verifying Seats...' : 'Proceed to Checkout'}
    </button>
  );
};

export default ProceedButton;