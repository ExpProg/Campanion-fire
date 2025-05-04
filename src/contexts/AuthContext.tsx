
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase'; // Ensure this path is correct

// Removed UserProfile interface

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean; // Added isAdmin field
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false, // Default isAdmin to false
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // State for admin status
  const [loading, setLoading] = useState(true);

  const fetchAdminStatus = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                setIsAdmin(docSnap.data()?.isAdmin || false);
            } else {
                setIsAdmin(false); // User document doesn't exist, not admin
            }
        } catch (error) {
            console.error("Error fetching admin status:", error);
            setIsAdmin(false); // Error fetching, assume not admin
        }
    } else {
        setIsAdmin(false); // No user logged in, not admin
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Start loading when auth state might change
      setUser(firebaseUser); // Set user immediately
      await fetchAdminStatus(firebaseUser); // Fetch admin status
      setLoading(false); // Finish loading after processing auth state
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchAdminStatus]); // Added fetchAdminStatus dependency

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
