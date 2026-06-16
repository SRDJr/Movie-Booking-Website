import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    posterUrl: { type: String }, // We will store the full URL
    genre: [String],
    language: { type: String },
    duration: { type: Number }, // in minutes
    rating: { type: Number },
    releaseDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Movie', movieSchema);