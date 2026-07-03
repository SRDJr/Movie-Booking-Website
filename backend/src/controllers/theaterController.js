import Theater from '../models/Theater.js';

// @desc    Create a new theater with screens
// @route   POST /api/theaters
// @access  Private/Admin
export const createTheater = async (req, res) => {
  const { name, location, screens } = req.body;

  try {
    // Check if the theater already exists by Name and exact Location
    let presentTheater = await Theater.findOne({
      name: name,
      'location.city': location.city,
      'location.address': location.address,
    });

    if (presentTheater) {
      // Theater exists. Iterate through incoming screens and add them.
      for (let newScreen of screens) {
        // Validation: Prevent adding a screen number that already exists
        const screenExists = presentTheater.screens.find(
          (s) => s.screenNumber === newScreen.screenNumber
        );
        
        if (screenExists) {
          return res.status(400).json({ 
            message: `Screen ${newScreen.screenNumber} already exists in ${name}, ${location.city}.` 
          });
        }
        
        // Push the new screen into the existing theater document
        presentTheater.screens.push(newScreen);
      }

      // Save the updated document
      const updatedTheater = await presentTheater.save();
      return res.status(200).json(updatedTheater);
    }

    // If theater doesn't exist create a new one
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

// @desc    Get available screen types from the Theater model
// @route   GET /api/theaters/screen-types
// @access  Admin
export const getScreenTypes = async (req, res) => {
  try {
    // Navigate the schema path to find the enum values for screenType
    // Adjust 'screens.screenType' if your nested schema path is slightly different
    const screenTypeEnums = Theater.schema.path('screens.screenType').enumValues;
    
    if (!screenTypeEnums) {
      return res.status(404).json({ message: "No screen types found in schema." });
    }

    res.json(screenTypeEnums);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};