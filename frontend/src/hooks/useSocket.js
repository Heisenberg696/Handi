// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import io from "socket.io-client";
import useAuthStore from "../store/useAuthStore";

const useSocket = (onNotification) => {
  const socketRef = useRef(null);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!token || !user) {
      return;
    }

    // Connect to socket server with token in auth
    socketRef.current = io(
      process.env.REACT_APP_API_URL || "http://localhost:5000",
      {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      }
    );

    // Listen for notification events
    socketRef.current.on("notification", (notification) => {
      console.log("Received notification:", notification);
      if (onNotification) {
        onNotification(notification);
      }
    });

    // Handle connection events for debugging
    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Cleanup on unmount or when token changes
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, user, onNotification]);

  return socketRef.current;
};

export default useSocket;
