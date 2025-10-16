// frontend/src/components/ProfileForm/ProfileForm.js
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  FileText,
  Award,
  Image as ImageIcon,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import ImageUploader from "../ImageUploader/ImageUploader";
import PortfolioUploader from "../PortfolioUploader/PortfolioUploader";
import styles from "./ProfileForm.module.css";

const ProfileForm = ({ profileData, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    profilePicture: null,
    bio: "",
    skills: "",
    portfolioImages: [],
    location: "",
    availability: "",
    rate: "",
    phone: "",
    category: "",
  });

  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);

  // Pre-fill form with existing data
  useEffect(() => {
    if (profileData) {
      setFormData({
        profilePicture: profileData.profilePicture || null,
        bio: profileData.bio || "",
        skills: Array.isArray(profileData.skills)
          ? profileData.skills.join(", ")
          : profileData.skills || "",
        portfolioImages: profileData.portfolioImages || [],
        location: profileData.location || "",
        availability: profileData.availability || "",
        rate: profileData.rate || "",
        phone: profileData.phone || "",
        category: profileData.category || "",
      });
    }
  }, [profileData]);

  // React Query mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/profile/me`,
        data,
        { headers: getAuthHeader() }
      );
      return response.data;
    },
    onSuccess: (data) => {
      onSuccess?.(data);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.error || "Failed to update profile";
      onError?.(errorMessage);
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfilePictureChange = (imageData) => {
    setFormData((prev) => ({
      ...prev,
      profilePicture: imageData,
    }));
  };

  const handleProfilePictureSave = (updatedProfile) => {
    // Refresh the profile data to show the saved image
    onSuccess?.(updatedProfile);
  };

  const handlePortfolioChange = (images) => {
    setFormData((prev) => ({
      ...prev,
      portfolioImages: images,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Extract numeric value from rate (remove currency symbols and text)
    let numericRate = undefined;
    if (formData.rate) {
      // Remove common currency symbols and extract numbers
      const rateString = String(formData.rate).replace(/[$£€¥₹₵,]/g, "");
      const match = rateString.match(/[\d.]+/);
      if (match) {
        numericRate = parseFloat(match[0]);
      }
    }

    // Prepare data for API
    const submitData = {
      ...formData,
      rate: numericRate,
    };

    // Only include profilePicture if it has been changed/set
    if (!formData.profilePicture || !formData.profilePicture.url) {
      delete submitData.profilePicture;
    }

    updateProfileMutation.mutate(submitData);
  };

  const isLoading = updateProfileMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Profile Picture */}
      <ImageUploader
        currentImage={formData.profilePicture}
        onUploadSuccess={handleProfilePictureChange}
        onSave={handleProfilePictureSave}
        label="Profile Picture"
      />

      {/* Personal Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <User size={20} />
          Personal Information
        </h3>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              <User size={16} />
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={profileData?.username || ""}
              disabled
              className={`${styles.input} ${styles.disabled}`}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              <User size={16} />
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              placeholder="Caitie"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <Mail size={16} />
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={profileData?.email || ""}
            disabled
            className={`${styles.input} ${styles.disabled}`}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <Phone size={16} />
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+233 24 123 4567"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <MapPin size={16} />
            Location
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Accra, Ghana"
            className={styles.input}
          />
        </div>
      </div>

      {/* Professional Details */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Briefcase size={20} />
          Professional Details
        </h3>

        {/* Category Field */}
        <div className={styles.field}>
          <label className={styles.label}>
            <Briefcase size={16} />
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={styles.select}
          >
            <option value="">Select a category</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical Work">Electrical Work</option>
            <option value="Cleaning and Maintenance">
              Cleaning and Maintenance
            </option>
            <option value="Carpentry">Carpentry</option>
            <option value="Drainage and Waste Management">
              Drainage and Waste Management
            </option>
            <option value="Painting">Painting</option>
            <option value="Handyman">Handyman</option>
            <option value="Roofing Carpentry">Roofing Carpentry</option>
            <option value="Masonry">Masonry</option>
            <option value="MetalWork">MetalWork</option>
            <option value="Outdoor Maintenance">Outdoor Maintenance</option>
          </select>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              <Award size={16} />
              Profession
            </label>
            <input
              type="text"
              name="profession"
              placeholder="Developer"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              <Award size={16} />
              Years of Experience
            </label>
            <input
              type="number"
              name="experience"
              placeholder="5"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <Award size={16} />
            Skills
          </label>
          <input
            type="text"
            name="skills"
            value={formData.skills}
            onChange={handleInputChange}
            placeholder="Plumbing, Pipe Installation, Leak Repair"
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              <Clock size={16} />
              Availability
            </label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="">Select availability</option>
              <option value="Mon - Fri 9am - 5pm">Mon - Fri 9am - 5pm</option>
              <option value="Mon - Fri 6pm - 10pm">Mon - Fri 6pm - 10pm</option>
              <option value="Weekends only">Weekends only</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              <DollarSign size={16} />
              Rate
            </label>
            <input
              type="text"
              name="rate"
              value={formData.rate}
              onChange={handleInputChange}
              placeholder="₵75/hour"
              className={styles.input}
            />
          </div>
        </div>
      </div>

      {/* About */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FileText size={20} />
          About
        </h3>
        <div className={styles.field}>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Write a few sentences about yourself..."
            className={styles.textarea}
            rows="4"
          />
        </div>
      </div>

      {/* Portfolio */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ImageIcon size={20} />
          Portfolio
        </h3>
        <p className={styles.sectionSubtitle}>Showcase your previous work</p>
        <PortfolioUploader
          currentImages={formData.portfolioImages}
          onImagesChange={handlePortfolioChange}
          maxFiles={6}
        />
      </div>

      {/* Submit Buttons */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Error Display */}
      {updateProfileMutation.isError && (
        <div className={styles.error}>
          {updateProfileMutation.error?.response?.data?.error ||
            "Failed to update profile"}
        </div>
      )}
    </form>
  );
};

export default ProfileForm;
