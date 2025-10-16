// frontend/src/pages/Home.js
import { useNavigate } from "react-router-dom";
import CategoryCard from "../components/CategoryCard/CategoryCard";
import styles from "./Home.module.css";

// Import category images
import PlumbingImg from "../assets/Categories/Plumbing.png";
import ElectricalImg from "../assets/Categories/Electrical_Work.png";
import CleaningImg from "../assets/Categories/Cleaning_and_Maintenance.jpg";
import CarpentryImg from "../assets/Categories/Carpentry.png";
import DrainageImg from "../assets/Categories/Drainage_and_Waste_Management.png";
import PaintingImg from "../assets/Categories/Painting.png";
import HandymanImg from "../assets/Categories/Handyman.png";
import OutdoorImg from "../assets/Categories/Outdoor_Maintenance.png";
import MetalWorkImg from "../assets/Categories/Metalwork.png";
import MasonryImg from "../assets/Categories/Masonry.jpg";
import RoofingImg from "../assets/Categories/Roofing_Carpentry.jpg";

const Home = () => {
  const navigate = useNavigate();

  const categories = [
    { name: "Plumbing", image: PlumbingImg },
    { name: "Electrical Work", image: ElectricalImg },
    { name: "Cleaning and Maintenance", image: CleaningImg },
    { name: "Carpentry", image: CarpentryImg },
    { name: "Drainage and Waste Management", image: DrainageImg },
    { name: "Painting", image: PaintingImg },
    { name: "Handyman", image: HandymanImg },
    { name: "Outdoor Maintenance", image: OutdoorImg },
    { name: "MetalWork", image: MetalWorkImg },
    { name: "Masonry", image: MasonryImg },
    { name: "Roofing Carpentry", image: RoofingImg },
  ];

  const handleCategoryClick = (categoryName) => {
    navigate(`/category/${categoryName}`);
  };

  return (
    <div className={styles.container}>
      {/* Welcome Section */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>Find the Right Professional</h1>
        <p className={styles.welcomeText}>
          Browse our skilled workers by category and get your job done
        </p>
      </div>

      {/* Browse Categories Section */}
      <div className={styles.browsSection}>
        <h2 className={styles.sectionTitle}>Browse Categories</h2>
        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <CategoryCard
              key={category.name}
              name={category.name}
              image={category.image}
              onClick={() => handleCategoryClick(category.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
