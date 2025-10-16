// frontend/src/pages/CategoryPage/CategoryPage.js
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore"; // ADD THIS
import WorkerCard from "../../components/WorkerCard/WorkerCard";
import styles from "./CategoryPage.module.css";

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader); // ADD THIS

  // Fetch profiles by category
  const {
    data: profilesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profiles", categoryName],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profile`,
        {
          params: {
            category: categoryName,
            limit: 50,
          },
          headers: getAuthHeader(), // ADD THIS LINE
        }
      );
      return response.data;
    },
    enabled: !!categoryName,
  });

  const handleWorkerClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{categoryName}s</h1>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading professionals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{categoryName}s</h1>
        </div>
        <div className={styles.error}>
          <p>Failed to load professionals. Please try again.</p>
          <p className={styles.errorDetail}>{error.message}</p>
        </div>
      </div>
    );
  }

  const profiles = profilesData?.data || [];

  return (
    <div className={styles.container}>
      {/* Header with search */}
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName}s</h1>
        <div className={styles.searchBar}>
          <svg
            className={styles.searchIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            placeholder={`Search for ${categoryName.toLowerCase()}s`}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Results count */}
      {profiles.length > 0 && (
        <p className={styles.resultsCount}>
          {profilesData.meta.total} professional
          {profilesData.meta.total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Worker Grid */}
      {profiles.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className={styles.emptyTitle}>No professionals found</h3>
          <p className={styles.emptyText}>
            There are no {categoryName.toLowerCase()} professionals available at
            the moment.
          </p>
        </div>
      ) : (
        <div className={styles.workerGrid}>
          {profiles.map((profile) => (
            <WorkerCard
              key={profile._id}
              profile={profile}
              onClick={() => handleWorkerClick(profile.userId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
