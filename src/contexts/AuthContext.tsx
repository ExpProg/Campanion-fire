
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase'; // Ensure this path is correct

interface UserProfile {
  isOrganizer?: boolean;
  // Add other profile fields as needed
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>; // Add refresh function type
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {}, // Default empty async function
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch profile data
  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setProfile(userDocSnap.data() as UserProfile);
      } else {
        console.log("No user profile found in Firestore for UID:", firebaseUser.uid);
        setProfile(null); // Or set a default profile
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setProfile(null); // Handle error case
    }
  }, []);

  // Function to manually refresh profile
  const refreshProfile = useCallback(async () => {
      setLoading(true); // Indicate loading during refresh
      await fetchProfile(user); // Re-fetch using the current user
      setLoading(false);
  }, [user, fetchProfile]); // Depend on user and fetchProfile

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start loading when auth state might change
      setUser(firebaseUser); // Set user immediately
      await fetchProfile(firebaseUser); // Fetch profile based on new user state
      setLoading(false); // Finish loading after processing auth state and profile
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchProfile]); // Depend only on fetchProfile (which is stable due to useCallback)

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
