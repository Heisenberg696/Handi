// frontend/src/components/WorkerCard/WorkerCard.js
import { MapPin, User, Star } from "lucide-react";
import styles from "./WorkerCard.module.css";

const WorkerCard = ({ profile, onClick }) => {
  const hasProfilePicture = profile.profilePicture?.url;

  return (
    <div className={styles.card} onClick={onClick}>
      {/* Profile Picture */}
      <div className={styles.imageContainer}>
        {hasProfilePicture ? (
          <img
            src={profile.profilePicture.url}
            alt={profile.username}
            className={styles.image}
          />
        ) : (
          <div className={styles.defaultAvatar}>
            <User size={48} color="#525252" />
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className={styles.info}>
        <div className={styles.header}>
          <h3 className={styles.name}>{profile.username}</h3>
          <p className={styles.bio}>
            {profile.bio || `I am a ${profile.category || "professional"}.`}
          </p>
        </div>

        {/* Meta Information */}
        <div className={styles.meta}>
          {/* Rating Badge */}
          {profile.rating && (
            <div className={styles.ratingBadge}>
              <div className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={`${styles.star} ${
                      star <= Math.round(profile.rating) ? styles.filled : ""
                    }`}
                    fill={
                      star <= Math.round(profile.rating)
                        ? "currentColor"
                        : "none"
                    }
                  />
                ))}
              </div>
              <span className={styles.ratingValue}>{profile.rating}</span>
              <span className={styles.reviewCount}>
                ({profile.reviewCount}{" "}
                {profile.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}

          {/* Location */}
          {profile.location && (
            <div className={styles.metaItem}>
              <MapPin size={16} className={styles.metaIcon} />
              <span className={styles.metaText}>{profile.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* View Profile Button */}
      <button
        className={styles.viewButton}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        View Profile
      </button>
    </div>
  );
};

export default WorkerCard;
