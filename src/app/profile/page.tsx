
// src/app/profile/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header'; // Import the Header component

export default function ProfilePage() {
  const { user, loading } = useAuth(); // Removed profile, refreshProfile as isOrganizer is no longer used here
  const router = useRouter();
  const { toast } = useToast();
  // Removed isUpdating state

  useEffect(() => {
    // Redirect to login if not authenticated and loading is finished
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to landing page after logout
      toast({ title: 'Logged Out Successfully' });
    } catch (error) {
      console.error('Logout Error:', error);
      toast({
        title: 'Logout Failed',
        description: 'An error occurred during logout.',
        variant: 'destructive',
      });
    }
  };

  // Removed handleOrganizerStatusChange function

  // Helper to generate initials for fallback avatar
  const getInitials = (email: string | null | undefined) => {
    if (!email) return '??';
    return email.charAt(0).toUpperCase();
  };


  if (loading || (!user && !loading)) { // Show skeleton if loading or redirecting
    return (
        <div className="flex flex-col min-h-screen">
             {/* Header Skeleton */}
             <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
                 <Skeleton className="h-6 w-6 mr-2" /> {/* Icon Skeleton */}
                 <Skeleton className="h-6 w-32" />     {/* Title Skeleton */}
                 <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                     <Skeleton className="h-8 w-20" /> {/* Button Skeleton */}
                 </div>
             </header>
            {/* Profile Content Skeleton */}
            <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12"> {/* Center content */}
                <div className="w-full max-w-2xl">
                    <Card className="shadow-lg">
                        <CardHeader className="items-center text-center">
                            <Skeleton className="h-24 w-24 rounded-full mb-4" />
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" /> {/* Description skeleton */}
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {/* Removed organizer switch skeleton */}
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-10 w-full mt-6" /> {/* Logout button skeleton */}
                        </CardContent>
                    </Card>
                </div>
            </main>
            {/* Footer Skeleton */}
            <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
            </footer>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header /> {/* Use the reusable Header component */}

       <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12"> {/* Center content */}
           <div className="w-full max-w-2xl">
                <Card className="shadow-lg bg-card text-card-foreground">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                            {/* Add AvatarImage if user.photoURL is available */}
                            {/* <AvatarImage src={user.photoURL || undefined} alt={user.email || 'User'} /> */}
                            <AvatarFallback className="text-4xl">
                                {getInitials(user?.email)}
                            </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl font-bold">{user?.email}</CardTitle>
                        <CardDescription>
                           User Account {/* Generic description */}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6"> {/* Increased spacing */}
                         {/* Removed Organizer Status Switch */}

                        {/* Placeholder for more profile information */}
                        <p className="text-muted-foreground text-center text-sm">
                            Profile details for your account.
                        </p>

                        <Button variant="outline" onClick={handleLogout} className="w-full">
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>

        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
            <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
        </footer>
    </div>
  );
}
