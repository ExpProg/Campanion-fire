
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start loading when auth state might change
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile data from Firestore
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
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false); // Finish loading after processing auth state and profile
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
