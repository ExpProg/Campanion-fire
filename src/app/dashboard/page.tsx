
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { Tent, LogOut, UserCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';


// Camp Data Interface
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string;
  location: string;
  imageUrl: string;
  price: number;
  // Add other fields that might exist in Firestore
  organizerId?: string;
  createdAt?: any; // Use appropriate type if needed, e.g., Timestamp
}

// Sample Camp Data (Remains for demonstration as requested)
const sampleCamps: Camp[] = [
  {
    id: 'sample-1', // Prefix IDs to avoid potential key conflicts
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
  const [camps, setCamps] = useState<Camp[]>([]); // State for sample camps
  const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]); // State for Firestore camps
  const [sampleLoading, setSampleLoading] = useState(true); // Loading state for sample data
  const [firestoreLoading, setFirestoreLoading] = useState(true); // Loading state for Firestore data


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
                // Optionally show an error toast
            } finally {
                setFirestoreLoading(false);
            }
        };

        fetchFirestoreCamps();

    } else {
        // Reset states if user logs out
        setSampleLoading(false);
        setFirestoreLoading(false);
        setCamps([]);
        setFirestoreCamps([]);
    }
   }, [user]); // Depend on user to refetch if user changes

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to landing page after logout
    } catch (error) {
      console.error('Logout Error:', error);
      // Optionally show a toast notification for logout failure
    }
  };

  // Helper component for rendering camp cards
  const CampCard = ({ camp }: { camp: Camp }) => (
     <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
       <div className="relative w-full h-48">
         <Image
           src={camp.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'} // Fallback image
           alt={camp.name}
           fill
           style={{ objectFit: 'cover' }}
           sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
           data-ai-hint="camp nature adventure"
           priority={camp.id.startsWith('sample-') && parseInt(camp.id.split('-')[1]) <= 2} // Prioritize only first few sample images
         />
       </div>
       <CardHeader>
         <CardTitle>{camp.name}</CardTitle>
         <CardDescription>{camp.location} | {camp.dates}</CardDescription>
       </CardHeader>
       <CardContent className="flex-grow">
         <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{camp.description}</p>
       </CardContent>
       <div className="p-6 pt-0 flex justify-between items-center">
         <span className="text-lg font-semibold text-primary">${camp.price}</span>
         <Button size="sm" asChild>
           <Link href={`/camps/${camp.id}`} prefetch={false}>
             View Details
           </Link>
         </Button>
       </div>
     </Card>
  );

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
                      <Skeleton className="h-8 w-1/3 mt-4" />
                  </CardContent>
              </Card>
           ))}
      </div>
  );


  if (authLoading || !user) {
    // Show loading state while auth is resolving
    return (
        <div className="flex flex-col min-h-screen">
           {/* Simplified Header Skeleton */}
           <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
               <Skeleton className="h-6 w-32" />
               <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                   <Skeleton className="h-8 w-24 hidden sm:block" />
                   <Skeleton className="h-8 w-8 rounded-full" />
                   <Skeleton className="h-8 w-8" />
               </div>
           </header>
           <main className="flex-1 p-4 md:p-8 lg:p-12">
               <Skeleton className="h-8 w-1/3 mb-8" />
               <SkeletonCard count={6} />
           </main>
           <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
           </footer>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
       <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
        <Link href="/dashboard" className="flex items-center justify-center" prefetch={false}>
          <Tent className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-semibold">Campanion</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
           {profile?.isOrganizer && (
             <Button variant="outline" size="sm" asChild>
               <Link href="/camps/new" prefetch={false}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Create Camp
               </Link>
             </Button>
           )}
           <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.email}</span>
           <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
             <LogOut className="h-5 w-5" />
           </Button>
         </nav>
       </header>

       <main className="flex-1 p-4 md:p-8 lg:p-12 space-y-12">
          {/* Section for Sample Camps */}
          <div>
              <h2 className="text-2xl font-bold mb-6">Featured Camps (Samples)</h2>
              {sampleLoading ? (
                  <SkeletonCard count={3} />
              ) : camps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {camps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No sample camps available.</p>
              )}
          </div>

          <Separator />

          {/* Section for Firestore Camps */}
          <div>
              <h2 className="text-2xl font-bold mb-6">Camps from Database</h2>
              {firestoreLoading ? (
                  <SkeletonCard count={3} />
              ) : firestoreCamps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {firestoreCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No camps found in the database. {profile?.isOrganizer ? (<Link href="/camps/new" className="text-primary hover:underline">Create one!</Link>) : 'Check back soon!'}</p>
              )}
          </div>

        </main>

        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
          <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
          {/* Add footer links if needed */}
        </footer>
    </div>
  );
}
