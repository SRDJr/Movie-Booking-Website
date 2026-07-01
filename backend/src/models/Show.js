import mongoose from 'mongoose';

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
    screenNumber: { type: Number, required: true },
    startTime: { type: Date, required: true }, // Format: YYYY-MM-DDTHH:MM:SS
    endTime: { type: Date, required: true },
    pricing: {
      Platinum: { type: Number },
      Gold: { type: Number },
      Diamond: { type: Number }
    },
    
    // The dynamic seat map for THIS specific show
    seats: [
      {
        row: { type: Number, required: true },
        col: { type: Number, required: true },
        type: { type: String, enum: ['Gold', 'Platinum', 'Diamond'], default: 'Platinum' },
        status: { 
          type: String, 
          enum: ['available', 'locked', 'booked'], 
          default: 'available' 
        },
        lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        lockExpiresAt: { type: Date, default: null }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('Show', showSchema);