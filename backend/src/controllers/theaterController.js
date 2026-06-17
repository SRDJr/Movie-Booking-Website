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