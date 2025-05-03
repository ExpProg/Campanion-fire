
// src/app/profile/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

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

  if (loading || !user) {
    // Show loading skeleton while authentication state is being determined
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Skeleton className="h-8 w-32 mb-8" /> {/* Back button placeholder */}
        <Card className="shadow-lg">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to generate initials for fallback avatar
  const getInitials = (email: string | null | undefined) => {
    if (!email) return '??';
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
       <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
           Back to Dashboard
       </Link>

      <Card className="shadow-lg bg-card text-card-foreground">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
            {/* Add AvatarImage if user.photoURL is available */}
            {/* <AvatarImage src={user.photoURL || undefined} alt={user.email || 'User'} /> */}
            <AvatarFallback className="text-4xl">
               {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-bold">{user.email}</CardTitle>
          <CardDescription>
             {profile?.isOrganizer ? 'Organizer Account' : 'User Account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder for more profile information */}
           <p className="text-muted-foreground text-center">
              More profile details can be added here in the future.
           </p>
          {/* Example: Displaying UID */}
          {/* <div className="text-sm">
             <span className="font-medium">User ID:</span>
             <span className="text-muted-foreground ml-2">{user.uid}</span>
           </div> */}

          <Button variant="outline" onClick={handleLogout} className="w-full mt-6">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
