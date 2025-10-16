// frontend/src/components/JobDetailsPage/JobDetailsPage
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
  CheckCircle,
  User,
  Briefcase,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import JobActionButtons from "../../components/JobActionButtons/JobActionButtons";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import styles from "./JobDetailsPage.module.css";

const JobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const currentUser = useAuthStore((state) => state.user);
  const [job, setJob] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  console.log("JobDetailsPage - jobId from params:", jobId);
  console.log("JobDetailsPage - currentUser:", currentUser);

  // Invalidate the cache when jobId changes to ensure fresh data
  useEffect(() => {
    if (jobId) {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    }
  }, [jobId, queryClient]);

  // Validate jobId before making request
  const isValidJobId = jobId ? jobId.match(/^[0-9a-fA-F]{24}$/) : false;
  const shouldFetch = Boolean(jobId && isValidJobId);

  // Fetch job details
  const { isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      console.log("Fetching job with ID:", jobId);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/jobs/${jobId}`,
        { headers: getAuthHeader() }
      );

      console.log("Job fetched successfully:", response.data.job);

      // Validate that we got actual job data back
      if (!response.data.job) {
        throw new Error("No job data returned from server");
      }

      setJob(response.data.job);
      return response.data.job;
    },
    enabled: shouldFetch,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 10000),
    staleTime: 0,
    cacheTime: 0,
    keepPreviousData: true,
  });

  const handleJobUpdate = (updatedJob) => {
    console.log("Job updated:", updatedJob);
    setJob(updatedJob);
    queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    refetch();
  };

  const handleReviewSuccess = (review) => {
    console.log("Review submitted successfully:", review);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "pending":
        return "pending";
      case "accepted":
        return "accepted";
      case "completed":
        return "completed";
      case "declined":
        return "declined";
      case "cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className={styles.container}>
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} size={40} />
        <p>Loading job details...</p>
      </div>
    </div>
  );

  // Handle invalid job ID
  if (!isValidJobId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h3>Invalid Job ID</h3>
          <p>The job ID in the URL is not valid.</p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show loading skeleton only on initial load, not on refetch
  if (isLoading && !job) {
    return <LoadingSkeleton />;
  }

  // If we have an error and no previous data, show error
  if (error && !job) {
    console.error("Error loading job:", error);
    console.error("Error response:", error?.response?.data);
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h3>Job not found</h3>
          <p>
            {error?.response?.data?.error ||
              error?.message ||
              "This job does not exist or has been removed."}
          </p>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // If no job data at all, show loading (shouldn't reach here normally)
  if (!job) {
    return <LoadingSkeleton />;
  }

  // Authorization checks
  const currentUserId = currentUser?._id?.toString();
  const workerId = job.worker?._id?.toString();
  const customerId = job.customer?._id?.toString();

  const isWorker = currentUserId && workerId && currentUserId === workerId;
  const isCustomer =
    currentUserId && customerId && currentUserId === customerId;

  console.log("Authorization check:", {
    currentUserId,
    workerId,
    customerId,
    isWorker,
    isCustomer,
  });

  return (
    <div className={styles.container}>
      {/* Show a subtle loading indicator if refetching in background */}
      {isFetching && (
        <div className={styles.refetchIndicator}>
          <Loader2 size={16} className={styles.refetchSpinner} />
        </div>
      )}

      {/* Header with back button */}
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className={styles.title}>{job.title}</h1>
        <span
          className={`${styles.badge} ${
            styles[getStatusBadgeColor(job.status)]
          }`}
        >
          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
        </span>
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Left column - Job details */}
        <div className={styles.mainContent}>
          {/* Description Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Briefcase size={20} />
              Job Description
            </h2>
            <p className={styles.description}>{job.description}</p>
          </section>

          {/* Images Section */}
          {job.images && job.images.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <ImageIcon size={20} />
                Job Images
              </h2>
              <div className={styles.imagesGrid}>
                {job.images.map((image, index) => (
                  <div key={index} className={styles.imageWrapper}>
                    <img
                      src={image.url}
                      alt={`Job ${index + 1}`}
                      className={styles.jobImage}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Details Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Clock size={20} />
              Job Details
            </h2>
            <div className={styles.detailsGrid}>
              {job.rate && (
                <div className={styles.detailItem}>
                  <div className={styles.detailIcon}>
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <span className={styles.detailLabel}>Rate</span>
                    <span className={styles.detailValue}>₵{job.rate}/hour</span>
                  </div>
                </div>
              )}
              <div className={styles.detailItem}>
                <div className={styles.detailIcon}>
                  <Calendar size={18} />
                </div>
                <div>
                  <span className={styles.detailLabel}>Posted on</span>
                  <span className={styles.detailValue}>
                    {formatDate(job.createdAt)}
                  </span>
                </div>
              </div>
              {job.completedAt && (
                <div className={styles.detailItem}>
                  <div className={styles.detailIcon}>
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <span className={styles.detailLabel}>Completed on</span>
                    <span className={styles.detailValue}>
                      {formatDate(job.completedAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <CheckCircle size={20} />
              Actions
            </h2>
            <JobActionButtons job={job} onUpdate={handleJobUpdate} />
          </section>

          {/* Review Section */}
          {job.status === "completed" && isCustomer && (
            <section className={styles.section}>
              <div className={styles.reviewSection}>
                <h3 className={styles.reviewSectionTitle}>Leave a Review</h3>
                <p className={styles.reviewDescription}>
                  Share your experience working with {job.worker.username}
                </p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className={styles.reviewButton}
                >
                  Leave a Review
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar - People involved */}
        <aside className={styles.sidebar}>
          {/* Customer Section */}
          <div className={styles.personCard}>
            <h3 className={styles.personTitle}>
              <User size={16} />
              CUSTOMER
            </h3>
            <p className={styles.personName}>{job.customer.username}</p>
            <p className={styles.personEmail}>{job.customer.email}</p>
            {isWorker && (
              <button
                onClick={() => navigate(`/profile/${job.customer._id}`)}
                className={styles.viewProfileButton}
              >
                View Profile
              </button>
            )}
          </div>

          {/* Worker Section */}
          <div className={styles.personCard}>
            <h3 className={styles.personTitle}>
              <Briefcase size={16} />
              WORKER
            </h3>
            <p className={styles.personName}>{job.worker.username}</p>
            <p className={styles.personEmail}>{job.worker.email}</p>
            {isCustomer && (
              <button
                onClick={() => navigate(`/profile/${job.worker._id}`)}
                className={styles.viewProfileButton}
              >
                View Profile
              </button>
            )}
          </div>

          {/* Status Timeline */}
          <div className={styles.timelineCard}>
            <h3 className={styles.personTitle}>
              <Clock size={16} />
              STATUS
            </h3>
            <div className={styles.timeline}>
              <div className={`${styles.timelineItem} ${styles.active}`}>
                <div className={styles.timelineDot}></div>
                <span>Posted</span>
              </div>
              {(job.status === "accepted" ||
                job.status === "completed" ||
                job.status === "cancelled") && (
                <div className={`${styles.timelineItem} ${styles.active}`}>
                  <div className={styles.timelineDot}></div>
                  <span>Accepted</span>
                </div>
              )}
              {job.status === "completed" && (
                <div className={`${styles.timelineItem} ${styles.active}`}>
                  <div className={styles.timelineDot}></div>
                  <span>Completed</span>
                </div>
              )}
              {job.status === "declined" && (
                <div className={`${styles.timelineItem} ${styles.active}`}>
                  <div className={styles.timelineDot}></div>
                  <span>Declined</span>
                </div>
              )}
              {job.status === "cancelled" && (
                <div className={`${styles.timelineItem} ${styles.active}`}>
                  <div className={styles.timelineDot}></div>
                  <span>Cancelled</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        jobId={jobId}
        workerId={job.worker._id}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
};

export default JobDetailsPage;
