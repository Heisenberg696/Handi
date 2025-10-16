// frontend/src/components/PortfolioUploader/PortfolioUploader.js
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Images, Upload, RefreshCw, Trash2 } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import styles from "./PortfolioUploader.module.css";

const PortfolioUploader = ({
  currentImages = [],
  onImagesChange,
  label = "Portfolio",
  maxFiles = 6,
}) => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      // Check if adding these files would exceed maxFiles
      if (currentImages.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} images allowed`);
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const uploadPromises = acceptedFiles.map(async (file, index) => {
          const fileId = `${Date.now()}-${index}`;
          setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

          try {
            // 1. Get signature from backend
            const signatureRes = await axios.post(
              `${process.env.REACT_APP_API_URL}/api/uploads/signature`,
              {},
              { headers: getAuthHeader() }
            );

            const { signature, timestamp, apiKey, cloudName, folder } =
              signatureRes.data.data;

            // 2. Prepare form data for Cloudinary
            const formData = new FormData();
            formData.append("file", file);
            formData.append("signature", signature);
            formData.append("timestamp", timestamp);
            formData.append("api_key", apiKey);
            formData.append("folder", folder);

            // 3. Upload to Cloudinary with progress tracking
            const cloudinaryRes = await axios.post(
              `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
              formData,
              {
                onUploadProgress: (progressEvent) => {
                  const progress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  setUploadProgress((prev) => ({
                    ...prev,
                    [fileId]: progress,
                  }));
                },
              }
            );

            // Clean up progress tracking
            setUploadProgress((prev) => {
              const { [fileId]: _, ...rest } = prev;
              return rest;
            });

            return {
              url: cloudinaryRes.data.secure_url,
              public_id: cloudinaryRes.data.public_id,
            };
          } catch (err) {
            console.error("Upload error for file:", file.name, err);
            setUploadProgress((prev) => {
              const { [fileId]: _, ...rest } = prev;
              return rest;
            });
            throw new Error(`Failed to upload ${file.name}`);
          }
        });

        const uploadedImages = await Promise.all(uploadPromises);
        const updatedImages = [...currentImages, ...uploadedImages];
        onImagesChange(updatedImages);
      } catch (err) {
        console.error("Portfolio upload error:", err);
        setError(err.message || "Some uploads failed. Please try again.");
      } finally {
        setUploading(false);
        setUploadProgress({});
      }
    },
    [currentImages, maxFiles, getAuthHeader, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: maxFiles - currentImages.length,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploading || currentImages.length >= maxFiles,
  });

  const handleRemoveImage = async (indexToRemove) => {
    const imageToDelete = currentImages[indexToRemove];

    if (!imageToDelete?.public_id) {
      // If no public_id, just remove from array
      const updatedImages = currentImages.filter(
        (_, index) => index !== indexToRemove
      );
      onImagesChange(updatedImages);
      return;
    }

    setDeleting((prev) => ({ ...prev, [imageToDelete.public_id]: true }));
    setError(null);

    try {
      // Delete from Cloudinary via backend
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/uploads/destroy`,
        {
          headers: getAuthHeader(),
          data: { public_id: imageToDelete.public_id },
        }
      );

      // Remove from local array
      const updatedImages = currentImages.filter(
        (_, index) => index !== indexToRemove
      );
      onImagesChange(updatedImages);
    } catch (err) {
      console.error("Delete image error:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to delete image";
      setError(errorMessage);

      // Even if Cloudinary deletion fails, still remove from local array
      // to prevent UI inconsistency (the backend should handle cleanup)
      const updatedImages = currentImages.filter(
        (_, index) => index !== indexToRemove
      );
      onImagesChange(updatedImages);
    } finally {
      setDeleting((prev) => {
        const { [imageToDelete.public_id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleReplaceImage = async (indexToReplace, file) => {
    const oldImage = currentImages[indexToReplace];
    setError(null);
    setUploading(true);

    try {
      // Get signature
      const signatureRes = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/uploads/signature`,
        {},
        { headers: getAuthHeader() }
      );

      const { signature, timestamp, apiKey, cloudName, folder } =
        signatureRes.data.data;

      // Upload new image
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

      const newImage = {
        url: cloudinaryRes.data.secure_url,
        public_id: cloudinaryRes.data.public_id,
      };

      // Replace image at specific index
      const updatedImages = [...currentImages];
      updatedImages[indexToReplace] = newImage;
      onImagesChange(updatedImages);

      // Delete old image from Cloudinary (async, don't wait)
      if (oldImage?.public_id) {
        axios
          .delete(`${process.env.REACT_APP_API_URL}/api/uploads/destroy`, {
            headers: getAuthHeader(),
            data: { public_id: oldImage.public_id },
          })
          .catch((err) => {
            console.warn(
              "Failed to delete old image:",
              err.response?.data?.error || err.message
            );
          });
      }
    } catch (err) {
      console.error("Replace image error:", err);
      setError("Failed to replace image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isProgressActive = Object.keys(uploadProgress).length > 0;
  const isDeletingAny = Object.keys(deleting).length > 0;

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <Images size={18} className={styles.labelIcon} />
        {label}
        <span className={styles.counter}>
          ({currentImages.length}/{maxFiles})
        </span>
      </label>

      {/* Image Grid */}
      {currentImages.length > 0 && (
        <div className={styles.imageGrid}>
          {currentImages.map((image, index) => (
            <div
              key={`${image.public_id}-${index}`}
              className={styles.imageItem}
            >
              <img
                src={image.url}
                alt={`Portfolio ${index + 1}`}
                className={styles.thumbnail}
              />
              <div className={styles.imageOverlay}>
                <label className={styles.replaceButton}>
                  <RefreshCw size={14} />
                  Replace
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReplaceImage(index, file);
                    }}
                    disabled={uploading || isDeletingAny}
                    style={{ display: "none" }}
                  />
                </label>
                <button
                  onClick={() => handleRemoveImage(index)}
                  disabled={uploading || deleting[image.public_id]}
                  className={styles.removeButton}
                >
                  <Trash2 size={14} />
                  {deleting[image.public_id] ? "Removing..." : "Remove"}
                </button>
              </div>

              {/* Individual deletion loading overlay */}
              {deleting[image.public_id] && (
                <div className={styles.deletingOverlay}>
                  <div className={styles.deletingSpinner}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {isProgressActive && (
        <div className={styles.progressContainer}>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
              <span className={styles.progressText}>{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {currentImages.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`${styles.dropzone} ${
            isDragActive ? styles.dragActive : ""
          } ${uploading || isDeletingAny ? styles.disabled : ""}`}
        >
          <input {...getInputProps()} />
          <div className={styles.uploadIcon}>
            <Upload size={48} strokeWidth={1.5} />
          </div>
          <p className={styles.dropzoneText}>
            {isDragActive ? (
              "Drop images here..."
            ) : uploading ? (
              "Uploading..."
            ) : isDeletingAny ? (
              "Deleting..."
            ) : (
              <>
                <strong>Click to upload</strong> or drag and drop
              </>
            )}
          </p>
          <p className={styles.dropzoneHint}>
            PNG, JPG, WEBP up to 5MB each (Max {maxFiles - currentImages.length}{" "}
            more)
          </p>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default PortfolioUploader;
