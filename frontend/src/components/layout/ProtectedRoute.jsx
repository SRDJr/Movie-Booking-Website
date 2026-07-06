import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, isAdmin, loading } = useAuth();

    // Wait for the context to finish checking the token
    if (loading) return <div className="text-center p-20">Checking permissions...</div>;

    // KICKOUT 1: If not logged in -> Send to Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // KICKOUT 2: If logged in but an admin -> Send to Admin Workspace
    if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    // If they pass the check, let them in!
    return children;
};

export default ProtectedRoute;