// frontend/src/components/PostJobModal/PostJobModal.js
import { useState } from "react";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import JobImageUploader from "../JobImageUploader/JobImageUploader";
import styles from "./PostJobModal.module.css";

const PostJobModal = ({ isOpen, onClose, workerId, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);

  const handleImagesChange = (uploadedImages) => {
    setImages(uploadedImages);
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError("Job title is required");
      return false;
    }
    if (!description.trim()) {
      setError("Job description is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        workerId,
        title: title.trim(),
        description: description.trim(),
        rate: rate ? Number(rate) : undefined,
        images,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/jobs/create`,
        payload,
        { headers: getAuthHeader() }
      );

      setSuccessMessage("Job posted successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setRate("");
      setImages([]);

      // Call success callback if provided
      onSuccess?.(response.data.job);

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Job creation error:", err);
      setError(
        err.response?.data?.error || "Failed to post job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form on close
      setTitle("");
      setDescription("");
      setRate("");
      setImages([]);
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Post a Job</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className={styles.successBanner}>
            <p>{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title Field */}
          <div className={styles.formGroup}>
            <label htmlFor="job-title" className={styles.label}>
              Job Title *
            </label>
            <input
              id="job-title"
              type="text"
              placeholder="e.g., Fix kitchen sink"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className={styles.input}
            />
          </div>

          {/* Description Field */}
          <div className={styles.formGroup}>
            <label htmlFor="job-description" className={styles.label}>
              Description *
            </label>
            <textarea
              id="job-description"
              placeholder="Describe the job in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className={styles.textarea}
              rows={5}
            />
          </div>

          {/* Rate Field */}
          <div className={styles.formGroup}>
            <label htmlFor="job-rate" className={styles.label}>
              Rate (Optional)
            </label>
            <div className={styles.rateInputWrapper}>
              <input
                id="job-rate"
                type="number"
                placeholder="Enter hourly rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                disabled={loading}
                className={styles.input}
                min="0"
                step="0.01"
              />
              <span className={styles.rateSuffix}>/hour</span>
            </div>
          </div>

          {/* Image Uploader */}
          <div className={styles.formGroup}>
            <JobImageUploader
              multiple={true}
              onChange={handleImagesChange}
              folder="handi/jobs"
            />
          </div>

          {/* Error Message */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Button Group */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Posting..." : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostJobModal;
