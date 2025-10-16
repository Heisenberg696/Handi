// frontend/src/components/ReviewModal/ReviewModal.js
import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import StarRating from "../StarRating/StarRating";
import styles from "./ReviewModal.module.css";

const ReviewModal = ({ isOpen, onClose, jobId, workerId, onSuccess }) => {
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing review if available
  useEffect(() => {
    if (isOpen && jobId) {
      fetchExistingReview();
    }
  }, [isOpen, jobId]);

  const fetchExistingReview = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/reviews/job/${jobId}`,
        { headers: getAuthHeader() }
      );

      if (response.data.review) {
        setRating(response.data.review.rating);
        setComment(response.data.review.comment || "");
        setIsEditing(true);
      }
    } catch (err) {
      // No existing review, allow creating new one
      setRating(0);
      setComment("");
      setIsEditing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate rating
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reviews/${jobId}`,
        { rating, comment },
        { headers: getAuthHeader() }
      );

      // Success
      if (onSuccess) {
        onSuccess(response.data.review);
      }

      // Reset form
      setRating(0);
      setComment("");
      setIsEditing(false);

      // Close modal
      onClose();
    } catch (err) {
      console.error("Review submission error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to submit review. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditing ? "Edit Review" : "Leave a Review"}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Error Message */}
          {error && (
            <div className={styles.errorContainer}>
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* Star Rating */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Rating *</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Comment */}
          <div className={styles.formGroup}>
            <label htmlFor="comment" className={styles.label}>
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              className={styles.textarea}
              placeholder="Share your experience with this worker..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              disabled={loading}
              rows={5}
            />
            <span className={styles.charCount}>
              {comment.length}/1000 characters
            </span>
          </div>

          {/* Buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className={styles.spinner} />
                  {isEditing ? "Updating..." : "Submitting..."}
                </>
              ) : isEditing ? (
                "Update Review"
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
