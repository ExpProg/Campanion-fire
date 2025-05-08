

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tent, ArrowRight, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge'; // Added Badge import


// Camp Data Interface - consistent with other pages
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  location: string;
  imageUrl: string;
  price: number;
  status: 'draft' | 'active' | 'archive';
  organizerId?: string;
  organizerName?: string;
  organizerLink?: string;
  creatorId?: string;
  createdAt?: Timestamp;
  activities?: string[];
}

// Helper component for rendering camp cards (similar to main page)
const CampCard = ({ camp }: { camp: Camp }) => {
    const organizerDisplay = camp.organizerName || 'Campanion Partner'; // Fallback
    const formattedPrice = camp.price.toLocaleString('ru-RU'); // Format price with spaces

    return (
      <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card h-full"> {/* Added h-full */}
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
          <CardTitle className="text-lg">{camp.name}</CardTitle> {/* Reduced font size for title */}
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
          <p className="text-sm text-muted-foreground mb-1 line-clamp-3">{camp.description}</p>
          <Link href={`/camps/${camp.id}`} prefetch={false} className="text-sm text-primary hover:underline inline-flex items-center">
            Read more <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
          {/* Display Activities */}
          {camp.activities && camp.activities.length > 0 && (
            <div className="mt-4 mb-2"> {/* Adjusted margin for activities */}
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Activities</h4>
              <div className="flex flex-wrap gap-1">
                {camp.activities.slice(0, 3).map(activity => ( // Show max 3 activities
                  <Badge key={activity} variant="secondary" className="text-xs">
                    {activity}
                  </Badge>
                ))}
                {camp.activities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    + {camp.activities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 pt-0 flex justify-between items-center gap-2">
          <span className="text-base font-semibold text-primary">{formattedPrice} ₽</span> {/* Reduced font size for price */}
          <div className="flex gap-2 items-center"> {/* Ensure items are vertically centered */}
            <Button size="sm" asChild variant="outline">
              {/* Link to the specific camp details page */}
              <Link href={`/camps/${camp.id}`} prefetch={false}>
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
};

// Helper component for rendering skeleton cards (similar to main page)
const SkeletonCard = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"> {/* Changed lg:grid-cols-3 to lg:grid-cols-2 */}
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="overflow-hidden bg-card h-full"> {/* Added h-full */}
          <Skeleton className="h-48 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" /> {/* Title placeholder */}
            <Skeleton className="h-4 w-1/2" /> {/* Location/dates placeholder */}
            <Skeleton className="h-4 w-2/5 mt-1" /> {/* Organizer placeholder */}
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" /> {/* Description placeholder */}
            <Skeleton className="h-4 w-1/2 mt-2" /> {/* Activities placeholder */}
          </CardContent>
          <div className="p-6 pt-0 flex justify-between items-center">
            <Skeleton className="h-6 w-1/4" /> {/* Price placeholder */}
            <Skeleton className="h-8 w-1/3" /> {/* Button placeholder */}
          </div>
        </Card>
      ))}
    </div>
);


export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [featuredCamps, setFeaturedCamps] = useState<Camp[]>([]);
  const [campsLoading, setCampsLoading] = useState(true);

  useEffect(() => {
    // Redirect if user is logged in
    if (!loading && user) {
      router.push('/main');
    }
  }, [user, loading, router]);

   // Fetch featured camps (latest 3 active)
  useEffect(() => {
    // Only fetch if user is not logged in (as logged-in users are redirected)
    if (!user && !loading) {
        fetchFeaturedCamps();
    }
  }, [user, loading]); // Re-run if user or loading state changes

  // Function to fetch featured Firestore camps
  const fetchFeaturedCamps = async () => {
    setCampsLoading(true);
    try {
      const campsCollectionRef = collection(db, 'camps');
      const q = query(
        campsCollectionRef,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'), // Order by creation date descending
        limit(3) // Limit to 3 results
      );
      const querySnapshot = await getDocs(q);

      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'>
      }));
      setFeaturedCamps(fetchedCamps);
    } catch (error) {
      console.error("Error fetching featured camps from Firestore:", error);
      toast({
        title: 'Error fetching camps',
        description: 'Could not load featured camps. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setCampsLoading(false);
    }
  };


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
                 {/* Adjusted vertical padding (py-*) */}
                 <section className="w-full py-8 md:py-12 lg:py-16 xl:py-20 flex justify-center items-center">
                     <div className="container px-4 md:px-6 text-center space-y-6 max-w-6xl">
                         <Skeleton className="h-12 w-3/4 mx-auto" />
                         <Skeleton className="h-6 w-full max-w-[700px] mx-auto" />
                         <Skeleton className="h-6 w-11/12 max-w-[650px] mx-auto" />
                         <div className="flex justify-center space-x-4">
                             <Skeleton className="h-12 w-32" />
                             <Skeleton className="h-12 w-32" />
                         </div>
                     </div>
                 </section>
                 {/* Featured Camps Skeleton */}
                 <section className="w-full py-12 bg-muted/50"> {/* Changed padding */}
                    {/* Use container class directly */}
                    <div className="container max-w-6xl">
                        {/* Skeleton for centered title */}
                        <Skeleton className="h-10 w-1/3 mx-auto mb-8" />
                        <SkeletonCard count={3} />
                        {/* Skeleton for centered button */}
                        <div className="mt-12 text-center">
                            <Skeleton className="h-10 w-40 mx-auto" />
                        </div>
                    </div>
                 </section>
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
        {/* Reduced vertical padding */}
        <section className="w-full py-8 md:py-12 lg:py-16 xl:py-20 flex justify-center items-center bg-gradient-to-b from-background to-muted/50">
          <div className="container px-4 md:px-6 text-center max-w-6xl">
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
                 {/* Updated Explore Camps button link to /camps */}
                 <Link
                     href="/camps" // Link to the new public camps listing page
                     prefetch={false}
                     className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
                 >
                     Explore Camps
                 </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Camps Section - Full Width Background */}
        <section className="w-full py-12 bg-muted/50"> {/* Reduced padding to py-12 */}
           {/* Container for content within the full-width section */}
           {/* Apply container class which centers the content */}
           <div className="container max-w-6xl">
               {/* Added text-center to center the heading */}
               <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-foreground">Recently Added Camps</h2>
               {campsLoading ? (
                   <SkeletonCard count={3} />
               ) : featuredCamps.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"> {/* Changed lg:grid-cols-3 to lg:grid-cols-2 */}
                       {featuredCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
                   </div>
               ) : (
                   <p className="text-center text-muted-foreground">No camps available right now. Check back soon!</p>
               )}
               {/* Added text-center to center the button link */}
               <div className="mt-12 text-center">
                   <Link
                       href="/camps"
                       prefetch={false}
                       className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                   >
                       Explore All Camps <ArrowRight className="ml-2 h-5 w-5" />
                   </Link>
               </div>
           </div>
        </section>

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

