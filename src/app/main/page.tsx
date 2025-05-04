
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { collection, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Trash2, Pencil, PlusCircle } from 'lucide-react'; // Keep Pencil/Trash2 imports for now, just remove usage
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';

// Camp Data Interface - reflects Firestore structure
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
  organizerId?: string; // Crucial for checking ownership
  organizerEmail?: string;
  createdAt?: Timestamp;
  activities?: string[];
}

// Banner Component
const Banner = ({ title, description, imageUrl, imageAlt, imageHint }: {
    title: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
    imageHint: string;
}) => (
    <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-lg mb-12">
        <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            style={{ objectFit: 'cover' }}
            sizes="100vw"
            priority // Prioritize banner images if they are above the fold
            data-ai-hint={imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent p-8 md:p-12 flex flex-col justify-center items-start text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            <p className="text-lg md:text-xl mb-6 max-w-xl">{description}</p>
            {/* Button removed as requested */}
        </div>
    </div>
);


export default function MainPage() { // Renamed from DashboardPage
  const { user, isAdmin, loading: authLoading } = useAuth(); // Added isAdmin
  const router = useRouter();
  const { toast } = useToast();
  const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  // Removed deletingCampId state as deletion is moved to admin panel
  // const [deletingCampId, setDeletingCampId] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated and loading is finished
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Fetch Firestore data if user is logged in
    if (user) {
      setFirestoreLoading(true);
      fetchFirestoreCamps(); // Call fetch function
    } else {
      // Reset states if user logs out
      setFirestoreLoading(false);
      setFirestoreCamps([]);
    }
  }, [user]); // Depend on user to refetch if user changes

  // Function to fetch Firestore camps
  const fetchFirestoreCamps = async () => {
    try {
      const campsCollectionRef = collection(db, 'camps');
      const querySnapshot = await getDocs(campsCollectionRef);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to the beginning of today for accurate comparison

      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'> // Assert data type, excluding id
      }))
      .filter(camp => {
          // Keep camps where the end date is today or in the future
          const endDate = camp.endDate?.toDate();
          return endDate && endDate >= today;
      })
      .sort((a, b) => {
          // Sort active camps by creation date, newest first, if createdAt exists
          const dateA = a.createdAt?.toDate() ?? new Date(0);
          const dateB = b.createdAt?.toDate() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
      });
      setFirestoreCamps(fetchedCamps);
    } catch (error) {
      console.error("Error fetching camps from Firestore:", error);
      toast({
        title: 'Error',
        description: 'Could not load camps from the database.',
        variant: 'destructive',
      });
    } finally {
      setFirestoreLoading(false);
    }
  };

  // Removed handleDeleteCamp function as it's moved to admin panel
  /*
  const handleDeleteCamp = async (campId: string) => {
    // ... (deletion logic removed)
  };
  */

  // Helper component for rendering camp cards
  const CampCard = ({ camp }: { camp: Camp }) => {
    // No need to check ownership here as edit/delete are removed
    // const isOwner = camp.organizerId === user?.uid;

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
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{camp.description}</p>
        </CardContent>
        <div className="p-6 pt-0 flex justify-between items-center gap-2">
          <span className="text-lg font-semibold text-primary">{camp.price} ₽</span> {/* Changed $ to ₽ */}
          <div className="flex gap-2 items-center"> {/* Ensure items are vertically centered */}
            <Button size="sm" asChild variant="outline">
              <Link href={`/camps/${camp.id}`} prefetch={false}>
                View
              </Link>
            </Button>
            {/* REMOVED Edit and Delete buttons */}
            {/*
            {isOwner && (
              <>
                <Button size="sm" asChild variant="ghost">
                    <Link href={`/camps/${camp.id}/edit`} prefetch={false} aria-label={`Edit ${camp.name}`}>
                       <span className="flex items-center">
                           <Pencil className="h-4 w-4" />
                           <span className="sr-only">Edit</span>
                       </span>
                    </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={deletingCampId === camp.id}
                      aria-label={`Delete ${camp.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the camp
                        <span className="font-medium"> "{camp.name}"</span> from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteCamp(camp.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete Camp
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            */}
          </div>
        </div>
      </Card>
    );
  };

  // Helper component for rendering skeleton cards
  const SkeletonCard = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="overflow-hidden bg-card">
          <Skeleton className="h-48 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
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

    // Skeleton for Banners
    const BannerSkeleton = () => (
        <div className="mb-12">
             <Skeleton className="w-full h-64 md:h-80 rounded-lg" />
        </div>
    );


  if (authLoading || (!user && !authLoading) ) { // Show skeleton if loading or if redirect hasn't happened yet
    return (
       <div className="flex flex-col min-h-screen">
           {/* Use a simpler Header skeleton or just the header structure */}
           <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
               <Skeleton className="h-6 w-6 mr-2" /> {/* Icon Skeleton */}
               <Skeleton className="h-6 w-32" />     {/* Title Skeleton */}
               <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                   <Skeleton className="h-8 w-20" /> {/* Button Skeleton */}
               </div>
           </header>
           <main className="flex-1 p-4 md:p-8 lg:p-12">
                {/* Banner Skeleton */}
                <BannerSkeleton />
                {/* Camps Skeleton */}
               <Skeleton className="h-8 w-1/3 mb-8" />
               <SkeletonCard count={6} /> {/* Show more skeletons initially */}
           </main>
           <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
           </footer>
        </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header /> {/* Use the reusable Header component */}

      <main className="flex-1 p-4 md:p-8 lg:p-12"> {/* Reduced top-level space-y-12 */}

         {/* Banners Section */}
         <div className="mb-12"> {/* Margin bottom to separate from camps */}
             <Banner
                 title="Find Your Perfect Camp Experience" // Changed title
                 description="Explore a wide variety of camps, from outdoor adventures to creative workshops, and book your next adventure." // Changed description
                 imageUrl="https://picsum.photos/seed/banner-discover/1200/400" // Changed seed for potentially different image
                 imageAlt="Children enjoying activities at a summer camp" // More descriptive alt text
                 imageHint="camp discover explore fun" // Updated hints
             />
         </div>


        {/* Section for All Available Firestore Camps */}
        <div id="available-camps"> {/* Added ID for potential linking */}
          <h2 className="text-2xl font-bold mb-6 text-foreground">Available Camps</h2>
          {firestoreLoading ? (
            <SkeletonCard count={firestoreCamps.length > 0 ? firestoreCamps.length : 3} /> // Show reasonable number during load
          ) : firestoreCamps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {firestoreCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
           </div>
          ) : (
             <Card className="text-center py-12">
                <CardContent>
                    <p className="text-muted-foreground mb-4">No upcoming camps found.</p>
                    {/* Show create camp button only if user is admin */}
                    {isAdmin && (
                        <Button asChild>
                            <Link href="/camps/new">Create a New Camp</Link>
                        </Button>
                    )}
                </CardContent>
             </Card>
          )}
        </div>

      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
        <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
      </footer>
    </div>
  );
}

