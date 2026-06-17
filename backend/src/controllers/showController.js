import Show from '../models/Show.js';
import Theater from '../models/Theater.js';
import Movie from '../models/Movie.js';

// @desc    Create a Show (and generate seat map)
// @route   POST /api/shows
// @access  Private/Admin
export const createShow = async (req, res) => {
  const { movieId, theaterId, screenNumber, startTime, price } = req.body;

  try {
    //Fetch Movie to get duration
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    // Calculate endTime based on movie duration + buffer (e.g., 20 mins cleaning)
    const CLEANING_BUFFER_MINUTES = 20;
    const durationInMs = (movie.duration + CLEANING_BUFFER_MINUTES) * 60 * 1000;

    const newStartTime = new Date(startTime);
    const newEndTime = new Date(newStartTime.getTime() + durationInMs);

    // CHECK FOR CONFLICTS
    // We look for any show in the SAME Theater & SAME Screen
    // where the time slots overlap.
    const existingShow = await Show.findOne({
      theater: theaterId,
      screenNumber: screenNumber,
      $or: [
        {
          // Case 1: New show starts during an existing show
          startTime: { $lt: newEndTime },
          endTime: { $gt: newStartTime }
        }
      ]
    });

    if (existingShow) {
      return res.status(400).json({ 
        message: 'Time slot conflict! Another show is running on this screen during this time.',
        conflictDetails: {
            existingStart: existingShow.startTime,
            existingEnd: existingShow.endTime
        }
      });
    }

    // 1. Get Theater and specific Screen
    const theater = await Theater.findById(theaterId);
    if (!theater) return res.status(404).json({ message: 'Theater not found' });

    const screen = theater.screens.find(s => s.screenNumber === screenNumber);
    if (!screen) return res.status(404).json({ message: 'Screen not found' });

    // 2. Generate Seat Map based on Theater Layout
    // We iterate the 2D array: row index = i, col index = j
    // If layout[i][j] == 1, it's a valid seat.
    const generatedSeats = [];
    
    screen.seatLayout.forEach((rowArr, rowIndex) => {
      rowArr.forEach((val, colIndex) => {
        if (val === 1) { // 1 = Seat, 0 = Aisle
          generatedSeats.push({
            row: rowIndex,
            col: colIndex,
            type: 'Platinum', // We can expand logic here for VIP if val == 2
            status: 'available'
          });
        }
      });
    });

    // 3. Save the Show
    const show = await Show.create({
      movie: movieId,
      theater: theaterId,
      screenNumber,
      startTime: newStartTime,
      endTime: newEndTime,
      price,
      seats: generatedSeats
    });

    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Shows by Movie (for Client Selection)
// @route   GET /api/shows/movie/:movieId?date=YYYY-MM-DD
// @access  Public
// ... inside getShowsByMovie function
export const getShowsByMovie = async (req, res) => {
  const { movieId } = req.params;
  const { date } = req.query;

  try {
    let query = { movie: movieId };

    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      // FIX: Only show shows between Start/End of day
      // AND ensure the show hasn't already started (if looking at today)
      const now = new Date();
      
      query.startTime = { 
        $gte: startOfDay, 
        $lt: endOfDay 
      };

      // If the user is querying "Today", filter out passed times
      if (startOfDay.getDate() === now.getDate()) {
         query.startTime = { $gte: now, $lt: endOfDay };
      }
    }

    const shows = await Show.find(query)
      .populate('theater', 'name location')
      .select('-seats'); // Don't send the heavy seat array here, just times

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Specific Show Details (Seating Map)
// @route   GET /api/shows/:id
// @access  Public (Protected later by Ticket flow)
export const getShowDetails = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movie', 'title')
      .populate('theater', 'name');

    if (!show) return res.status(404).json({ message: 'Show not found' });

    res.json(show);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};