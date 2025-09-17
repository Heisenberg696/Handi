const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  { timestamps: true }
);

userSchema.statics.signup = async function (username, email, password, phone) {
  if (!username || !email || !password) {
    throw new Error("Name, email and password are required");
  }
  if (!validator.isEmail(email)) {
    throw new Error("A valid email is required");
  }
  if (!validator.isStrongPassword(password)) {
    throw new Error("Provide a stronger password");
  }
  if (phone && !validator.isMobilePhone(phone, "en-GH")) {
    throw new Error("Invalid Ghanaian phone number");
  }

  const emailExists = await this.findOne({ email: email.toLowerCase() });
  if (emailExists) throw new Error("Email already exists");

  const usernameExists = await this.findOne({ username: username.trim() });
  if (usernameExists) throw new Error("Username already exists");

  if (phone) {
    const phoneExists = await this.findOne({ phone });
    if (phoneExists) throw new Error("Phone already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  // Create user (store phone if provided)
  const user = await this.create({
    username: username.trim(),
    email: email.toLowerCase(),
    password: hash,
    phone: phone || undefined,
  });

  return user;
};

// LOGIN
userSchema.statics.login = async function (email, password) {
  if (!email || !password) {
    throw new Error("All fields are required");
  }

  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("Incorrect email");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Incorrect password");

  return user;
};

module.exports = mongoose.model("User", userSchema);
