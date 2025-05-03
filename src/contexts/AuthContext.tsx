
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase'; // Ensure this path is correct

// Removed UserProfile interface

interface AuthContextType {
  user: FirebaseUser | null;
  // profile: UserProfile | null; // Removed profile
  loading: boolean;
  // refreshProfile: () => Promise<void>; // Removed refresh function type
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  // profile: null, // Removed profile default
  loading: true,
  // refreshProfile: async () => {}, // Removed default empty async function
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  // const [profile, setProfile] = useState<UserProfile | null>(null); // Removed profile state
  const [loading, setLoading] = useState(true);

  // Removed fetchProfile function
  // Removed refreshProfile function

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start loading when auth state might change
      setUser(firebaseUser); // Set user immediately
      // await fetchProfile(firebaseUser); // Removed profile fetching
      // Perform any other user-related setup here if needed in the future
      setLoading(false); // Finish loading after processing auth state
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Removed fetchProfile dependency

  return (
    // Removed profile and refreshProfile from context value
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
