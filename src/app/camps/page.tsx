
// src/app/camps/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Optional: can use for context later if needed
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Building, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';

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
const SkeletonCard = ({ count = 6 }: { count?: number }) => (
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
            <Skeleton className="h-8 w-1/3" />
          </div>
        </Card>
      ))}
    </div>
);

// Skeleton for the header
const HeaderSkeleton = () => (
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
          <Skeleton className="h-6 w-6 mr-2" /> {/* Icon Skeleton */}
          <Skeleton className="h-6 w-32" />     {/* Title Skeleton */}
          <div className="ml-auto flex gap-4 sm:gap-6 items-center">
              <Skeleton className="h-8 w-20" /> {/* Button Skeleton */}
              <Skeleton className="h-8 w-24" /> {/* Button Skeleton */}
          </div>
      </header>
);

// Skeleton for the footer
const FooterSkeleton = () => (
     <footer className="py-6 px-4 md:px-6 border-t">
         <Skeleton className="h-4 w-1/4" />
     </footer>
);


export default function AllCampsPage() {
  const { loading: authLoading } = useAuth(); // Only need authLoading to decide when to show header
  const { toast } = useToast();
  const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]);
  const [campsLoading, setCampsLoading] = useState(true);

  useEffect(() => {
    // Fetch Firestore data on mount, regardless of user login status
    setCampsLoading(true);
    fetchFirestoreCamps();
  }, []); // Empty dependency array means this runs once on mount

  // Function to fetch active Firestore camps
  const fetchFirestoreCamps = async () => {
    try {
      const campsCollectionRef = collection(db, 'camps');
      const q = query(campsCollectionRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);

      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'>
      }))
      .sort((a, b) => {
          const dateA = a.createdAt?.toDate() ?? new Date(0);
          const dateB = b.createdAt?.toDate() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
      });
      setFirestoreCamps(fetchedCamps);
    } catch (error) {
      console.error("Error fetching active camps from Firestore:", error);
      toast({
        title: 'Error fetching camps',
        description: 'Could not load camps. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setCampsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Conditionally render header or skeleton based on auth loading state */}
      {authLoading ? <HeaderSkeleton /> : <Header />}

      <main className="flex-1 p-4 md:p-8 lg:p-12">
          <div className="container mx-auto px-4 py-8 md:py-12">
             <Link href="/" className="inline-flex items-center text-primary hover:underline mb-8" prefetch={false}>
                 <ArrowLeft className="mr-2 h-4 w-4" />
                 Back to Home
             </Link>

            <h1 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">Explore All Camps</h1>

            {/* Show skeleton if camps are loading */}
            {campsLoading ? (
               <SkeletonCard count={6} />
            ) : firestoreCamps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {firestoreCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
             </div>
            ) : (
               <Card className="text-center py-12 border-dashed">
                  <CardContent>
                      <p className="text-muted-foreground mb-4">No active camps found at the moment. Check back soon!</p>
                  </CardContent>
               </Card>
            )}
          </div>
      </main>

        {/* Conditionally render footer or skeleton */}
       {authLoading ? <FooterSkeleton /> : (
           <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
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
        )}
    </div>
  );
}
