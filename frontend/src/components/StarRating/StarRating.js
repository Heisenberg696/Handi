// frontend/src/components/StarRating/StarRating.js
import { useState } from "react";
import { Star } from "lucide-react";
import styles from "./StarRating.module.css";

const StarRating = ({ value = 0, onChange = () => {}, readOnly = false }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const handleStarClick = (starValue) => {
    if (!readOnly) {
      onChange(starValue);
    }
  };

  const handleStarHover = (starValue) => {
    if (!readOnly) {
      setHoverValue(starValue);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(0);
  };

  const displayValue = hoverValue || value;

  return (
    <div className={styles.container}>
      <div className={styles.starsWrapper}>
        {[1, 2, 3, 4, 5].map((starValue) => (
          <button
            key={starValue}
            type="button"
            className={`${styles.star} ${
              starValue <= displayValue ? styles.filled : ""
            }`}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleStarHover(starValue)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            aria-label={`Rate ${starValue} stars`}
          >
            <Star
              size={32}
              className={styles.starIcon}
              fill={starValue <= displayValue ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className={styles.ratingText}>
          {value} out of 5 {value === 1 ? "star" : "stars"}
        </span>
      )}
    </div>
  );
};

export default StarRating;
