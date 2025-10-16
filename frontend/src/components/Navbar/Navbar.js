// frontend/src/components/Navbar/Navbar.js
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Settings, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import useSocket from "../../hooks/useSocket";
import styles from "./Navbar.module.css";
import logo from "../../assets/Handi_logo.png";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const getAuthHeader = useAuthStore((state) => state.getAuthHeader);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Fetch initial unread count and notifications
  const { data: countData, refetch: refetchCount } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/notifications/unread-count`,
        { headers: getAuthHeader() }
      );
      return response.data.unreadCount;
    },
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch notifications list
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/notifications?limit=10`,
        { headers: getAuthHeader() }
      );
      return response.data.data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  // Handle incoming real-time notifications via socket
  const handleNewNotification = (notification) => {
    console.log("🔔 New notification received:", notification);

    // Add to top of notifications list
    setNotificationsList((prev) => [notification, ...prev]);

    // Increment unread count
    setUnreadCount((prev) => prev + 1);

    // Optional: trigger browser notification
    if (Notification.permission === "granted") {
      new Notification("Handi - New Notification", {
        body: notification.message,
        icon: logo,
      });
    }
  };

  // Initialize socket connection
  useSocket(user ? handleNewNotification : null);

  // Update notifications list from API
  useEffect(() => {
    if (notificationsData) {
      setNotificationsList(notificationsData);
    }
  }, [notificationsData]);

  // Update unread count from API
  useEffect(() => {
    if (countData !== undefined) {
      setUnreadCount(countData);
    }
  }, [countData]);

  const getInitials = () => {
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  const handleProfileMenuToggle = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  };

  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const handleLogout = () => {
    // Close the profile menu
    setShowProfileMenu(false);

    // Clear authentication state
    logout();

    // Redirect to login page
    navigate("/login", { replace: true });
  };

  // Extract job ID properly and handle navigation
  const handleNotificationClick = async (notification) => {
    // Close the dropdown
    setShowNotifications(false);

    // Mark as read if unread
    if (!notification.read) {
      try {
        await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/notifications/${notification._id}/read`,
          {},
          { headers: getAuthHeader() }
        );

        // Update local state
        setNotificationsList((prev) =>
          prev.map((notif) =>
            notif._id === notification._id ? { ...notif, read: true } : notif
          )
        );

        // Refetch unread count
        refetchCount();
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    // Navigate to job details if jobId exists
    if (notification.jobId) {
      let jobIdString;

      // Extract job ID properly - handle both string and object cases
      if (
        typeof notification.jobId === "object" &&
        notification.jobId !== null
      ) {
        // If jobId is a populated object, get its _id
        jobIdString = notification.jobId._id || notification.jobId.id;
      } else if (typeof notification.jobId === "string") {
        // If jobId is already a string, use it directly
        jobIdString = notification.jobId;
      }

      // Validate MongoDB ObjectId format
      if (
        jobIdString &&
        typeof jobIdString === "string" &&
        jobIdString.match(/^[0-9a-fA-F]{24}$/)
      ) {
        console.log("Navigating to job:", jobIdString);
        navigate(`/job/${jobIdString}`);
      } else {
        console.error("Invalid job ID format:", jobIdString);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notificationsList
        .filter((n) => !n.read)
        .map((n) => n._id);

      if (unreadIds.length === 0) return;

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/api/notifications/read`,
        { ids: unreadIds },
        { headers: getAuthHeader() }
      );

      // Update local state
      setNotificationsList((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleClickOutside = (event) => {
    if (
      profileMenuRef.current &&
      !profileMenuRef.current.contains(event.target)
    ) {
      setShowProfileMenu(false);
    }
    if (
      notificationsRef.current &&
      !notificationsRef.current.contains(event.target)
    ) {
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    if (showProfileMenu || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showProfileMenu, showNotifications]);

  const navigationLinks = [
    { path: "/", label: "Home" },
    { path: "/notifications", label: "Jobs" },
    { path: "/edit-profile", label: "Profile" },
  ];

  // Format time for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <div className={styles.logoSection}>
          <Link to="/" className={styles.logoLink}>
            <div className={styles.logo}>
              <img src={logo} alt="Handi Logo" className={styles.logoIcon} />
              <span className={styles.logoText}>Handi</span>
            </div>
          </Link>
        </div>

        <div className={styles.navLinks}>
          {navigationLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`${styles.navLink} ${
                isActiveLink(link.path) ? styles.active : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.userSection}>
          <div className={styles.notificationsContainer} ref={notificationsRef}>
            <button
              className={styles.notificationButton}
              onClick={handleNotificationsToggle}
              aria-label="Notifications"
            >
              <Bell className={styles.notificationIcon} size={22} />
              {unreadCount > 0 && (
                <span className={styles.notificationBadge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className={styles.notificationsMenu}>
                <div className={styles.notificationsHeader}>
                  <h3 className={styles.notificationsTitle}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      className={styles.markAllRead}
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className={styles.notificationsList}>
                  {notificationsList.length > 0 ? (
                    notificationsList.map((notification) => (
                      <div
                        key={notification._id}
                        className={`${styles.notificationItem} ${
                          !notification.read ? styles.unread : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={styles.notificationContent}>
                          <p className={styles.notificationTitle}>
                            {notification.type === "job_posted" &&
                              "New Job Posted"}
                            {notification.type === "job_accepted" &&
                              "Job Accepted"}
                            {notification.type === "job_declined" &&
                              "Job Declined"}
                            {notification.type === "job_completed" &&
                              "Job Completed"}
                            {notification.type === "job_cancelled" &&
                              "Job Cancelled"}
                          </p>
                          <p className={styles.notificationMessage}>
                            {notification.message}
                          </p>
                          <span className={styles.notificationTime}>
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        {!notification.read && (
                          <div className={styles.unreadDot}></div>
                        )}
                        <ChevronRight
                          size={16}
                          className={styles.notificationArrow}
                        />
                      </div>
                    ))
                  ) : (
                    <div className={styles.noNotifications}>
                      <Bell size={40} className={styles.emptyIcon} />
                      <p>No notifications</p>
                      <span className={styles.emptySubtext}>
                        You're all caught up!
                      </span>
                    </div>
                  )}
                </div>
                <Link
                  to="/notifications"
                  className={styles.viewAllLink}
                  onClick={() => setShowNotifications(false)}
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </div>

          <div className={styles.profileContainer} ref={profileMenuRef}>
            <button
              className={styles.profileButton}
              onClick={handleProfileMenuToggle}
              aria-label="User menu"
            >
              {user?.profilePicture?.url ? (
                <img
                  src={user.profilePicture.url}
                  alt="Profile"
                  className={styles.profileImage}
                />
              ) : (
                <div className={styles.profilePlaceholder}>
                  <span className={styles.profileInitials}>
                    {getInitials()}
                  </span>
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div className={styles.profileMenu}>
                <div className={styles.menuHeader}>
                  <p className={styles.username}>{user?.username || "User"}</p>
                  <p className={styles.userEmail}>{user?.email}</p>
                </div>
                <div className={styles.menuDivider}></div>
                <Link
                  to="/edit-profile"
                  className={styles.menuItem}
                  onClick={() => setShowProfileMenu(false)}
                >
                  <User size={16} />
                  <span>Edit Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className={styles.menuItem}
                  onClick={() => setShowProfileMenu(false)}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                <div className={styles.menuDivider}></div>
                <button
                  onClick={handleLogout}
                  className={`${styles.menuItem} ${styles.logoutButton}`}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
