import axios from 'axios';
import Movie from '../models/Movie.js';

// @desc    Search movies on TMDB (Proxy)
// @route   GET /api/movies/search?query=Avatar
// @access  Private/Admin
export const searchRemoteMovies = async (req, res) => {
  const { query } = req.query;
  
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie?query=${query}`,
      // `https://api.brokenurl.org/3/search/movie?query=${query}`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`
        }
      }
    );
    res.json(response.data.results);
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ message: 'Error fetching data from TMDB' });
  }
};

// Helper function to pause execution (Backoff)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// @desc    Import/Add a movie from TMDB to Local DB
// @route   POST /api/movies/import
// @access  Private/Admin
export const importMovie = async (req, res) => {
  const { tmdbId } = req.body;
  const MAX_RETRIES = 3;

  try {
    // 1. Check if movie already exists locally
    const exists = await Movie.findOne({ tmdbId });
    if (exists) {
      return res.status(400).json({ message: 'Movie already exists in the database' });
    }

    let tmdbData = null;
    let attempt = 0;
    let lastError = null;

    // 2. The Retry Loop (Max 3 attempts: 1 initial + 2 retries)
    while (attempt < MAX_RETRIES) {
      try {
        const response = await axios.get(
          `https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`,
          // `https://api.brokenurl.org/3/movie/${tmdbId}?language=en-US`,
          {
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${process.env.TMDB_API_KEY}`
            },
            timeout: 5000 // 5 second timeout per request
          }
        );
        tmdbData = response.data;
        break; // Success! Break out of the retry loop
      } catch (error) {
        attempt++;
        lastError = error;
        console.warn(`TMDB Import Attempt ${attempt} failed for ID ${tmdbId}`);
        
        if (attempt < MAX_RETRIES) {
          // Wait 1 second before the next retry (could be exponential)
          await sleep(1000); 
        }
      }
    }

    // 3. If all 3 attempts failed, return 502 Bad Gateway
    if (!tmdbData) {
      console.error('TMDB API completely failed:', lastError.message);
      return res.status(502).json({ 
        message: 'Upstream TMDB API is currently unavailable. Please try again later.' 
      });
    }

    // 4. Create new movie record from the successfully fetched data
    const movie = await Movie.create({
      tmdbId: tmdbData.id,
      title: tmdbData.title,
      description: tmdbData.overview,
      posterUrl: `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`,
      genre: tmdbData.genres.map((g) => g.name),
      language: tmdbData.original_language,
      duration: tmdbData.runtime,
      rating: tmdbData.vote_average,
      releaseDate: tmdbData.release_date,
    });

    res.status(201).json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all movies (Local DB)
// @route   GET /api/movies
// @access  Public
export const getMovies = async (req, res) => {
  try {
    const movies = await Movie.find({});
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};