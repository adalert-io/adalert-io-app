import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuthStore } from "../store/auth-store";

export function useAuthSync() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const checkSubscriptionStatus = useAuthStore((state) => state.checkSubscriptionStatus);
  const handlePostAuthNavigation = useAuthStore((state) => state.handlePostAuthNavigation);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check subscription status and handle navigation
        // This will also fetch user ads accounts
        await checkSubscriptionStatus(firebaseUser.uid);
        await handlePostAuthNavigation();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, checkSubscriptionStatus, handlePostAuthNavigation]);

  useEffect(() => {
    if (user) {
      // This is handled in the onAuthStateChanged callback above
      // No need to duplicate the logic here
    }
  }, [user]);
}
