
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { collection, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore'; // Removed query, where
import { db } from '@/config/firebase';
import { Trash2, Pencil } from 'lucide-react'; // Added Pencil icon
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
import Header from '@/components/layout/Header'; // Import the Header component

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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [deletingCampId, setDeletingCampId] = useState<string | null>(null);

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
      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'> // Assert data type, excluding id
      })).sort((a, b) => {
          // Sort by creation date, newest first, if createdAt exists
          const dateA = a.createdAt?.toDate() ?? new Date(0);
          const dateB = b.createdAt?.toDate() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
      }); // Sort camps by creation date
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

  // Function to handle camp deletion
  const handleDeleteCamp = async (campId: string) => {
    if (!campId) return;
    // Ensure only the owner can delete
    const campToDelete = firestoreCamps.find(camp => camp.id === campId);
    if (campToDelete?.organizerId !== user?.uid) {
       toast({
         title: 'Permission Denied',
         description: 'You can only delete camps you created.',
         variant: 'destructive',
       });
       return;
    }

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
    // Check if the current logged-in user is the organizer of this specific camp
    const isOwner = isFirestoreCamp && camp.organizerId === user?.uid;

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
            {/* Show Edit and Delete buttons only if the user owns this Firestore camp */}
            {isOwner && (
              <>
                <Button size="sm" asChild variant="ghost">
                    <Link href={`/camps/${camp.id}/edit`} prefetch={false} aria-label={`Edit ${camp.name}`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                    </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon" // Make it icon only
                      className="text-destructive hover:bg-destructive/10" // Style ghost button for destructive action
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
               <Skeleton className="h-8 w-1/3 mb-8" />
               <SkeletonCard count={6} /> {/* Show more skeletons initially */}
           </main>
           <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
           </footer>
        </div>
    );
  }

  // Filter Firestore camps to show only those created by the current user
  const myFirestoreCamps = user?.uid
    ? firestoreCamps.filter(camp => camp.organizerId === user.uid)
    : [];

   // Filter out the user's own camps to show in the 'Discover' section
  const otherCamps = firestoreCamps.filter(camp => camp.organizerId !== user?.uid);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header /> {/* Use the reusable Header component */}

      <main className="flex-1 p-4 md:p-8 lg:p-12 space-y-12">
        {/* Section for User's Firestore Camps (My Camps) */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">My Camps</h2>
             <Button asChild>
                 <Link href="/camps/new" prefetch={false}>Create Camp</Link>
             </Button>
          </div>
          {firestoreLoading ? (
            <SkeletonCard count={myFirestoreCamps.length > 0 ? myFirestoreCamps.length : 1} />
          ) : myFirestoreCamps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myFirestoreCamps.map((camp) => <CampCard key={camp.id} camp={camp} isFirestoreCamp={true} />)}
            </div>
          ) : (
             <Card className="text-center py-12">
                <CardContent>
                    <p className="text-muted-foreground mb-4">You haven't created any camps yet.</p>
                    <Button asChild>
                        <Link href="/camps/new">Create Your First Camp</Link>
                    </Button>
                </CardContent>
             </Card>
          )}
        </div>

        {/* Separator shown if user has camps and there are other camps to discover */}
        {myFirestoreCamps.length > 0 && otherCamps.length > 0 && <Separator />}

        {/* Section for All Other Firestore Camps */}
        {otherCamps.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-foreground">Discover Other Camps</h2>
              {firestoreLoading ? (
                <SkeletonCard count={3} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {otherCamps.map((camp) => <CampCard key={camp.id} camp={camp} isFirestoreCamp={true} />)}
               </div>
              )}
            </div>
        )}
         {/* Message if there are no camps at all */}
        {!firestoreLoading && firestoreCamps.length === 0 && (
             <Card className="text-center py-12">
                <CardContent>
                    <p className="text-muted-foreground mb-4">No camps found in the database yet.</p>
                    <Button asChild>
                        <Link href="/camps/new">Be the first to create one!</Link>
                    </Button>
                </CardContent>
             </Card>
        )}


      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
        <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
      </footer>
    </div>
  );
}
