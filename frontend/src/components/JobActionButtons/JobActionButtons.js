// frontend/src/components/JobActionButtons/JobActionButtons.js
import { useState } from "react";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import styles from "./JobActionButtons.module.css";

const JobActionButtons = ({ job, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const currentUser = useAuthStore((state) => state.user);

  // Add debugging
  console.log("JobActionButtons - job:", job);
  console.log("JobActionButtons - currentUser:", currentUser);

  if (!job || !currentUser) {
    console.log("JobActionButtons - Missing job or currentUser");
    return null;
  }

  // FIXED: Use _id consistently and convert to string for comparison
  const currentUserId = currentUser?._id?.toString();
  const isWorker =
    currentUserId &&
    job.worker?._id?.toString() &&
    currentUserId === job.worker._id.toString();
  const isCustomer =
    currentUserId &&
    job.customer?._id?.toString() &&
    currentUserId === job.customer._id.toString();

  console.log("JobActionButtons - Authorization check:", {
    currentUserId,
    workerId: job.worker?._id?.toString(),
    customerId: job.customer?._id?.toString(),
    isWorker,
    isCustomer,
  });
  console.log("JobActionButtons - job.status:", job.status);

  const handleAction = async (action) => {
    setError(null);
    setLoading(true);

    try {
      let endpoint = "";
      switch (action) {
        case "accept":
          endpoint = `${process.env.REACT_APP_API_URL}/api/jobs/${job._id}/accept`;
          break;
        case "decline":
          endpoint = `${process.env.REACT_APP_API_URL}/api/jobs/${job._id}/decline`;
          break;
        case "complete":
          endpoint = `${process.env.REACT_APP_API_URL}/api/jobs/${job._id}/complete`;
          break;
        case "cancel":
          endpoint = `${process.env.REACT_APP_API_URL}/api/jobs/${job._id}/cancel`;
          break;
        default:
          throw new Error("Unknown action");
      }

      const response = await axios.patch(
        endpoint,
        {},
        { headers: getAuthHeader() }
      );

      // Response contains { job, notification }
      const updatedJob = response.data.job;

      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate(updatedJob);
      }

      // Reset error after successful action
      setError(null);
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(
        err.response?.data?.error ||
          `Failed to ${action} job. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Determine which buttons to show based on status and user role
  const renderButtons = () => {
    // If user is neither worker nor customer, show nothing
    if (!isWorker && !isCustomer) {
      console.log("JobActionButtons - User is neither worker nor customer");
      return (
        <div className={styles.statusMessage}>
          <p>You are not authorized to perform actions on this job</p>
        </div>
      );
    }

    console.log("JobActionButtons - Rendering buttons for status:", job.status);

    switch (job.status) {
      case "pending":
        if (isWorker) {
          return (
            <>
              <button
                onClick={() => handleAction("accept")}
                disabled={loading}
                className={`${styles.button} ${styles.acceptButton}`}
              >
                {loading ? "Accepting..." : "Accept Job"}
              </button>
              <button
                onClick={() => handleAction("decline")}
                disabled={loading}
                className={`${styles.button} ${styles.declineButton}`}
              >
                {loading ? "Declining..." : "Decline Job"}
              </button>
            </>
          );
        }
        if (isCustomer) {
          return (
            <button
              onClick={() => handleAction("cancel")}
              disabled={loading}
              className={`${styles.button} ${styles.cancelButton}`}
            >
              {loading ? "Cancelling..." : "Cancel Job"}
            </button>
          );
        }
        break;

      case "accepted":
        if (isWorker) {
          return (
            <>
              <button
                onClick={() => handleAction("complete")}
                disabled={loading}
                className={`${styles.button} ${styles.completeButton}`}
              >
                {loading ? "Completing..." : "Mark as Complete"}
              </button>
              <button
                onClick={() => handleAction("cancel")}
                disabled={loading}
                className={`${styles.button} ${styles.cancelButton}`}
              >
                {loading ? "Cancelling..." : "Cancel Job"}
              </button>
            </>
          );
        }
        if (isCustomer) {
          return (
            <button
              onClick={() => handleAction("cancel")}
              disabled={loading}
              className={`${styles.button} ${styles.cancelButton}`}
            >
              {loading ? "Cancelling..." : "Cancel Job"}
            </button>
          );
        }
        break;

      case "completed":
        return (
          <div className={styles.statusMessage}>
            <p>✅ This job has been completed</p>
          </div>
        );

      case "declined":
        return (
          <div className={styles.statusMessage}>
            <p>❌ This job has been declined</p>
          </div>
        );

      case "cancelled":
        return (
          <div className={styles.statusMessage}>
            <p>🚫 This job has been cancelled</p>
          </div>
        );

      default:
        console.log("JobActionButtons - Unknown status:", job.status);
        return (
          <div className={styles.statusMessage}>
            <p>Unknown job status: {job.status}</p>
          </div>
        );
    }

    // Fallback if no condition matched
    return (
      <div className={styles.statusMessage}>
        <p>No actions available</p>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>{renderButtons()}</div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default JobActionButtons;
