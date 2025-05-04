

'use client';

import React, { useEffect, useState } from 'react'; // Added useEffect, useState
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tent, Search, ListChecks, Sparkles, Building } from 'lucide-react'; // Added Building
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'; // Import CardDescription
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore'; // Added Firestore imports
import { db } from '@/config/firebase'; // Added db import
import { useToast } from '@/hooks/use-toast'; // Added useToast import
import Image from 'next/image'; // Added Image import

// Camp Data Interface (ensure consistency)
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string; // Pre-formatted string like "Jul 10 - Jul 20, 2024"
  startDate?: Timestamp; // Stored as Timestamp
  endDate?: Timestamp;   // Stored as Timestamp
  location: string;
  imageUrl: string;
  price: number;
  status: 'draft' | 'active' | 'archive'; // Added 'archive' status
  organizerId?: string; // Link to the organizers collection
  organizerName?: string; // Denormalized organizer name
  organizerLink?: string; // Denormalized organizer link
  creatorId?: string; // ID of the user who created the camp
  createdAt?: Timestamp;
  activities?: string[];
}

// Helper component for rendering camp cards (similar to main page)
const LandingCampCard = ({ camp }: { camp: Camp }) => {
    const organizerDisplay = camp.organizerName || 'Campanion Partner'; // Fallback
    const formattedPrice = camp.price.toLocaleString('ru-RU'); // Format price with spaces

    return (
      <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
        <div className="relative w-full h-48">
          <Image
            src={camp.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
            alt={camp.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="camp nature adventure"
          />
        </div>
        <CardHeader>
          <CardTitle>{camp.name}</CardTitle>
          <CardDescription>{camp.location} | {camp.dates}</CardDescription>
          {/* Display Organizer Info */}
          <CardDescription className="flex items-center pt-1">
            <Building className="h-4 w-4 mr-1 text-muted-foreground" />
             {camp.organizerLink ? (
                <a href={camp.organizerLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                    {organizerDisplay}
                </a>
            ) : (
                <span className="text-sm text-muted-foreground truncate">{organizerDisplay}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{camp.description}</p>
        </CardContent>
        <div className="p-6 pt-0 flex justify-between items-center gap-2">
          <span className="text-lg font-semibold text-primary">{formattedPrice} ₽</span>
           {/* Link to details, maybe replace with login prompt later */}
          <Button size="sm" asChild variant="outline">
            <Link href={`/camps/${camp.id}`} prefetch={false}>
                View Details
            </Link>
          </Button>
        </div>
      </Card>
    );
  };

  // Helper component for rendering skeleton cards
  const SkeletonCampCard = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="overflow-hidden bg-card">
          <Skeleton className="h-48 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/5 mt-1" /> {/* Organizer placeholder */}
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <div className="p-6 pt-0 flex justify-between items-center">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-1/3" /> {/* Adjusted width */}
          </div>
        </Card>
      ))}
    </div>
  );

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Removed unused toast import and state related to camps
  // const { toast } = useToast();
  // const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]);
  // const [campsLoading, setCampsLoading] = useState(true);

  React.useEffect(() => {
    // Redirect if user is logged in
    if (!loading && user) {
      router.push('/main');
    }
  }, [user, loading, router]);

   // Removed useEffect related to fetching camps for landing page

  // Show loading skeleton if auth is loading
  if (loading) {
     return (
         <div className="flex flex-col min-h-screen">
             {/* Header Skeleton */}
             <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
                 <Skeleton className="h-6 w-6 mr-2" />
                 <Skeleton className="h-6 w-32" />
                 <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                     <Skeleton className="h-8 w-20" />
                     <Skeleton className="h-8 w-24" />
                 </div>
             </header>
             {/* Landing Content Skeleton */}
             <main className="flex-1">
                {/* Hero Skeleton */}
                 <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center items-center">
                     <div className="container px-4 md:px-6 text-center space-y-6">
                         <Skeleton className="h-12 w-3/4 mx-auto" />
                         <Skeleton className="h-6 w-full max-w-[700px] mx-auto" />
                         <Skeleton className="h-6 w-11/12 max-w-[650px] mx-auto" />
                         <div className="flex justify-center space-x-4">
                             <Skeleton className="h-12 w-32" />
                             <Skeleton className="h-12 w-32" />
                         </div>
                     </div>
                 </section>
                 {/* Removed Camps List Skeleton */}
             </main>
             {/* Footer Skeleton */}
             <footer className="py-6 px-4 md:px-6 border-t">
                 <Skeleton className="h-4 w-1/4" />
             </footer>
         </div>
     );
  }

  // If user is logged in, this page shouldn't be visible due to the redirect above.
  // But as a fallback, render nothing or redirect again.
  if (user) {
    return null;
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header /> {/* Use the reusable Header component */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center items-center bg-gradient-to-b from-background to-muted/50">
          <div className="container px-4 md:px-6 text-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-foreground">
                Find Your Next Adventure
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Campanion helps you discover and book the best camps tailored to your interests. Explore nature, learn new skills, and make unforgettable memories.
              </p>
              <div className="space-x-4">
                 <Link
                    href="/register"
                    prefetch={false}
                    className={cn(buttonVariants({ size: 'lg' }))}
                 >
                    Get Started
                 </Link>
                 {/* Updated Explore Camps button link */}
                 <Link
                     href="/main" // Link directly to the main page where camps are listed
                     prefetch={false}
                     className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
                 >
                     Explore Camps
                 </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Removed Available Camps Section */}

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}

