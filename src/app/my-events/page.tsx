
// src/app/my-events/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Trash2, Pencil } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';

// Camp Data Interface - consistent with dashboard and other camp pages
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
  organizerId?: string;
  organizerEmail?: string;
  createdAt?: Timestamp;
  activities?: string[];
}

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [myCreatedCamps, setMyCreatedCamps] = useState<Camp[]>([]);
  // Placeholder state for booked camps - replace with actual data fetching later
  const [bookedCamps, setBookedCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      fetchMyCreatedCamps();
      // Future: Fetch booked camps here
      setBookedCamps([]); // Initialize booked camps as empty for now
      setLoading(false); // Set loading false after setup (adjust when fetching booked)
    } else {
      // Reset states if user logs out
      setLoading(false);
      setMyCreatedCamps([]);
      setBookedCamps([]);
    }
  }, [user]); // Depend on user

  // Function to fetch user's created Firestore camps
  const fetchMyCreatedCamps = async () => {
    if (!user) return;
    setLoading(true); // Ensure loading is true while fetching
    try {
      const campsCollectionRef = collection(db, 'camps');
      const querySnapshot = await getDocs(campsCollectionRef);
      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'>
      }))
      .filter(camp => camp.organizerId === user.uid) // Filter for user's camps
      .sort((a, b) => {
          // Sort by creation date, newest first
          const dateA = a.createdAt?.toDate() ?? new Date(0);
          const dateB = b.createdAt?.toDate() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
      });
      setMyCreatedCamps(fetchedCamps);
    } catch (error) {
      console.error("Error fetching user's created camps:", error);
      toast({
        title: 'Error',
        description: 'Could not load your created camps.',
        variant: 'destructive',
      });
    } finally {
      // Consider setting loading to false only after both fetches (created & booked) are done
       setLoading(false);
    }
  };

  // Function to handle camp deletion (identical to dashboard)
  const handleDeleteCamp = async (campId: string) => {
    if (!campId || !user) return;
    const campToDelete = myCreatedCamps.find(camp => camp.id === campId);
    if (!campToDelete || campToDelete.organizerId !== user.uid) {
       toast({ title: 'Permission Denied', description: 'Cannot delete this camp.', variant: 'destructive' });
       return;
    }

    setDeletingCampId(campId);
    try {
      await deleteDoc(doc(db, 'camps', campId));
      setMyCreatedCamps(prev => prev.filter(camp => camp.id !== campId));
      toast({ title: 'Camp Deleted', description: 'The camp has been successfully removed.' });
    } catch (error) {
      console.error("Error deleting camp:", error);
      toast({ title: 'Deletion Failed', description: 'Could not delete the camp.', variant: 'destructive' });
    } finally {
      setDeletingCampId(null);
    }
  };

  // Reusable Camp Card Component (similar to dashboard)
  const CampCard = ({ camp }: { camp: Camp }) => {
      const isOwner = camp.organizerId === user?.uid; // Check ownership

      return (
        <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card">
            <div className="relative w-full h-48">
            <Image
                src={camp.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
                alt={camp.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint="camp nature outdoor"
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
            <span className="text-lg font-semibold text-primary">{camp.price} ₽</span>
            <div className="flex gap-2 items-center">
                <Button size="sm" asChild variant="outline">
                <Link href={`/camps/${camp.id}`} prefetch={false}>
                    View
                </Link>
                </Button>
                {/* Show Edit and Delete only for owned camps */}
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
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingCampId === camp.id} aria-label={`Delete ${camp.name}`}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the camp "{camp.name}".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCamp(camp.id)} className="bg-destructive hover:bg-destructive/90">Delete Camp</AlertDialogAction>
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

  // Skeleton Card Component (similar to dashboard)
   const SkeletonCard = ({ count = 1 }: { count?: number }) => (
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

  // Loading state skeleton
  if (authLoading || loading || (!user && !authLoading)) {
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
          <div className="container mx-auto px-4 py-8 md:py-12">
             <Skeleton className="h-6 w-40 mb-6" /> {/* Back link */}
             <Skeleton className="h-8 w-48 mb-6" /> {/* Section title */}
             <SkeletonCard count={2} />
             <Skeleton className="h-px w-full my-8" /> {/* Separator */}
             <Skeleton className="h-8 w-64 mb-6" /> {/* Section title */}
             <Card className="text-center py-12">
                <CardContent>
                    <Skeleton className="h-4 w-3/4 mx-auto mb-4" />
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
        <div className="container mx-auto px-4 py-8 md:py-12">
           <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-8" prefetch={false}>
               <ArrowLeft className="mr-2 h-4 w-4" />
               Back to Main
           </Link>

           {/* Section for User's Created Camps */}
           <div className="mb-12">
               <h2 className="text-2xl md:text-3xl font-bold mb-6">My Created Camps</h2>
               {myCreatedCamps.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {myCreatedCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
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

           <Separator className="my-12"/>

           {/* Section for Camps User Responded To (Placeholder) */}
           <div>
               <h2 className="text-2xl md:text-3xl font-bold mb-6">Camps I'm Attending</h2>
               {/* Replace with actual booked camps data and rendering */}
               {loading ? (
                 <SkeletonCard count={1} />
               ) : bookedCamps.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {/* Map over bookedCamps and render CampCard or a specific 'booked' card */}
                       {/* Example: bookedCamps.map((camp) => <CampCard key={camp.id} camp={camp} />) */}
                   </div>
               ) : (
                   <Card className="text-center py-12">
                       <CardContent>
                           <p className="text-muted-foreground">You haven't booked any camps yet.</p>
                           {/* Optionally link to the main page to discover camps */}
                           <Button variant="outline" asChild>
                                <Link href="/main">Discover Camps</Link>
                            </Button>
                       </CardContent>
                   </Card>
               )}
           </div>

        </div>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
        <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
      </footer>
    </div>
  );
}
