// frontend/src/pages/ViewProfilePage/ViewProfilePage.js
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Clock,
  Star,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import PostJobModal from "../../components/PostJobModal/PostJobModal";
import ReviewItem from "../../components/ReviewItem/ReviewItem";
import styles from "./ViewProfilePage.module.css";

const ViewProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("about");
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);

  // Fetch profile data
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/profile/user/${userId}`,
        { headers: getAuthHeader() }
      );
      return response.data.profile;
    },
    enabled: !!userId,
    retry: 1,
  });

  // Fetch worker reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["workerReviews", userId],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/reviews/worker/${userId}?page=1&limit=10`,
        { headers: getAuthHeader() }
      );
      return response.data;
    },
    enabled: !!userId,
    retry: 1,
  });

  const handlePostJob = () => {
    setIsPostJobModalOpen(true);
  };

  const handleClosePostJobModal = () => {
    setIsPostJobModalOpen(false);
  };

  const handleJobPostSuccess = (job) => {
    console.log("Job posted successfully:", job);
  };

  const handleEditProfile = () => {
    navigate("/edit-profile");
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 className={styles.spinner} size={40} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h3>Profile not found</h3>
          <p>This profile does not exist or has been removed.</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const profile = profileData;
  const isOwnProfile = currentUser?._id === profile.userId.toString();
  const hasProfilePicture = profile.profilePicture?.url;

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className={styles.container}>
      {/* Profile Header Banner */}
      <div className={styles.banner}>
        <div className={styles.profileHeader}>
          {/* Profile Picture */}
          <div className={styles.profilePictureWrapper}>
            {hasProfilePicture ? (
              <img
                src={profile.profilePicture.url}
                alt={profile.username}
                className={styles.profilePicture}
              />
            ) : (
              <div className={styles.defaultAvatar}>
                <User size={80} color="#525252" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className={styles.profileInfo}>
            <h1 className={styles.name}>{profile.username}</h1>
            <p className={styles.subtitle}>
              {profile.category || "Service Provider"}
            </p>
            <p className={styles.joinedDate}>
              <Calendar size={16} />
              Joined in {joinedDate}
            </p>
          </div>

          {/* Action Button */}
          {isOwnProfile ? (
            <button onClick={handleEditProfile} className={styles.editButton}>
              <User size={18} />
              Edit Profile
            </button>
          ) : (
            <button onClick={handlePostJob} className={styles.postJobButton}>
              <Briefcase size={18} />
              Post a Job
            </button>
          )}
        </div>
      </div>

      {/* Post Job Modal */}
      <PostJobModal
        isOpen={isPostJobModalOpen}
        onClose={handleClosePostJobModal}
        workerId={userId}
        onSuccess={handleJobPostSuccess}
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "about" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("about")}
        >
          <FileText size={18} />
          About
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "portfolio" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("portfolio")}
        >
          <ImageIcon size={18} />
          Portfolio
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* About Tab Content */}
        {activeTab === "about" && (
          <>
            {/* About Section */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.bio}>
                {profile.bio || "No bio provided yet."}
              </p>
            </section>

            {/* Contact Section */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Contact</h2>
              <div className={styles.contactGrid}>
                <div className={styles.contactItem}>
                  <div className={styles.contactLabel}>
                    <Mail size={18} />
                    <span>Email</span>
                  </div>
                  <span className={styles.contactValue}>{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className={styles.contactItem}>
                    <div className={styles.contactLabel}>
                      <Phone size={18} />
                      <span>Phone</span>
                    </div>
                    <span className={styles.contactValue}>{profile.phone}</span>
                  </div>
                )}
                {profile.location && (
                  <div className={styles.contactItem}>
                    <div className={styles.contactLabel}>
                      <MapPin size={18} />
                      <span>Location</span>
                    </div>
                    <span className={styles.contactValue}>
                      {profile.location}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Professional Details Section */}
            {(profile.skills?.length > 0 ||
              profile.availability ||
              profile.rate) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Professional Details</h2>
                <div className={styles.detailsGrid}>
                  {profile.category && (
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <Briefcase size={18} />
                        <span>Category</span>
                      </div>
                      <span className={styles.detailValue}>
                        {profile.category}
                      </span>
                    </div>
                  )}
                  {profile.skills?.length > 0 && (
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <span>Skills</span>
                      </div>
                      <div className={styles.skillsContainer}>
                        {profile.skills.map((skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.availability && (
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <Clock size={18} />
                        <span>Availability</span>
                      </div>
                      <span className={styles.detailValue}>
                        {profile.availability}
                      </span>
                    </div>
                  )}
                  {profile.rate && (
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>
                        <DollarSign size={18} />
                        <span>Rate</span>
                      </div>
                      <span className={styles.detailValue}>
                        ₵{profile.rate}/hour
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Reviews Section */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ratings & Reviews</h2>

              {profile.rating ? (
                <>
                  {/* Rating Summary */}
                  <div className={styles.ratingSummary}>
                    <div className={styles.ratingDisplay}>
                      <div className={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            className={`${styles.ratingStar} ${
                              star <= Math.round(profile.rating)
                                ? styles.filled
                                : ""
                            }`}
                            fill={
                              star <= Math.round(profile.rating)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ))}
                      </div>
                      <div className={styles.ratingText}>
                        <span className={styles.ratingValue}>
                          {profile.rating}
                        </span>
                        <span className={styles.ratingCount}>
                          ({profile.reviewCount}{" "}
                          {profile.reviewCount === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  {reviewsLoading ? (
                    <div className={styles.reviewsLoading}>
                      <Loader2 size={24} className={styles.spinner} />
                      <p>Loading reviews...</p>
                    </div>
                  ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                    <div className={styles.reviewsList}>
                      {reviewsData.reviews.map((review) => (
                        <ReviewItem key={review._id} review={review} />
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noReviews}>
                      <p>No reviews yet.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noReviews}>
                  <p>This worker hasn't received any reviews yet.</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Portfolio Tab Content */}
        {activeTab === "portfolio" && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Portfolio</h2>
            {profile.portfolioImages?.length > 0 ? (
              <div className={styles.portfolioGrid}>
                {profile.portfolioImages.map((image, index) => (
                  <div key={index} className={styles.portfolioItem}>
                    <img
                      src={image.url}
                      alt={`Portfolio ${index + 1}`}
                      className={styles.portfolioImage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyPortfolio}>
                <ImageIcon size={48} className={styles.emptyIcon} />
                <p>No portfolio images yet.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default ViewProfilePage;
