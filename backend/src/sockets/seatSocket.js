import jwt from 'jsonwebtoken';
import Show from '../models/Show.js';

export const handleSeatSocket = (io) => {
  // Periodic cleanup: clear expired locks every minute
  const CLEAR_INTERVAL_MS = 60 * 1000; // 1 minute

  const clearExpiredLocks = async () => {
    try {
      const now = new Date();
      // Find shows that have at least one expired lock
      const shows = await Show.find({ 'seats.lockExpiresAt': { $lt: now } });
      for (const show of shows) {
        const expiredSeats = [];
        let changed = false;
        show.seats.forEach((s) => {
          if (s.status === 'locked' && s.lockExpiresAt && new Date(s.lockExpiresAt) < now) {
            expiredSeats.push({ row: s.row, col: s.col });
            s.status = 'available';
            s.lockedBy = null;
            s.lockExpiresAt = null;
            changed = true;
          }
        });

        if (changed) {
          await show.save();
          // Notify clients about each released seat
          expiredSeats.forEach(({ row, col }) => {
            io.to(show._id.toString()).emit('seat_updated', {
              row,
              col,
              status: 'available',
              lockedBy: null,
            });
          });
        }
      }
    } catch (error) {
      console.error('Error clearing expired locks:', error);
    }
  };

  // Start periodic cleanup
  const cleanupInterval = setInterval(clearExpiredLocks, CLEAR_INTERVAL_MS);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate socket using token sent in handshake (auth.token) or Authorization header
    const token = socket.handshake.auth && socket.handshake.auth.token
      ? socket.handshake.auth.token
      : (socket.handshake.headers && socket.handshake.headers.authorization
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      socket.emit('unauthorized', { message: 'Authentication token required' });
      socket.disconnect(true);
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Attach userId to socket for server-side use
      socket.data.userId = decoded.id;
    } catch (err) {
      socket.emit('unauthorized', { message: 'Invalid token' });
      socket.disconnect(true);
      return;
    }

    // 1. Join a Room (Specific Show)
    socket.on('join_show', (showId) => {
      socket.join(showId);
      console.log(`Socket ${socket.id} (user ${socket.data.userId}) joined show room: ${showId}`);
    });

    // 2. Handle Lock Request (server derives userId)
    socket.on('request_seat_lock', async ({ showId, row, col }) => {
      try {
        const userId = socket.data.userId;
        console.log(`Lock Request: Show ${showId} Seat ${row}-${col} by User ${userId}`);

        // ATOMIC UPDATE: Only update if the specific seat is currently 'available'
        const result = await Show.updateOne(
          {
            _id: showId,
            seats: { $elemMatch: { row: row, col: col, status: 'available' } },
          },
          {
            $set: {
              'seats.$.status': 'locked',
              'seats.$.lockedBy': userId,
              'seats.$.lockExpiresAt': new Date(Date.now() + 5 * 60 * 1000), // 5 Minutes
            },
          }
        );

        if (result.modifiedCount > 0) {
          // Success! Broadcast update to EVERYONE in the room
          io.to(showId).emit('seat_updated', {
            row,
            col,
            status: 'locked',
            lockedBy: userId,
          });

          // Set a Timer to Auto-Release (if not booked)
          setTimeout(async () => {
            await releaseSeatIfStillLocked(io, showId, row, col, userId);
          }, 5 * 60 * 1000); // 5 Minutes
        } else {
          // Failed (Seat was already taken)
          socket.emit('lock_failed', { message: 'Seat already unavailable' });
        }
      } catch (error) {
        console.error('Socket Error:', error);
      }
    });

    // 3. Handle Unlock Request (when the locker clicks again)
    socket.on('request_seat_unlock', async ({ showId, row, col }) => {
      try {
        const userId = socket.data.userId;
        // Only release if still locked by this user
        const result = await Show.updateOne(
          {
            _id: showId,
            seats: { $elemMatch: { row: row, col: col, status: 'locked', lockedBy: userId } },
          },
          {
            $set: {
              'seats.$.status': 'available',
              'seats.$.lockedBy': null,
              'seats.$.lockExpiresAt': null,
            },
          }
        );

        if (result.modifiedCount > 0) {
          io.to(showId).emit('seat_updated', {
            row,
            col,
            status: 'available',
            lockedBy: null,
          });
          socket.emit('unlock_success', { row, col });
        } else {
          socket.emit('unlock_failed', { message: 'Unlock failed — seat not locked by you or already released' });
        }
      } catch (error) {
        console.error('Unlock Error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected', socket.id);
    });
  });

  // Cleanup when server is shutting down (clear interval)
  const shutdown = () => {
    clearInterval(cleanupInterval);
  };

  // Optional: attach to process events (best-effort)
  process.on('exit', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

// Helper: Auto-Release Logic (only releases if still locked by the same user)
const releaseSeatIfStillLocked = async (io, showId, row, col, userId) => {
  try {
    const result = await Show.updateOne(
      {
        _id: showId,
        seats: { $elemMatch: { row: row, col: col, status: 'locked', lockedBy: userId } },
      },
      {
        $set: {
          'seats.$.status': 'available',
          'seats.$.lockedBy': null,
          'seats.$.lockExpiresAt': null,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Auto-released seat ${row}-${col} for show ${showId}`);
      // Notify clients that seat is free again
      io.to(showId).emit('seat_updated', {
        row,
        col,
        status: 'available',
        lockedBy: null,
      });
    }
  } catch (error) {
    console.error('Auto-release error:', error);
  }
};