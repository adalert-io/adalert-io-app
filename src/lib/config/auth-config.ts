export const authConfig = {
  // Get the base URL from environment variable or fallback to localhost
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Get the action URL for email verification
  getActionUrl: () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Use our own verification route
    return `${baseUrl}/auth/verify`;
  },

  // Get the redirect URL after verification
  getRedirectUrl: () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/auth?mode=login`;
  },
};
