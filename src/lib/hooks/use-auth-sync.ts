import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuthStore } from "../store/auth-store";

export function useAuthSync() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const fetchUserDocument = useAuthStore((state) => state.fetchUserDocument);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  useEffect(() => {
    if (user) {
      fetchUserDocument(user.uid);
    }
  }, [user, fetchUserDocument]);
}
