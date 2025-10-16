// frontend/src/components/ImageUploader/ImageUploader.js
import { useState } from "react";
import axios from "axios";
import { Camera, Save, Loader2, User } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import styles from "./ImageUploader.module.css";

const ImageUploader = ({
  currentImage,
  onUploadSuccess,
  onSave,
  label = "Profile Picture",
}) => {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(currentImage?.url || null);
  const [pendingImage, setPendingImage] = useState(null);
  const [error, setError] = useState(null);
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const updateUser = useAuthStore((state) => state.updateUser);

  const getInitials = () => {
    const user = useAuthStore.getState().user;
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be less than 5MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const signatureRes = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/uploads/signature`,
        {},
        { headers: getAuthHeader() }
      );

      const { signature, timestamp, apiKey, cloudName, folder } =
        signatureRes.data.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("folder", folder);

      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      const uploadedImage = {
        url: cloudinaryRes.data.secure_url,
        public_id: cloudinaryRes.data.public_id,
      };

      setPreview(uploadedImage.url);
      setPendingImage(uploadedImage);
      e.target.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!pendingImage) return;

    setSaving(true);
    setError(null);

    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/profile/me`,
        { profilePicture: pendingImage },
        { headers: getAuthHeader() }
      );

      // Update the Zustand store with the new profile picture
      updateUser({ profilePicture: pendingImage });

      // Clear pending state
      setPendingImage(null);

      // Notify parent components
      onUploadSuccess?.(pendingImage);
      onSave?.(response.data);
    } catch (err) {
      console.error("Save error:", err);
      setError(
        err.response?.data?.error || "Failed to save image. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = pendingImage !== null;
  const displayImage = preview || currentImage?.url;

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <Camera size={16} />
        {label}
      </label>
      <div className={styles.uploadArea}>
        <div className={styles.imagePreview}>
          {displayImage ? (
            <img
              src={displayImage}
              alt="Preview"
              className={styles.previewImage}
            />
          ) : (
            <div className={styles.placeholder}>
              <User size={40} className={styles.placeholderIcon} />
            </div>
          )}
          {hasPendingChanges && (
            <div className={styles.pendingIndicator}>
              <span className={styles.pendingDot}></span>
            </div>
          )}
        </div>
        <div className={styles.uploadControls}>
          <div className={styles.buttonGroup}>
            <label htmlFor="image-upload" className={styles.uploadButton}>
              {uploading ? (
                <>
                  <Loader2 size={16} className={styles.spinningIcon} />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera size={16} />
                  Change
                </>
              )}
            </label>
            {hasPendingChanges && (
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className={styles.saveButton}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className={styles.spinningIcon} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            )}
          </div>
          <input
            id="image-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading || saving}
            className={styles.fileInput}
          />
          <p className={styles.hint}>
            JPG, PNG, WEBP (Max. 5MB)
            {hasPendingChanges && (
              <span className={styles.pendingText}> • Changes not saved</span>
            )}
          </p>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default ImageUploader;
