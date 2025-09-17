const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    username: { type: String, required: true, immutable: true },
    email: { type: String, required: true, immutable: true },
    phone: { type: String },

    // Profile picture (always an object with url + public_id)
    profilePicture: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    bio: { type: String },

    skills: [{ type: String }],

    // Portfolio images (array of objects)
    portfolioImages: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],

    location: { type: String },
    availability: { type: String },
    rate: { type: Number, defaul: 0 },

    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    rating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for simple text-based searching by username/bio/skills/location
profileSchema.index({
  username: "text",
  bio: "text",
  skills: "text",
  location: "text",
});

module.exports = mongoose.model("Profile", profileSchema);
