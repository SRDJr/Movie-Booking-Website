import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  // Wait for the context to finish checking the token
  if (loading) return <div className="text-center p-20">Checking permissions...</div>;

  // If not logged in, or logged in but NOT an admin -> Kick to Home
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If they pass the check, let them in!
  return children;
};

export default AdminRoute;