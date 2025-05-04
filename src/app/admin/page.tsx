
// src/app/admin/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Trash2, Pencil, ShieldCheck, Eye, Clock, CheckCircle } from 'lucide-react'; // Added Clock, CheckCircle
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
import { Badge } from '@/components/ui/badge'; // Import Badge

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
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                 <Skeleton className="h-8 w-40 mb-8" /> {/* Back link placeholder */}
                 <Card className="mb-12">
                     <CardHeader>
                         <Skeleton className="h-8 w-1/2 mb-2" />
                         <Skeleton className="h-4 w-3/4" />
                     </CardHeader>
                     <CardContent>
                        <Skeleton className="h-6 w-full max-w-md" />
                        <Skeleton className="h-16 w-full mt-6" />
                     </CardContent>
                 </Card>
                 {/* Camps List Skeleton */}
                 <div className="mb-10">
                    <Skeleton className="h-8 w-48 mb-6" /> {/* Section title */}
                    <AdminCampListSkeleton count={2} />
                 </div>
                 <div>
                    <Skeleton className="h-8 w-48 mb-6" /> {/* Section title */}
                    <AdminCampListSkeleton count={1} />
                 </div>
            </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t">
            <Skeleton className="h-4 w-1/4" />
        </footer>
    </div>
);

// Reusable Camp List Item Component for Admin Panel
const AdminCampListItem = ({ camp, isOwner, onDeleteClick, deletingCampId, status }: {
    camp: Camp;
    isOwner: boolean; // Always true in admin context if filtered correctly
    onDeleteClick: (campId: string) => void;
    deletingCampId: string | null;
    status: 'Active' | 'Past';
}) => {

    return (
      <div key={camp.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
         {/* Basic Camp Info */}
         <div className="flex-1 min-w-0 mr-4">
             <div className="flex items-center gap-2 mb-1">
                 <p className="font-semibold truncate">{camp.name}</p>
                 <Badge variant={status === 'Active' ? 'default' : 'secondary'} className="flex-shrink-0">
                    {status === 'Active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                    {status}
                 </Badge>
             </div>
             <p className="text-sm text-muted-foreground truncate">{camp.location} | {camp.dates}</p>
             <p className="text-sm text-primary font-medium">{camp.price} ₽</p>
         </div>

         {/* Action Buttons */}
         <div className="flex gap-2 items-center flex-shrink-0">
              <Button size="sm" asChild variant="ghost" aria-label={`View ${camp.name}`}>
                <Link href={`/camps/${camp.id}`} prefetch={false}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                </Link>
              </Button>
              {/* Show Edit and Delete only for owned camps */}
              {isOwner && (
                  <>
                      <Button size="sm" asChild variant="ghost" aria-label={`Edit ${camp.name}`}>
                           <Link href={`/camps/${camp.id}/edit`} prefetch={false}>
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
                                  <AlertDialogAction onClick={() => onDeleteClick(camp.id)} className="bg-destructive hover:bg-destructive/90">Delete Camp</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </>
              )}
          </div>
      </div>
    );
};


// Skeleton for the Camp List
const AdminCampListSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="border rounded-md">
        {[...Array(count)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 border-b last:border-b-0">
                <div className="flex-1 min-w-0 mr-4 space-y-1">
                     <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-16" /> {/* Badge placeholder */}
                     </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        ))}
    </div>
);


export default function AdminPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [allAdminCamps, setAllAdminCamps] = useState<Camp[]>([]);
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
            setAllAdminCamps([]);
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

        setAllAdminCamps(fetchedCamps);
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

    // Separate camps into active and past using useMemo
    const { activeCamps, pastCamps } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the beginning of today for comparison

        const active: Camp[] = [];
        const past: Camp[] = [];

        allAdminCamps.forEach(camp => {
            const endDate = camp.endDate?.toDate();
            if (endDate && endDate >= today) {
                active.push(camp);
            } else {
                past.push(camp); // Includes camps with missing or past end dates
            }
        });
        // Optional: Sort each list further if needed (e.g., by start date)
        // active.sort(...);
        // past.sort(...);

        return { activeCamps: active, pastCamps: past };
    }, [allAdminCamps]);

    // Function to handle camp deletion
    const handleDeleteCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return; // Extra check for admin
        const campToDelete = allAdminCamps.find(camp => camp.id === campId);
        if (!campToDelete || campToDelete.organizerId !== user.uid) {
           toast({ title: 'Permission Denied', description: 'Cannot delete this camp.', variant: 'destructive' });
           return;
        }

        setDeletingCampId(campId);
        try {
        await deleteDoc(doc(db, 'camps', campId));
        // Update the main list, memoized lists will update automatically
        setAllAdminCamps(prev => prev.filter(camp => camp.id !== campId));
        toast({ title: 'Camp Deleted', description: 'The camp has been successfully removed.' });
        } catch (error) {
        console.error("Error deleting camp:", error);
        toast({ title: 'Deletion Failed', description: 'Could not delete the camp.', variant: 'destructive' });
        } finally {
        setDeletingCampId(null);
        }
    };


    // Show skeleton while loading auth or if user is null but loading isn't finished
    if (authLoading || (!user && !authLoading) ) { // Check if user exists before rendering admin page
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
                    <div className="mb-10"> {/* Active Camps Section */}
                         <h2 className="text-2xl font-bold mb-6">My Active Camps</h2>
                         {campsLoading ? (
                            <AdminCampListSkeleton count={activeCamps.length > 0 ? activeCamps.length : 1} />
                         ) : activeCamps.length > 0 ? (
                            <div className="border rounded-md">
                                {activeCamps.map((camp) => (
                                    <AdminCampListItem
                                        key={camp.id}
                                        camp={camp}
                                        isOwner={true}
                                        onDeleteClick={handleDeleteCamp}
                                        deletingCampId={deletingCampId}
                                        status="Active"
                                    />
                                ))}
                            </div>
                         ) : (
                             <Card className="text-center py-12 border-dashed">
                                 <CardContent>
                                     <p className="text-muted-foreground">No active camps found.</p>
                                 </CardContent>
                             </Card>
                         )}
                    </div>

                    <Separator className="my-12" />

                     <div > {/* Past Camps Section */}
                         <h2 className="text-2xl font-bold mb-6">My Past Camps</h2>
                          {campsLoading ? (
                            <AdminCampListSkeleton count={pastCamps.length > 0 ? pastCamps.length : 1} />
                         ) : pastCamps.length > 0 ? (
                            <div className="border rounded-md">
                                {pastCamps.map((camp) => (
                                     <AdminCampListItem
                                        key={camp.id}
                                        camp={camp}
                                        isOwner={true}
                                        onDeleteClick={handleDeleteCamp}
                                        deletingCampId={deletingCampId}
                                        status="Past"
                                    />
                                ))}
                            </div>
                         ) : (
                             <Card className="text-center py-12 border-dashed">
                                 <CardContent>
                                     <p className="text-muted-foreground">No past camps found.</p>
                                 </CardContent>
                             </Card>
                         )}
                    </div>

                    {/* Message if no camps at all */}
                     {!campsLoading && allAdminCamps.length === 0 && (
                         <Card className="text-center py-12 mt-12">
                             <CardContent>
                                 <p className="text-muted-foreground mb-4">You haven't created any camps yet.</p>
                                 <Button asChild>
                                     <Link href="/camps/new">Create Your First Camp</Link>
                                 </Button>
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
