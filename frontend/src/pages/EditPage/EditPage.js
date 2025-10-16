// frontend/src/pages/EditPage/EditPage.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import ProfileForm from "../../components/ProfileForm/ProfileForm";
import styles from "./EditPage.module.css";

const EditPage = () => {
  const queryClient = useQueryClient();
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);

  // Fetch current profile data
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profile/me`,
        { headers: getAuthHeader() }
      );
      return response.data.profile;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleProfileUpdateSuccess = (updatedProfile) => {
    // Invalidate and refetch profile data
    queryClient.invalidateQueries({ queryKey: ["profile"] });

    // Show success message (you can add toast notification here)
    console.log("Profile updated successfully:", updatedProfile);
  };

  const handleProfileUpdateError = (error) => {
    // Handle error (you can add toast notification here)
    console.error("Profile update failed:", error);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <p className={styles.subtitle}>Update your profile information</p>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Profile</h1>
          <p className={styles.subtitle}>Update your profile information</p>
        </div>
        <div className={styles.error}>
          <h3>Failed to load profile</h3>
          <p>
            {error.response?.data?.error ||
              "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Profile</h1>
        <p className={styles.subtitle}>Update your profile information</p>
      </div>

      {/* Form Container */}
      <div className={styles.formContainer}>
        <ProfileForm
          profileData={profileData}
          onSuccess={handleProfileUpdateSuccess}
          onError={handleProfileUpdateError}
        />
      </div>
    </div>
  );
};

export default EditPage;
