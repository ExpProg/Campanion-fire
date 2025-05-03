// src/app/my-events/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated and loading is finished
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (!user && !authLoading)) {
    // Skeleton loading state
    return (
      <div className="flex flex-col min-h-screen">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
          <Skeleton className="h-6 w-6 mr-2" />
          <Skeleton className="h-6 w-32" />
          <div className="ml-auto flex gap-4 sm:gap-6 items-center">
            <Skeleton className="h-8 w-20" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 lg:p-12">
          <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/2 mb-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t">
          <Skeleton className="h-4 w-1/4" />
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
           <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
               <ArrowLeft className="mr-2 h-4 w-4" />
               Back to Dashboard
           </Link>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold">My Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This page will display the events you have booked or are interested in.
                Functionality to be implemented.
              </p>
              {/* Placeholder for event list */}
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
