// frontend/src/components/NotificationBell/NotificationBell.js
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import styles from "./NotificationBell.module.css";

const NotificationBell = ({ newNotificationCount = 0, onClick }) => {
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);
  const [displayCount, setDisplayCount] = useState(0);

  // Fetch initial unread count
  const { data: countData } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/notifications/unread-count`,
        { headers: getAuthHeader() }
      );
      return response.data.unreadCount;
    },
    staleTime: 0, // Always fresh
    refetchInterval: 60000, // Refetch every minute
  });

  // Update display count when new notifications arrive (from socket)
  useEffect(() => {
    if (newNotificationCount > 0) {
      setDisplayCount((prev) => prev + newNotificationCount);
    }
  }, [newNotificationCount]);

  // Update display count when API data changes
  useEffect(() => {
    if (countData !== undefined) {
      setDisplayCount(countData);
    }
  }, [countData]);

  return (
    <button
      onClick={onClick}
      className={styles.bellButton}
      aria-label="Notifications"
    >
      <svg
        className={styles.bellIcon}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {displayCount > 0 && (
        <span className={styles.badge}>
          {displayCount > 99 ? "99+" : displayCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
