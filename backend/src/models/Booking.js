import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seats: [
      {
        row: { type: Number, required: true },
        col: { type: Number, required: true },
        seatNumber: { type: String } // Optional: "A1", "B5" derived from row/col
      }
    ],
    totalAmount: { type: Number, required: true },
    paymentId: { type: String, required: true }, // From Stripe/Razorpay
    status: { 
      type: String, 
      enum: ['Confirmed', 'Cancelled'], 
      default: 'Confirmed' 
    }
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);