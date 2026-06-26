import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    adminSecret: ''
  });
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const { name, email, password, confirmPassword, adminSecret } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match"); // Or use toast.error
      return;
    }
    
    const success = await register(name, email, password, adminSecret);
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-primary mb-6">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Robert Downy Jr."
              value={name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
              value={email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="********"
              value={password}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="********"
              value={confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Admin Secret (Optional)</label>
            <input
              type="text"
              name="adminSecret"
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter key to register as Admin"
              value={adminSecret}
              onChange={handleChange}
            />
          </div>


          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded font-bold hover:bg-red-700 transition"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;