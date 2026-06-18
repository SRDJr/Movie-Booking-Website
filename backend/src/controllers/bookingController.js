import Booking from '../models/Booking.js';
import Show from '../models/Show.js';
import mongoose from 'mongoose';

// @desc    Create new booking (Finalize Ticket)
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  const { showId, selectedSeats, amount, paymentId } = req.body;
  // selectedSeats = [{ row: 0, col: 1 }, { row: 0, col: 2 }]

  if (!paymentId) {
    return res.status(400).json({ message: 'paymentId is required' });
  }

  const session = await mongoose.startSession();
  try {
    let booking;
    let bookingWasExisting = false;
    await session.withTransaction(async () => {
      // Idempotency: if a booking with same paymentId exists, return it (inside the transaction)
      const existingBooking = await Booking.findOne({ paymentId }).session(session);
      if (existingBooking) {
        booking = existingBooking;
        bookingWasExisting = true;
        return;
      }
      // For any cases of Failure after payment, Refund Logic can be added later
      // Load the show document inside the transaction
      const show = await Show.findById(showId).session(session);
      if (!show) throw new Error('Show not found');

      // Is the show in the past?
      if (new Date(show.startTime) < new Date()) {
        throw new Error('Cannot book tickets for a past show.');
      }

      const userId = req.user._id.toString();
      const now = new Date();

      // Verify seats are locked by this user and locks not expired
      const invalidSeat = selectedSeats.find(reqSeat => {
        const showSeat = show.seats.find(
          s => s.row === reqSeat.row && s.col === reqSeat.col
        );
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
        const seatIndex = show.seats.findIndex(
          s => s.row === reqSeat.row && s.col === reqSeat.col
        );
        if (seatIndex > -1) {
          show.seats[seatIndex].status = 'booked';
          show.seats[seatIndex].lockedBy = null;
          show.seats[seatIndex].lockExpiresAt = null;
        }
      });

      await show.save({ session });

      // Create booking record inside the same transaction
      booking = await Booking.create([
        {
          user: req.user._id,
          show: showId,
          seats: selectedSeats,
          totalAmount: amount,
          paymentId: paymentId,
        },
      ], { session });

      // Booking.create returns an array when given an array
      booking = Array.isArray(booking) ? booking[0] : booking;
    });

    if (bookingWasExisting) {
      res.status(200).json(booking);
    } else {
      res.status(201).json(booking);
    }
  } catch (error) {
    // Distinguish known validation errors
    if (error.message === 'Show not found') {
      res.status(404).json({ message: error.message });
    } else if (error.message === 'Cannot book tickets for a past show.') {
      res.status(400).json({ message: error.message });
    } else if (error.message === 'One or more seats are not held by you or have expired.') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  } finally {
    session.endSession();
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
    const bookings = await Booking.find({ user: req.user._id })
      .populate({
        path: 'show',
        populate: {
            path: 'movie theater',
            select: 'title posterUrl name location'
        }
      })
      .sort({ createdAt: -1 }); // Newest first

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};