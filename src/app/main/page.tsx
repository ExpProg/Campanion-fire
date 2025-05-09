
// src/app/main/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore'; // Added query, where
import { db } from '@/config/firebase';
import { Building, PlusCircle, ArrowRight, Search } from 'lucide-react'; // Added ArrowRight, Search
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { Input } from '@/components/ui/input'; // Import Input for search

// Camp Data Interface - reflects Firestore structure, including status
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
  status: 'draft' | 'active' | 'archive'; // Added 'archive' status
  organizerId?: string; // Link to the organizers collection
  organizerName?: string; // Denormalized organizer name
  organizerLink?: string; // Denormalized organizer link
  creatorId?: string; // ID of the user who created the camp
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
  const [searchTerm, setSearchTerm] = useState(''); // State for search term

  useEffect(() => {
    // Fetch Firestore data regardless of user login status
    setFirestoreLoading(true);
    fetchFirestoreCamps(); // Call fetch function
  }, []); // Empty dependency array means this runs once on mount

  // Function to fetch Firestore camps
  const fetchFirestoreCamps = async () => {
    try {
      const campsCollectionRef = collection(db, 'camps');
      // const today = Timestamp.now(); // No longer needed for filtering

      // Query for active camps only
      const q = query(
        campsCollectionRef,
        where('status', '==', 'active') // Only fetch 'active' camps
        // Removed: where('endDate', '>=', today)
      );

      const querySnapshot = await getDocs(q);

      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'> // Assert data type, excluding id
      }))
      .sort((a, b) => {
          // Sort camps by creation date, newest first, if createdAt exists
          const dateA = a.createdAt?.toDate() ?? new Date(0);
          const dateB = b.createdAt?.toDate() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
      });
      setFirestoreCamps(fetchedCamps);
    } catch (error) {
      console.error("Error fetching camps from Firestore:", error);
      toast({
        title: 'Error fetching camps',
        description: 'Could not load camps. Check Firestore rules or connection.',
        variant: 'destructive',
      });
    } finally {
      // Ensure loading state is set to false after attempt
      setFirestoreLoading(false);
    }
  };

  // Filter camps based on search term
  const filteredCamps = useMemo(() => {
    if (!searchTerm) {
      return firestoreCamps;
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return firestoreCamps.filter(camp =>
      camp.name.toLowerCase().includes(lowercasedSearchTerm) ||
      camp.description.toLowerCase().includes(lowercasedSearchTerm) ||
      camp.location.toLowerCase().includes(lowercasedSearchTerm) ||
      (camp.activities && camp.activities.some(activity => activity.toLowerCase().includes(lowercasedSearchTerm))) ||
      (camp.organizerName && camp.organizerName.toLowerCase().includes(lowercasedSearchTerm))
    );
  }, [firestoreCamps, searchTerm]);


  // Helper component for rendering camp cards
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
          <p className="text-sm text-muted-foreground mb-2 line-clamp-3"> {/* Adjusted margin */}
            {camp.description}
            {' '} {/* Space before link */}
            <Link href={`/camps/${camp.id}`} prefetch={false} className="text-primary hover:underline inline-flex items-center font-medium whitespace-nowrap">
              Read more <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </p>
          {/* Display Activities */}
          {camp.activities && camp.activities.length > 0 && (
            <div className="mt-2 mb-2"> {/* Adjusted margin */}
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
              <Link href={`/camps/${camp.id}`} prefetch={false}>
                View
              </Link>
            </Button>
            {/* REMOVED Edit and Delete buttons */}
          </div>
        </div>
      </Card>
    );
  };

  // Helper component for rendering skeleton cards
  const SkeletonCard = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Changed lg:grid-cols-2 to lg:grid-cols-3 */}
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

    // Skeleton for Banners
    const BannerSkeleton = () => (
        <div className="mb-12">
             <Skeleton className="w-full h-64 md:h-80 rounded-lg" />
        </div>
    );


  // Show header skeleton only if auth is loading
  const HeaderSkeleton = () => (
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
          <Skeleton className="h-6 w-6 mr-2" /> {/* Icon Skeleton */}
          <Skeleton className="h-6 w-32" />     {/* Title Skeleton */}
          <div className="ml-auto flex gap-4 sm:gap-6 items-center">
              <Skeleton className="h-8 w-20" /> {/* Button Skeleton */}
          </div>
      </header>
  );

  const FooterSkeleton = () => (
       <footer className="py-6 px-4 md:px-6 border-t">
           <Skeleton className="h-4 w-1/4" />
       </footer>
  );


  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Conditionally render header or skeleton */}
      {authLoading ? <HeaderSkeleton /> : <Header />}

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
         {/* Banners Section - Show skeleton if firestore is loading */}
         <div className="mb-12"> {/* Margin bottom to separate from camps */}
            {firestoreLoading ? <BannerSkeleton /> : (
                 <Banner
                     title="Find Your Perfect Camp Experience" // Changed title
                     description="Explore a wide variety of camps, from outdoor adventures to creative workshops, and book your next adventure." // Changed description
                     imageUrl="https://picsum.photos/seed/banner-discover/1200/400" // Changed seed for potentially different image
                     imageAlt="Children enjoying activities at a summer camp" // More descriptive alt text
                     imageHint="camp discover explore fun" // Updated hints
                 />
            )}
         </div>


        {/* Section for All Available Firestore Camps */}
        <div id="available-camps"> {/* Added ID for potential linking */}
          {/* Changed title to reflect showing all camps */}
          <h2 className="text-2xl font-bold mb-4 text-foreground">Available Camps</h2> {/* Reduced mb from mb-6 to mb-4 */}
          
          {/* Search Input */}
          {firestoreLoading ? (
            <Skeleton className="h-10 w-full mb-6" /> // Skeleton for search input
          ) : (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search camps by name, description, location, activities, organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10" // Add padding for the icon
              />
            </div>
          )}

          {/* Show skeleton if firestore is loading */}
          {firestoreLoading ? (
             <SkeletonCard count={6} />
          ) : filteredCamps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Changed lg:grid-cols-2 to lg:grid-cols-3 */}
             {filteredCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
           </div>
          ) : (
             <Card className="text-center py-12">
                <CardContent>
                    {/* Updated message when no camps are found */}
                    <p className="text-muted-foreground mb-4">
                        {searchTerm ? "No camps found matching your search." : "No active camps found."}
                    </p>
                    {/* Show create camp button only if user is admin and logged in */}
                    {isAdmin && user && (
                        <Button asChild>
                            <Link href="/camps/new"><PlusCircle className="mr-2 h-4 w-4"/>Create New Camp</Link>
                        </Button>
                    )}
                </CardContent>
             </Card>
          )}
        </div>
        </div>
      </main>

        {/* Conditionally render footer or skeleton */}
       {authLoading ? <FooterSkeleton /> : (
           <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
           </footer>
        )}
    </div>
  );
}

