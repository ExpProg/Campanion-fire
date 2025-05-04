
// src/app/admin/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Trash2, Pencil, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
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
  organizerId?: string;
  organizerEmail?: string;
  createdAt?: Timestamp;
  activities?: string[];
}

// Skeleton for the admin page while loading/checking auth
const AdminPageSkeleton = () => (
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
                 <Skeleton className="h-8 w-40 mb-8" /> {/* Back link placeholder */}
                 <Card>
                     <CardHeader>
                         <Skeleton className="h-8 w-1/2 mb-2" />
                         <Skeleton className="h-4 w-3/4" />
                     </CardHeader>
                     <CardContent>
                        <Skeleton className="h-8 w-48 mb-6" /> {/* Section title */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SkeletonCardSkeleton count={2} />
                        </div>
                     </CardContent>
                 </Card>
            </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t">
            <Skeleton className="h-4 w-1/4" />
        </footer>
    </div>
);

// Reusable Camp Card Component (similar to profile page)
const CampCard = ({ camp, isOwner, onDeleteClick, deletingCampId }: {
    camp: Camp;
    isOwner: boolean; // Always true in admin context if filtered correctly, but keep prop for consistency
    onDeleteClick: (campId: string) => void;
    deletingCampId: string | null;
}) => {

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
          <CardFooter className="p-6 pt-0 flex justify-between items-center gap-2">
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
                               <span className="flex items-center">
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                               </span>
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
                          <AlertDialogAction onClick={() => onDeleteClick(camp.id)} className="bg-destructive hover:bg-destructive/90">Delete Camp</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                      </AlertDialog>
                  </>
              )}
          </div>
          </CardFooter>
      </Card>
    );
};

// Skeleton Card Component (similar to profile page)
const SkeletonCardSkeleton = ({ count = 1 }: { count?: number }) => (
    <>
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
          <CardFooter className="p-6 pt-0 flex justify-between items-center">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
          </CardFooter>
        </Card>
      ))}
    </>
);


export default function AdminPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [adminCamps, setAdminCamps] = useState<Camp[]>([]);
    const [campsLoading, setCampsLoading] = useState(true);
    const [deletingCampId, setDeletingCampId] = useState<string | null>(null);


    useEffect(() => {
        // If auth is done loading and either user is not logged in or is not an admin, redirect
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/main'); // Redirect non-admins or logged-out users to the main page
        }
    }, [user, isAdmin, authLoading, router]);

     // Fetch admin's created camps
    useEffect(() => {
        if (isAdmin && user) { // Only fetch if user is admin and logged in
            fetchAdminCamps(user.uid);
        } else {
            setCampsLoading(false); // Not admin or not logged in, no camps to load
            setAdminCamps([]);
        }
    }, [isAdmin, user]); // Re-fetch if admin status or user changes

    // Function to fetch admin's created Firestore camps
    const fetchAdminCamps = async (adminId: string) => {
        setCampsLoading(true);
        try {
        const campsCollectionRef = collection(db, 'camps');
        const querySnapshot = await getDocs(campsCollectionRef);
        const fetchedCamps = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Camp, 'id'>
        }))
        .filter(camp => camp.organizerId === adminId) // Filter for admin's camps
        .sort((a, b) => (b.createdAt?.toDate() ?? new Date(0)).getTime() - (a.createdAt?.toDate() ?? new Date(0)).getTime()); // Sort newest first

        setAdminCamps(fetchedCamps);
        } catch (error) {
        console.error("Error fetching admin's created camps:", error);
        toast({
            title: 'Error',
            description: 'Could not load camps created by admin.',
            variant: 'destructive',
        });
        } finally {
            setCampsLoading(false);
        }
    };

    // Function to handle camp deletion (same logic as profile)
    const handleDeleteCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return; // Extra check for admin
        const campToDelete = adminCamps.find(camp => camp.id === campId);
        if (!campToDelete || campToDelete.organizerId !== user.uid) {
           toast({ title: 'Permission Denied', description: 'Cannot delete this camp.', variant: 'destructive' });
           return;
        }

        setDeletingCampId(campId);
        try {
        await deleteDoc(doc(db, 'camps', campId));
        setAdminCamps(prev => prev.filter(camp => camp.id !== campId)); // Update admin camps state
        toast({ title: 'Camp Deleted', description: 'The camp has been successfully removed.' });
        } catch (error) {
        console.error("Error deleting camp:", error);
        toast({ title: 'Deletion Failed', description: 'Could not delete the camp.', variant: 'destructive' });
        } finally {
        setDeletingCampId(null);
        }
    };


    // Show skeleton while loading auth or if user is null but loading isn't finished
    if (authLoading || !user) {
        return <AdminPageSkeleton />;
    }

    // If user is loaded but not admin (this case should be handled by useEffect redirect, but added as safeguard)
    if (!isAdmin) {
       return (
            <div className="flex flex-col min-h-screen">
                 <Header />
                 <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                     <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                     <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                     <p className="text-muted-foreground mb-6">You do not have permission to view this page.</p>
                     <Link href="/main" className="inline-flex items-center text-primary hover:underline" prefetch={false}>
                         <ArrowLeft className="mr-2 h-4 w-4" />
                         Return to Main Page
                     </Link>
                 </main>
                 <footer className="py-6 px-4 md:px-6 border-t">
                    <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
                 </footer>
            </div>
       );
    }


    // Render admin content if user is admin
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl"> {/* Adjusted max-width */}
                    <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-8" prefetch={false}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Main
                    </Link>
                    <Card className="shadow-lg mb-12">
                        <CardHeader>
                             <div className="flex items-center gap-2">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                                <CardTitle className="text-2xl md:text-3xl font-bold">Administrator Panel</CardTitle>
                             </div>
                            <CardDescription>Manage users, camps, and site settings.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Welcome, Admin ({user.email})!</p>
                            {/* Placeholder for other admin tools */}
                            <div className="mt-6 border p-4 rounded-md bg-muted/50">
                                <h3 className="font-semibold mb-2">Placeholder: User Management</h3>
                                <p className="text-sm text-muted-foreground">User management tools will be added here.</p>
                            </div>
                        </CardContent>
                    </Card>

                     {/* Section for Admin's Created Camps */}
                     <div>
                         <h2 className="text-2xl font-bold mb-6">My Created Camps</h2>
                         {campsLoading ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 <SkeletonCardSkeleton count={adminCamps.length > 0 ? adminCamps.length : 3} />
                             </div>
                         ) : adminCamps.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 {adminCamps.map((camp) => (
                                    <CampCard
                                        key={camp.id}
                                        camp={camp}
                                        isOwner={true} // Admin is the owner
                                        onDeleteClick={handleDeleteCamp}
                                        deletingCampId={deletingCampId}
                                    />
                                 ))}
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
                </div>
            </main>
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
            </footer>
        </div>
    );
}

