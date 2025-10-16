// backend/controllers/userController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Profile = require("../models/Profile");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, {
    expiresIn: "3d",
  });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);

    res.status(200).json({
      token,
      user: {
        // Use _id (MongoDB standard) instead of id
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || null,
        role: user.role || "user",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const signupUser = async (req, res) => {
  const { username, email, password, phone } = req.body;
  try {
    const user = await User.signup(username, email, password, phone);

    // create linked profile
    await Profile.create({
      userId: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
    });

    const token = createToken(user._id);

    res.status(200).json({
      token,
      user: {
        // Use _id (MongoDB standard) instead of id
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || null,
        role: user.role || "user",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { loginUser, signupUser };
