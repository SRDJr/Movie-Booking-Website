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

// @desc    Import/Add a movie from TMDB to Local DB
// @route   POST /api/movies/import
// @access  Private/Admin
export const importMovie = async (req, res) => {
  const { tmdbId } = req.body; // Admin sends the TMDB ID

  try {
    // 1. Check if movie already exists
    const exists = await Movie.findOne({ tmdbId });
    if (exists) {
      return res.status(400).json({ message: 'Movie already exists' });
    }

    // 2. Fetch detailed info from TMDB using Headers
    const { data } = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`
        }
      }
    );

    // 3. Create new movie record
    const movie = await Movie.create({
      tmdbId: data.id,
      title: data.title,
      description: data.overview,
      posterUrl: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      genre: data.genres.map((g) => g.name),
      language: data.original_language,
      duration: data.runtime,
      rating: data.vote_average,
      releaseDate: data.release_date,
    });

    res.status(201).json(movie);
  } catch (error) {
    console.error(error); // Log error for debugging
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