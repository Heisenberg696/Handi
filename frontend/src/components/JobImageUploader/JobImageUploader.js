// frontend/src/components/JobImageUploader/JobImageUploader.js
import { useState } from "react";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import styles from "./JobImageUploader.module.css";

const JobImageUploader = ({
  multiple = true,
  onChange,
  folder = "handi/jobs",
}) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // If not multiple, limit to 1 file
    const filesToUpload = multiple ? files : files.slice(0, 1);

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    // Validate all files
    for (const file of filesToUpload) {
      if (!allowedTypes.includes(file.type)) {
        setError("Only JPG, PNG, and WEBP images are allowed");
        return;
      }
      if (file.size > maxSize) {
        setError("File size must be less than 5MB");
        return;
      }
    }

    setError(null);
    setUploading(true);

    try {
      // Get signature from backend with folder param
      const signatureRes = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/uploads/signature`,
        { folder },
        { headers: getAuthHeader() }
      );

      const {
        signature,
        timestamp,
        apiKey,
        cloudName,
        folder: returnedFolder,
      } = signatureRes.data.data;

      const uploadedImages = [];

      // Upload each file
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp);
        formData.append("api_key", apiKey);
        formData.append("folder", returnedFolder);

        const cloudinaryRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          formData
        );

        uploadedImages.push({
          url: cloudinaryRes.data.secure_url,
          public_id: cloudinaryRes.data.public_id,
        });
      }

      // Update state and call parent callback
      const newImages = multiple
        ? [...images, ...uploadedImages]
        : uploadedImages;
      setImages(newImages);
      onChange?.(newImages);

      e.target.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (index) => {
    const imageToDelete = images[index];

    try {
      setError(null);

      // Call backend to destroy image from Cloudinary
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/uploads/destroy`,
        { public_id: imageToDelete.public_id },
        { headers: getAuthHeader() }
      );

      // Remove from local state
      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      onChange?.(newImages);
    } catch (err) {
      console.error("Delete error:", err);
      setError(
        err.response?.data?.error || "Failed to delete image. Please try again."
      );
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {multiple ? "Job Images" : "Job Image"}
      </label>

      <div className={styles.uploadArea}>
        <label htmlFor="job-image-upload" className={styles.uploadButton}>
          {uploading ? "Uploading..." : "Choose Image(s)"}
        </label>
        <input
          id="job-image-upload"
          type="file"
          multiple={multiple}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className={styles.fileInput}
        />
        <p className={styles.hint}>
          JPG, PNG, WEBP (Max. 5MB per image)
          {multiple && " • Select one or more images"}
        </p>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className={styles.previewGrid}>
          {images.map((image, index) => (
            <div key={index} className={styles.previewItem}>
              <img
                src={image.url}
                alt={`Preview ${index + 1}`}
                className={styles.previewImage}
              />
              <button
                onClick={() => handleDeleteImage(index)}
                disabled={uploading}
                className={styles.deleteButton}
                title="Delete image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {images.length > 0 && (
        <p className={styles.successText}>
          {images.length} image{images.length !== 1 ? "s" : ""} ready to upload
        </p>
      )}
    </div>
  );
};

export default JobImageUploader;
