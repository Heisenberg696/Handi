const express = require("express");
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  getProfileByUserId,
  searchProfiles,
} = require("../controllers/profileController");

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.get("/user/:userId", getProfileByUserId);
router.get("/", searchProfiles);

module.exports = router;
