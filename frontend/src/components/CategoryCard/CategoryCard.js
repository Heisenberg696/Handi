// frontend/src/components/CategoryCard/CategoryCard.js
import styles from "./CategoryCard.module.css";

const CategoryCard = ({ name, image, onClick }) => {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.imageContainer}>
        <img src={image} alt={name} className={styles.image} />
      </div>
      <h3 className={styles.name}>{name}</h3>
    </div>
  );
};

export default CategoryCard;
