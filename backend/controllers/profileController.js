// backend/controllers/profileController.js
const Profile = require("../models/Profile");
const User = require("../models/User");
const validator = require("validator");

// GET /api/profile/me?page=1&limit=10
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let profile = await Profile.findOne({ userId }).populate({
      path: "reviews",
      options: { sort: { createdAt: -1 }, skip, limit },
    });

    if (!profile) {
      const user = await User.findById(userId).select("username email phone");
      profile = await Profile.create({
        userId,
        username: user.username,
        email: user.email,
        phone: user.phone || undefined,
        profilePicture: { url: "", public_id: "" },
        portfolioImages: [],
      });
    }

    const totalReviews = await Profile.aggregate([
      { $match: { userId } },
      { $project: { count: { $size: "$reviews" } } },
    ]);

    return res.status(200).json({
      profile,
      reviewsMeta: {
        page,
        limit,
        total: totalReviews[0]?.count || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/profile/me (UPDATED - added category support)
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      profilePicture,
      bio,
      skills,
      portfolioImages,
      location,
      availability,
      rate,
      phone,
      category, // NEW
    } = req.body;

    // Validate phone number if provided
    if (phone !== undefined && phone !== "") {
      if (!validator.isMobilePhone(phone, "en-GH")) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      // Check if phone number is already taken by another user
      const existingUser = await User.findOne({
        phone,
        _id: { $ne: userId }, // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({ error: "Phone number already in use" });
      }

      // Update phone in User model as well
      await User.findByIdAndUpdate(userId, { phone });
    }

    let skillsArr = [];
    if (typeof skills === "string") {
      skillsArr = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(skills)) {
      skillsArr = skills.map((s) => String(s).trim()).filter(Boolean);
    }

    let portfolioArr = [];
    if (Array.isArray(portfolioImages)) {
      portfolioArr = portfolioImages
        .map((img) => ({
          url: String(img.url).trim(),
          public_id: String(img.public_id).trim(),
        }))
        .filter((img) => img.url && img.public_id);
    }

    let pictureObj = undefined;
    if (profilePicture && profilePicture.url && profilePicture.public_id) {
      pictureObj = {
        url: String(profilePicture.url).trim(),
        public_id: String(profilePicture.public_id).trim(),
      };
    }

    const update = {
      ...(pictureObj && { profilePicture: pictureObj }),
      ...(bio !== undefined && { bio }),
      ...(skillsArr.length && { skills: skillsArr }),
      ...(portfolioArr.length && { portfolioImages: portfolioArr }),
      ...(location !== undefined && { location }),
      ...(availability !== undefined && { availability }),
      ...(rate !== undefined && { rate }),
      ...(phone !== undefined && { phone }),
      ...(category !== undefined && { category }), // NEW
    };

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId },
      { $set: update },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).populate("reviews");

    return res.status(200).json(updatedProfile);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// GET /api/profile/user/:userId?page=1&limit=10
const getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const profile = await Profile.findOne({ userId }).populate({
      path: "reviews",
      options: { sort: { createdAt: -1 }, skip, limit },
    });

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const totalReviews = await Profile.aggregate([
      { $match: { userId: profile.userId } },
      { $project: { count: { $size: "$reviews" } } },
    ]);

    return res.status(200).json({
      profile,
      reviewsMeta: {
        page,
        limit,
        total: totalReviews[0]?.count || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/profile?q=&skill=&location=&category=&page=&limit= (UPDATED - added category filter)
const searchProfiles = async (req, res) => {
  try {
    const { q, skill, location, category, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (q) filter.$text = { $search: q };
    if (skill) filter.skills = skill;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (category) filter.category = category; // NEW: Filter by category

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const total = await Profile.countDocuments(filter);
    const profiles = await Profile.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      meta: { total, page: Number(page), limit: Number(limit) },
      data: profiles,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getProfileByUserId,
  searchProfiles,
};
