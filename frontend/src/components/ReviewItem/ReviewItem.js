// frontend/src/components/ReviewItem/ReviewItem.js
import { Star, Calendar, User } from "lucide-react";
import styles from "./ReviewItem.module.css";

const ReviewItem = ({ review }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating) => {
    return (
      <div className={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${styles.star} ${
              star <= rating ? styles.filled : styles.empty
            }`}
            fill={star <= rating ? "currentColor" : "none"}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.reviewItem}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.reviewerInfo}>
          <div className={styles.avatarPlaceholder}>
            <User size={20} />
          </div>
          <div>
            <p className={styles.reviewerName}>
              {review.reviewer?.username || "Anonymous"}
            </p>
            <p className={styles.reviewDate}>
              <Calendar size={14} />
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>
        {renderStars(review.rating)}
      </div>

      {/* Comment */}
      {review.comment && <p className={styles.comment}>{review.comment}</p>}

      {/* Job Title */}
      {review.job?.title && (
        <p className={styles.jobTitle}>
          For: <strong>{review.job.title}</strong>
        </p>
      )}
    </div>
  );
};

export default ReviewItem;
