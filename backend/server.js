// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import connectDB from './src/config/db.js'; // Note the .js extension!

// import authRoutes from './src/routes/authRoutes.js';
// import movieRoutes from './src/routes/movieRoutes.js';
// import theaterRoutes from './src/routes/theaterRoutes.js';
// import showRoutes from './src/routes/showRoutes.js';

// dotenv.config();
// connectDB();

// const app = express();

// app.use(express.json());
// app.use(cors());

// // Mount Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/movies', movieRoutes);
// app.use('/api/theaters', theaterRoutes);
// app.use('/api/shows', showRoutes);

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http'; // Standard Node HTTP module
import { Server } from 'socket.io';  // Socket.io library
import connectDB from './src/config/db.js';

import authRoutes from './src/routes/authRoutes.js';
import movieRoutes from './src/routes/movieRoutes.js';
import theaterRoutes from './src/routes/theaterRoutes.js';
import showRoutes from './src/routes/showRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import { handleSeatSocket } from './src/sockets/seatSocket.js'; // We will create this next

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app); // Wrap Express

// Configure Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for now (Restrict to your React frontend URL in production)
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);

// Initialize Socket Logic
handleSeatSocket(io);

const PORT = process.env.PORT || 5000;

// Note: We listen on httpServer, NOT app
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});