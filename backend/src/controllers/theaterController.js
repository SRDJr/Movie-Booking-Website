import Theater from '../models/Theater.js';

// @desc    Create a new theater with screens
// @route   POST /api/theaters
// @access  Private/Admin
export const createTheater = async (req, res) => {
  const { name, location, screens } = req.body;

  try {
    const theater = new Theater({
      name,
      location,
      screens,
    });

    const createdTheater = await theater.save();
    res.status(201).json(createdTheater);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all theaters (can filter by city)
// @route   GET /api/theaters?city=Mumbai
// @access  Public
export const getTheaters = async (req, res) => {
  const { city } = req.query;
  let query = {};

  if (city) {
    query = { 'location.city': { $regex: city, $options: 'i' } };
  }

  try {
    const theaters = await Theater.find(query);
    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get distinct cities with active theaters
// @route   GET /api/theaters/cities
// @access  Public
export const getDistinctCities = async (req, res) => {
  try {
    // MongoDB fetches all unique values for the 'location.city' field
    const cities = await Theater.distinct('location.city');
    
    // Clean the data: remove any empty/null values and sort alphabetically
    const cleanCities = cities
      .filter(city => city && city.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

    res.json(cleanCities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};