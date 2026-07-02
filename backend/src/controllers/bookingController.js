import Booking from '../models/Booking.js';
import Show from '../models/Show.js';
import mongoose from 'mongoose';

// Internal service function that executes the transaction
export const executeBookingCore = async ({ showId, selectedSeats, amount, paymentId, user }) => {
  if (!paymentId) throw new Error('paymentId is required');

  const session = await mongoose.startSession();
  try {
    let booking;
    let bookingWasExisting = false;

    await session.withTransaction(async () => {
      // Idempotency check
      const existingBooking = await Booking.findOne({ paymentId }).session(session);
      if (existingBooking) {
        booking = existingBooking;
        bookingWasExisting = true;
        return;
      }

      const show = await Show.findById(showId)
        .populate('movie', 'title')
        .populate('theater', 'name')
        .session(session);
      if (!show) throw new Error('Show not found');

      if (new Date(show.startTime) < new Date()) {
        throw new Error('Cannot book tickets for a past show.');
      }

      const userId = user._id.toString();
      const now = new Date();

      const invalidSeat = selectedSeats.find(reqSeat => {
        const showSeat = show.seats.find(s => s.row === reqSeat.row && s.col === reqSeat.col);
        if (!showSeat) return true;
        if (showSeat.status !== 'locked') return true;
        if (!showSeat.lockedBy) return true;
        if (showSeat.lockedBy.toString() !== userId) return true;
        if (showSeat.lockExpiresAt && new Date(showSeat.lockExpiresAt) < now) return true;
        return false;
      });

      if (invalidSeat) {
        throw new Error('One or more seats are not held by you or have expired.');
      }

      // Mark seats as booked
      selectedSeats.forEach(reqSeat => {
        const seatIndex = show.seats.findIndex(s => s.row === reqSeat.row && s.col === reqSeat.col);
        if (seatIndex > -1) {
          show.seats[seatIndex].status = 'booked';
          show.seats[seatIndex].lockedBy = null;
          show.seats[seatIndex].lockExpiresAt = null;
        }
      });

      await show.save({ session });

      const showSnapshot = {
        movieTitle: show.movie.title,
        theaterName: show.theater.name,
        screenNumber: show.screenNumber,
        startTime: show.startTime,
      };

      const enrichedSeats = selectedSeats.map(reqSeat => {
        const dbSeat = show.seats.find(s => s.row === reqSeat.row && s.col === reqSeat.col);
        return {
          row: reqSeat.row,
          col: reqSeat.col,
          seatNumber: dbSeat?.seatNumber || `R${reqSeat.row}-C${reqSeat.col}`,
          tier: dbSeat?.type || 'Standard'
        };
      });

      booking = await Booking.create([
        {
          user: user._id,
          show: showId,
          showSnapshot,
          seats: enrichedSeats,
          totalAmount: amount,
          paymentId: paymentId,
        },
      ], { session });

      booking = Array.isArray(booking) ? booking[0] : booking;
    });

    return { booking, bookingWasExisting };
  } finally {
    session.endSession();
  }
};

// @desc    Create new booking (Finalize Ticket)
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  try {
    const { showId, selectedSeats, amount, paymentId } = req.body;
    const { booking, bookingWasExisting } = await executeBookingCore({
      showId, selectedSeats, amount, paymentId, user: req.user
    });

    res.status(bookingWasExisting ? 200 : 201).json(booking);
  } catch (error) {
    if (['Show not found', 'paymentId is required'].includes(error.message)) {
      res.status(404).json({ message: error.message });
    } else if (['Cannot book tickets for a past show.', 'One or more seats are not held by you or have expired.'].includes(error.message)) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

// Pre-payment verification endpoint
export const verifyBeforePayment = async (req, res) => {
  const { showId, selectedSeats } = req.body;
  // selectedSeats = [{ row: 0, col: 1 }, { row: 0, col: 2 }]

  try {
    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ message: 'Show not found' });

    // Is the show in the past?
    if (new Date(show.startTime) < new Date()) {
      return res.status(400).json({ message: 'Cannot book tickets for a past show.' });
    }

    const userId = req.user._id.toString();
    const now = new Date();

    const invalidSeat = selectedSeats.find(reqSeat => {
      const showSeat = show.seats.find(
        s => s.row === reqSeat.row && s.col === reqSeat.col
      );
      if (!showSeat) return true;
      // Seat must be available OR already locked by this user and not expired
      if (showSeat.status === 'available') return false;
      if (showSeat.status === 'locked') {
        if (!showSeat.lockedBy) return true;
        if (showSeat.lockedBy.toString() === userId && (!showSeat.lockExpiresAt || new Date(showSeat.lockExpiresAt) > now)) {
          return false;
        }
        return true;
      }
      // If seat is booked or any other status, it's invalid
      return true;
    });

    if (invalidSeat) {
      return res.status(400).json({ message: 'One or more seats are not available or held by others.' });
    }

    // All good — return success. Frontend should proceed to payment.
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user's bookings
// @route   GET /api/bookings/mybookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};