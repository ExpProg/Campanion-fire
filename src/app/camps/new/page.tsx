
// src/app/camps/new/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

// Placeholder component for the camp creation form
function CreateCampForm() {
    // TODO: Implement the actual form using react-hook-form and shadcn components
    // Fields: name, description, dates, location, price, imageUrl, activities, etc.
    return (
        <div>
            <p className="text-muted-foreground">Camp creation form will be here.</p>
            {/* Example: Add form fields */}
            {/* <Label htmlFor="camp-name">Camp Name</Label> */}
            {/* <Input id="camp-name" placeholder="Enter camp name" /> */}
            {/* ... other fields ... */}
            <Button className="mt-6">Create Camp</Button>
        </div>
    );
}


export default function CreateCampPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if auth loading is done, user exists, but is not an organizer OR if user doesn't exist
    if (!loading) {
        if (!user) {
            router.push('/login'); // Not logged in
        } else if (!profile?.isOrganizer) {
            router.push('/dashboard'); // Logged in but not an organizer
        }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile?.isOrganizer) {
    // Show loading state or redirect happens in useEffect
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <Skeleton className="h-8 w-32 mb-8" /> {/* Back button placeholder */}
            <Card>
                <CardHeader>
                     <Skeleton className="h-8 w-1/2 mb-2" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-10 w-full mb-4" />
                     <Skeleton className="h-10 w-full mb-4" />
                     <Skeleton className="h-20 w-full mb-4" />
                     <Skeleton className="h-10 w-1/4 mt-6" />
                </CardContent>
            </Card>
        </div>
    );
  }


  // User is logged in and is an organizer
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold">Create a New Camp</CardTitle>
          <CardDescription>Fill in the details to list your camp on Campanion.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCampForm />
        </CardContent>
      </Card>
    </div>
  );
}
