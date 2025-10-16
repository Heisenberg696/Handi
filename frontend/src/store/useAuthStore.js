// frontend/src/store/useAuthStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // authenticate user (login/signup)
      authenticate: (user, token) => {
        console.log("Authenticating user:", user);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      // logout (clear state)
      logout: () => {
        console.log("Logging out user");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      // update user profile data
      updateUser: (userData) => {
        console.log("Updating user data:", userData);
        set((state) => ({
          user: {
            ...state.user,
            ...userData,
          },
        }));
      },

      // check if user is authenticated
      checkAuth: () => {
        const { token } = get();
        return !!token;
      },

      // get auth header for API requests
      getAuthHeader: () => {
        const { token } = get();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    {
      name: "auth-storage", // localStorage key
      storage: createJSONStorage(() => localStorage), // Always use localStorage
      // Only persist essential data
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
