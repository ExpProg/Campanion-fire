
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { Tent, LogOut, UserCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';


// Sample Camp Data Interface
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string;
  location: string;
  imageUrl: string;
  price: number;
}

// Sample Camp Data (Replace with actual data fetching later)
const sampleCamps: Camp[] = [
  {
    id: '1',
    name: 'Adventure Camp Alpha',
    description: 'Experience the thrill of the outdoors with hiking, climbing, and more.',
    dates: 'July 10 - July 20, 2024',
    location: 'Rocky Mountains, CO',
    imageUrl: 'https://picsum.photos/seed/camp1/600/400',
    price: 1200,
  },
  {
    id: '2',
    name: 'Creative Arts Camp Beta',
    description: 'Unleash your creativity with painting, pottery, and music workshops.',
    dates: 'August 5 - August 15, 2024',
    location: 'Forest Retreat, CA',
    imageUrl: 'https://picsum.photos/seed/camp2/600/400',
    price: 950,
  },
    {
    id: '3',
    name: 'Science Explorers Gamma',
    description: 'Dive into the world of science with hands-on experiments and discovery.',
    dates: 'July 22 - August 1, 2024',
    location: 'Coastal Institute, ME',
    imageUrl: 'https://picsum.photos/seed/camp3/600/400',
    price: 1100,
  },
   {
    id: '4',
    name: 'Wilderness Survival Delta',
    description: 'Learn essential survival skills in a challenging and rewarding environment.',
    dates: 'September 1 - September 10, 2024',
    location: 'Appalachian Trail, NC',
    imageUrl: 'https://picsum.photos/seed/camp4/600/400',
    price: 1350,
  },
];


export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [dataLoading, setDataLoading] = useState(true); // Separate loading state for camp data


  useEffect(() => {
    // Redirect to login if not authenticated and loading is finished
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

   useEffect(() => {
    // Simulate fetching camp data
    if (user) { // Only fetch if user is logged in
        setDataLoading(true);
        // Replace with actual API call or Firestore query
        setTimeout(() => {
          setCamps(sampleCamps);
          setDataLoading(false);
        }, 1500); // Simulate network delay
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

  if (loading || !user) {
    // Show loading state or redirect happens in useEffect
    return <div className="flex justify-center items-center min-h-screen">Loading dashboard...</div>;
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
           {/* Add dropdown for profile/settings later */}
           {/* <UserCircle className="h-6 w-6 text-foreground cursor-pointer" /> */}
           <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
             <LogOut className="h-5 w-5" />
           </Button>
         </nav>
       </header>
       <main className="flex-1 p-4 md:p-8 lg:p-12">
          <h1 className="text-3xl font-bold mb-8">Available Camps</h1>
          {dataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[...Array(3)].map((_, index) => (
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
          ) : camps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps.map((camp) => (
                <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
                   <div className="relative w-full h-48">
                    <Image
                        src={camp.imageUrl}
                        alt={camp.name}
                        fill // Use fill layout
                        style={{ objectFit: 'cover' }} // Ensure image covers the area
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Define responsive image sizes
                        data-ai-hint="camp nature adventure" // Hint for AI image generation
                        priority={camp.id <= '2'} // Prioritize loading for the first few images
                     />
                   </div>
                  <CardHeader>
                    <CardTitle>{camp.name}</CardTitle>
                    <CardDescription>{camp.location} | {camp.dates}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground mb-4">{camp.description}</p>

                  </CardContent>
                   <div className="p-6 pt-0 flex justify-between items-center">
                      <span className="text-lg font-semibold text-primary">${camp.price}</span>
                       <Button size="sm" asChild>
                           {/* Link to a potential camp details page */}
                           <Link href={`/camps/${camp.id}`} prefetch={false}>
                               View Details
                           </Link>
                       </Button>
                    </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No camps available at the moment. Check back soon!</p>
          )}
        </main>
        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
          <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
          {/* Add footer links if needed */}
        </footer>
    </div>
  );
}
