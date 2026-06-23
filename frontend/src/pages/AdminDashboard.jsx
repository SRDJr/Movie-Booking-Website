import { useState } from 'react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('movies');

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* The Tabs */}
      <div className="flex space-x-4 border-b border-gray-300 mb-8">
        <button
          onClick={() => setActiveTab('movies')}
          className={`py-2 px-4 font-semibold ${activeTab === 'movies' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Movies
        </button>
        <button
          onClick={() => setActiveTab('theaters')}
          className={`py-2 px-4 font-semibold ${activeTab === 'theaters' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Theaters
        </button>
        <button
          onClick={() => setActiveTab('shows')}
          className={`py-2 px-4 font-semibold ${activeTab === 'shows' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manage Shows
        </button>
      </div>

      {/* The Content Areas */}
      <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px]">
        {activeTab === 'movies' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Import Movies from TMDB</h2>
            <p className="text-gray-500">We will add the TMDB search bar here next!</p>
          </div>
        )}
        
        {activeTab === 'theaters' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Create Theaters & Screens</h2>
            <p className="text-gray-500">Theater layout builder goes here.</p>
          </div>
        )}

        {activeTab === 'shows' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Schedule Shows</h2>
            <p className="text-gray-500">Show scheduling form goes here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;