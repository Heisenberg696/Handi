// frontend/src/pages/NotificationsPage/NotificationsPage.js
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import {
  Bell,
  BellOff,
  Briefcase,
  CheckCircle,
  XCircle,
  Trophy,
  Ban,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import styles from "./NotificationsPage.module.css";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const [filterType, setFilterType] = useState("all");

  // Fetch notifications with pagination
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["allNotifications", filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "50");
      params.append("page", "1");

      if (filterType !== "all" && filterType !== "unread") {
        params.append("type", filterType);
      }

      if (filterType === "unread") {
        params.append("read", "false");
      }

      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL
        }/api/notifications?${params.toString()}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    },
    staleTime: 0,
  });

  const handleNotificationClick = (notification) => {
    console.log("Notification clicked:", notification);
    console.log("Job ID:", notification.jobId);
    console.log("Job ID type:", typeof notification.jobId);

    // Mark as read
    if (!notification.read) {
      markAsRead(notification._id);
    }

    // Navigate to job details if jobId exists
    if (notification.jobId) {
      let jobIdString;

      if (
        typeof notification.jobId === "object" &&
        notification.jobId !== null
      ) {
        jobIdString = notification.jobId._id || notification.jobId.id;
      } else if (typeof notification.jobId === "string") {
        jobIdString = notification.jobId;
      }

      if (
        jobIdString &&
        typeof jobIdString === "string" &&
        jobIdString.match(/^[0-9a-fA-F]{24}$/)
      ) {
        console.log("Navigating to job:", jobIdString);
        navigate(`/job/${jobIdString}`);
      } else {
        console.error("Invalid job ID format:", jobIdString);
        alert("Invalid job ID. Cannot navigate to job details.");
      }
    } else {
      console.log("No jobId found in notification");
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: getAuthHeader() }
      );

      queryClient.invalidateQueries({ queryKey: ["allNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!notificationsData?.data) return;

    try {
      const unreadIds = notificationsData.data
        .filter((n) => !n.read)
        .map((n) => n._id);

      if (unreadIds.length === 0) return;

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/notifications/read`,
        { ids: unreadIds },
        { headers: getAuthHeader() }
      );

      queryClient.invalidateQueries({ queryKey: ["allNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const getNotificationTitle = (type) => {
    const titles = {
      job_posted: "New Job Posted",
      job_accepted: "Job Accepted",
      job_declined: "Job Declined",
      job_completed: "Job Completed",
      job_cancelled: "Job Cancelled",
    };
    return titles[type] || type;
  };

  const getNotificationIcon = (type) => {
    const iconProps = { size: 24, strokeWidth: 2 };

    const icons = {
      job_posted: <Briefcase {...iconProps} />,
      job_accepted: <CheckCircle {...iconProps} />,
      job_declined: <XCircle {...iconProps} />,
      job_completed: <Trophy {...iconProps} />,
      job_cancelled: <Ban {...iconProps} />,
    };
    return icons[type] || <Bell {...iconProps} />;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.meta?.unreadCount || 0;

  const notificationTypes = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "job_posted", label: "Job Posted" },
    { value: "job_accepted", label: "Accepted" },
    { value: "job_declined", label: "Declined" },
    { value: "job_completed", label: "Completed" },
    { value: "job_cancelled", label: "Cancelled" },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Job Notifications</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className={styles.markAllButton}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {notificationTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilterType(type.value)}
            className={`${styles.filterButton} ${
              filterType === type.value ? styles.active : ""
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className={styles.notificationsList}>
        {isLoading && (
          <div className={styles.loading}>
            <Loader2 className={styles.spinner} size={40} />
            <p>Loading notifications...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <AlertCircle size={40} className={styles.errorIcon} />
            <p>Failed to load notifications. Please try again.</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <div className={styles.empty}>
            <BellOff size={48} className={styles.emptyIcon} />
            <p className={styles.emptyText}>No notifications</p>
            <p className={styles.emptySubtext}>You're all caught up!</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`${styles.notificationItem} ${
                !notification.read ? styles.unread : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleNotificationClick(notification);
                }
              }}
            >
              <div className={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </div>

              <div className={styles.notificationContent}>
                <h3 className={styles.notificationTitle}>
                  {getNotificationTitle(notification.type)}
                </h3>
                <p className={styles.notificationMessage}>
                  {notification.message}
                </p>
                <span className={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </span>
              </div>

              {!notification.read && (
                <div className={styles.unreadIndicator}></div>
              )}

              <div className={styles.arrow}>
                <ChevronRight size={20} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
