
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { signOut } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { Tent, LogOut, PlusCircle, Trash2, Home, Menu } from 'lucide-react'; // Added Menu
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"; // Added Sheet imports
import { useToast } from '@/hooks/use-toast';

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

// Sample Camp Data (Remains for demonstration)
const sampleCamps: Camp[] = [
  {
    id: 'sample-1',
    name: 'Adventure Camp Alpha',
    description: 'Experience the thrill of the outdoors with hiking, climbing, and more.',
    dates: 'July 10 - July 20, 2024',
    location: 'Rocky Mountains, CO',
    imageUrl: 'https://picsum.photos/seed/camp1/600/400',
    price: 1200,
  },
  {
    id: 'sample-2',
    name: 'Creative Arts Camp Beta',
    description: 'Unleash your creativity with painting, pottery, and music workshops.',
    dates: 'August 5 - August 15, 2024',
    location: 'Forest Retreat, CA',
    imageUrl: 'https://picsum.photos/seed/camp2/600/400',
    price: 950,
  },
  {
    id: 'sample-3',
    name: 'Science Explorers Gamma',
    description: 'Dive into the world of science with hands-on experiments and discovery.',
    dates: 'July 22 - August 1, 2024',
    location: 'Coastal Institute, ME',
    imageUrl: 'https://picsum.photos/seed/camp3/600/400',
    price: 1100,
  },
  {
    id: 'sample-4',
    name: 'Wilderness Survival Delta',
    description: 'Learn essential survival skills in a challenging and rewarding environment.',
    dates: 'September 1 - September 10, 2024',
    location: 'Appalachian Trail, NC',
    imageUrl: 'https://picsum.photos/seed/camp4/600/400',
    price: 1350,
  },
];

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [camps, setCamps] = useState<Camp[]>([]); // State for sample camps
  const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]); // State for Firestore camps
  const [sampleLoading, setSampleLoading] = useState(true); // Loading state for sample data
  const [firestoreLoading, setFirestoreLoading] = useState(true); // Loading state for Firestore data
  const [deletingCampId, setDeletingCampId] = useState<string | null>(null); // State for deletion

  useEffect(() => {
    // Redirect to login if not authenticated and loading is finished
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Simulate fetching sample camp data & fetch Firestore data
    if (user) { // Only fetch if user is logged in
      setSampleLoading(true);
      setFirestoreLoading(true);

      // Simulate fetching sample data (as before)
      setTimeout(() => {
        setCamps(sampleCamps);
        setSampleLoading(false);
      }, 500); // Reduced delay for samples

      // Fetch data from Firestore
      fetchFirestoreCamps(); // Call fetch function

    } else {
      // Reset states if user logs out
      setSampleLoading(false);
      setFirestoreLoading(false);
      setCamps([]);
      setFirestoreCamps([]);
    }
  }, [user]); // Depend on user to refetch if user changes

  // Function to fetch Firestore camps
  const fetchFirestoreCamps = async () => {
    try {
      const campsCollectionRef = collection(db, 'camps');
      const querySnapshot = await getDocs(campsCollectionRef);
      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'> // Assert data type, excluding id
      }));
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to landing page after logout
    } catch (error) {
      console.error('Logout Error:', error);
      toast({
        title: 'Logout Failed',
        description: 'An error occurred during logout.',
        variant: 'destructive',
      });
    }
  };

  // Function to handle camp deletion
  const handleDeleteCamp = async (campId: string) => {
    if (!campId) return;
    setDeletingCampId(campId);

    try {
      const campDocRef = doc(db, 'camps', campId);
      await deleteDoc(campDocRef);

      setFirestoreCamps(prevCamps => prevCamps.filter(camp => camp.id !== campId));

      toast({
        title: 'Camp Deleted',
        description: 'The camp has been successfully removed.',
      });
    } catch (error) {
      console.error("Error deleting camp:", error);
      toast({
        title: 'Deletion Failed',
        description: 'Could not delete the camp. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingCampId(null);
    }
  };

  // Helper component for rendering camp cards
  const CampCard = ({ camp, isFirestoreCamp = false }: { camp: Camp; isFirestoreCamp?: boolean }) => {
    const isOrganizerOfThisCamp = profile?.isOrganizer && isFirestoreCamp && camp.organizerId === user?.uid;

    return (
      <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="relative w-full h-48">
          <Image
            src={camp.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
            alt={camp.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="camp nature adventure"
            priority={camp.id.startsWith('sample-') && parseInt(camp.id.split('-')[1]) <= 2}
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
          <span className="text-lg font-semibold text-primary">${camp.price}</span>
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <Link href={`/camps/${camp.id}`} prefetch={false}>
                View Details
              </Link>
            </Button>
            {isOrganizerOfThisCamp && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingCampId === camp.id}
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
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Helper component for rendering skeleton cards
  const SkeletonCard = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="overflow-hidden">
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

  if (authLoading || !user) {
    return (
       <div className="flex flex-col min-h-screen">
           {/* Simplified Header Skeleton */}
           <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
               <Skeleton className="h-6 w-6 mr-2" /> {/* Icon Skeleton */}
               <Skeleton className="h-6 w-32" />     {/* Title Skeleton */}
               <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                   <Skeleton className="h-8 w-20" /> {/* Button Skeleton */}
               </div>
           </header>
           {/* Main Content Skeleton */}
           <main className="flex-1 p-4 md:p-8 lg:p-12">
               <Skeleton className="h-8 w-1/3 mb-8" />
               <SkeletonCard count={6} />
           </main>
           {/* Footer Skeleton */}
           <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
           </footer>
        </div>
    );
  }

  // Filter Firestore camps to show only those created by the current user if they are an organizer
  const userIsOrganizer = profile?.isOrganizer;
  const myFirestoreCamps = userIsOrganizer
    ? firestoreCamps.filter(camp => camp.organizerId === user.uid)
    : []; // Non-organizers see no "My Camps"

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
               <Menu className="h-6 w-6" />
               <span className="sr-only">Open Menu</span>
            </Button>
          </SheetTrigger>
          {/* Updated width classes here - reduced width */}
          <SheetContent side="left" className="w-[250px] sm:w-[300px]">
            <SheetHeader>
              <SheetTitle>
                <Link href="/dashboard" className="flex items-center justify-center sm:justify-start" prefetch={false}>
                  <Tent className="h-6 w-6 text-primary" />
                  <span className="ml-2 text-xl font-semibold">Campanion</span>
                </Link>
              </SheetTitle>
              <SheetDescription>
                 Welcome, {user.email}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col space-y-4 py-6">
               <SheetClose asChild>
                   <Link href="/dashboard" className="text-lg font-medium hover:text-primary" prefetch={false}>
                     Dashboard
                   </Link>
                </SheetClose>
               {userIsOrganizer && (
                 <SheetClose asChild>
                     <Link href="/camps/new" className="text-lg font-medium hover:text-primary" prefetch={false}>
                       Create Camp
                     </Link>
                 </SheetClose>
               )}
               {/* Add more links here as needed */}
            </div>
            <SheetFooter className="absolute bottom-6 left-0 right-0 px-6">
              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center justify-center" prefetch={false}>
          <Tent className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-semibold">Campanion</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {userIsOrganizer && (
             <Button asChild size="sm" className="hidden sm:inline-flex"> {/* Hide on small screens */}
                <Link href="/camps/new" prefetch={false}>
                   <PlusCircle className="mr-2 h-4 w-4" /> Create Camp
                </Link>
             </Button>
          )}
          <span className="text-sm text-muted-foreground hidden md:inline"> {/* Hide on small/medium screens */}
              Welcome, {user.email}
          </span>
          <Button variant="ghost" onClick={handleLogout} size="sm" className="hidden sm:inline-flex"> {/* Hide on small screens */}
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 lg:p-12 space-y-12">
        {/* Section for User's Firestore Camps (if organizer) */}
        {userIsOrganizer && (
          <div>
            <h2 className="text-2xl font-bold mb-6">My Camps</h2>
            {firestoreLoading ? (
              <SkeletonCard count={myFirestoreCamps.length > 0 ? myFirestoreCamps.length : 1} />
            ) : myFirestoreCamps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myFirestoreCamps.map((camp) => <CampCard key={camp.id} camp={camp} isFirestoreCamp={true} />)}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                You haven't created any camps yet. <Link href="/camps/new" className="text-primary hover:underline">Create one!</Link>
              </p>
            )}
          </div>
        )}
        {/* Reordered: Moved this separator check after My Camps section */}
        {userIsOrganizer && myFirestoreCamps.length > 0 && firestoreCamps.length > 0 && <Separator />}

        {/* Section for All Firestore Camps */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Discover Camps (Database)</h2>
          {firestoreLoading ? (
            <SkeletonCard count={3} />
          ) : firestoreCamps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Filter out camps that are already shown in "My Camps" */}
              {firestoreCamps
                .filter(camp => !(userIsOrganizer && camp.organizerId === user.uid))
                .map((camp) => <CampCard key={camp.id} camp={camp} isFirestoreCamp={true} />)}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No camps found in the database yet.
              {userIsOrganizer && <> Be the first to <Link href="/camps/new" className="text-primary hover:underline">create one!</Link></>}
            </p>
          )}
        </div>

        {/* Only show separator if there are database camps AND sample camps */}
        {firestoreCamps.length > 0 && camps.length > 0 && <Separator />}

        {/* Section for Sample Camps */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Featured Camps (Samples)</h2>
          {sampleLoading ? (
            <SkeletonCard count={3} />
          ) : camps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps.map((camp) => <CampCard key={camp.id} camp={camp} isFirestoreCamp={false} />)}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No sample camps available.</p>
          )}
        </div>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
        <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
      </footer>
    </div>
  );
}
