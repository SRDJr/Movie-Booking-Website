import mongoose from 'mongoose';

const theaterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      city: { type: String, required: true },
      address: { type: String, required: true },
    },
    screens: [
      {
        screenNumber: { type: Number, required: true },
        screenType: { type: String, enum: ['Standard', 'IMAX', 'VIP'], default: 'Standard' },
        // A 2D array where 1 = seat, 0 = aisle/gap
        seatLayout: [
            [Number] 
        ], 
        totalSeats: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save middleware to calculate total seats automatically
theaterSchema.pre('save', function (next) {
  this.screens.forEach((screen) => {
    // Count all values greater than 0 (assuming 0 is a gap)
    const seats = screen.seatLayout.flat().filter((val) => val > 0).length;
    screen.totalSeats = seats;
  });
});

export default mongoose.model('Theater', theaterSchema);