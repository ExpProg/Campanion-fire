// src/app/camps/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, MapPin, DollarSign, Users, Link as LinkIcon } from 'lucide-react'; // Changed Building to Users
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format } from 'date-fns';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge'; // Import Badge

// Camp Data Interface (ensure consistency with Firestore structure)
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string; // Pre-formatted string
  startDate?: Timestamp; // Optional: Store start date as Timestamp
  endDate?: Timestamp;   // Optional: Store end date as Timestamp
  location: string;
  imageUrl: string;
  price: number;
  status: 'draft' | 'active' | 'archive'; // Keep archive status for potential logic later
  organizerId: string; // Keep organizerId
  organizerName?: string; // Denormalized organizer name from Firestore
  organizerLink?: string; // Denormalized organizer link from Firestore
  activities?: string[];
  creatorId?: string; // Added creatorId
  originalLink?: string; // Added optional originalLink
}

// Function to fetch camp details from Firestore
async function fetchCampDetailsFromFirestore(id: string): Promise<Camp | null> {
  try {
    const campDocRef = doc(db, 'camps', id);
    const campDocSnap = await getDoc(campDocRef);

    if (campDocSnap.exists()) {
      const data = campDocSnap.data();
      let datesDisplay = data.dates || 'Dates not specified';
      if (!datesDisplay && data.startDate && data.endDate && data.startDate.toDate && data.endDate.toDate) {
        try {
            const formattedStartDate = format(data.startDate.toDate(), "MMM d");
            const formattedEndDate = format(data.endDate.toDate(), "MMM d, yyyy");
            datesDisplay = `${formattedStartDate} - ${formattedEndDate}`;
        } catch (formatError) {
            console.error("Error formatting dates from Timestamps:", formatError);
            datesDisplay = 'Date range available';
        }
      }
      const organizerName = data.organizerName || 'Campanion Partner';
      const organizerLink = data.organizerLink;

      const camp: Camp = {
        id: campDocSnap.id,
        name: data.name || 'Unnamed Camp',
        description: data.description || '',
        dates: datesDisplay,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location || 'Location not specified',
        imageUrl: data.imageUrl || 'https://picsum.photos/seed/placeholder/800/500',
        price: data.price || 0,
        status: data.status || 'draft',
        organizerId: data.organizerId || '',
        organizerName: organizerName,
        organizerLink: organizerLink,
        activities: data.activities || [],
        creatorId: data.creatorId,
        originalLink: data.originalLink,
      };
      return camp;
    } else {
      console.log("No such camp document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching camp details from Firestore:", error);
    throw error;
  }
}


export default function CampDetailsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campId = params.id as string;

  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campId) {
      setLoading(true);
      setError(null);
      fetchCampDetailsFromFirestore(campId)
        .then(data => {
          if (data) {
            if ((data.status === 'draft' || data.status === 'archive') && !isAdmin) {
               setError("Camp not found.");
               setCamp(null);
            } else {
              setCamp(data);
            }
          } else {
             setError("Camp not found.");
             setCamp(null);
          }
        })
        .catch(error => {
          console.error("Failed to fetch camp details:", error);
          setError("Failed to load camp details. Please try again.");
          setCamp(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
        setLoading(false);
        setError("Camp ID is missing.");
        console.error("Camp ID is missing");
        setCamp(null);
    }
  }, [campId, isAdmin]);

  if (authLoading || loading) {
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
                 <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                     <Skeleton className="h-8 w-32 mb-8" /> {/* Back button */}
                     <Skeleton className="w-full h-64 md:h-96 mb-8 rounded-lg" /> {/* Image */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="md:col-span-2 space-y-6">
                             <Skeleton className="h-10 w-3/4 mb-2" /> {/* Title Skeleton */}
                             <Skeleton className="h-6 w-1/2 mb-3" /> {/* Organizer & Location */}
                             <Skeleton className="h-6 w-1/3 mb-3" /> {/* Description Title */}
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-5/6 mb-3" />
                             <Skeleton className="h-6 w-1/3 mb-3" /> {/* Activities Title */}
                             <div className="flex flex-wrap gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                             </div>
                         </div>
                         <div className="md:col-span-1">
                            <Card className="shadow-lg">
                                <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader> {/* Info Card Title */}
                                <CardContent className="space-y-4">
                                     {/* Location removed from here */}
                                     <Skeleton className="h-8 w-full" /> {/* Dates */}
                                     <Skeleton className="h-8 w-full" /> {/* Price */}
                                     <Skeleton className="h-8 w-full" /> {/* Original Link */}
                                </CardContent>
                                <CardFooter><Skeleton className="h-10 w-full" /></CardFooter> {/* Button placeholder */}
                            </Card>
                         </div>
                     </div>
                 </div>
             </main>
             <footer className="py-6 px-4 md:px-6 border-t">
                 <Skeleton className="h-4 w-1/4" />
             </footer>
         </div>
     );
  }

  if (error || !camp) {
    return (
       <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 flex items-center justify-center p-4">
             <div className="container mx-auto px-4 py-12 text-center max-w-6xl">
                 <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-4" prefetch={false}>
                     <ArrowLeft className="mr-2 h-4 w-4" />
                     Back to Main
                 </Link>
                 <p className="text-xl text-destructive">{error || "Camp not found."}</p>
             </div>
          </main>
          <footer className="py-6 px-4 md:px-6 border-t">
              <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
          </footer>
       </div>
    );
  }

  const organizerDisplay = camp.organizerName || 'Campanion Partner';
  const formattedPrice = camp.price.toLocaleString('ru-RU');

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header />
       <main className="flex-1 p-4 md:p-8 lg:p-12">
          <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
              <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Main
              </Link>

              <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden shadow-lg">
                  <Image
                      src={camp.imageUrl}
                      alt={camp.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 100vw"
                      priority
                      data-ai-hint="camp nature activity"
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{camp.name}</h1>
                      
                      <div className="text-lg text-muted-foreground flex items-center flex-wrap gap-x-4 gap-y-1">
                          <div className="flex items-center">
                              <MapPin className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" />
                              {camp.location}
                          </div>
                          <div className="flex items-center">
                              <Users className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" /> 
                              {camp.organizerLink ? (
                                  <a href={camp.organizerLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                      {organizerDisplay}
                                  </a>
                              ) : (
                                  <span>{organizerDisplay}</span>
                              )}
                          </div>
                      </div>

                      <div>
                          <h2 className="text-2xl font-semibold mb-3 text-foreground">Description</h2>
                          <p className="text-muted-foreground leading-relaxed">{camp.description}</p>
                      </div>

                      {camp.activities && camp.activities.length > 0 && (
                          <div>
                              <h2 className="text-2xl font-semibold mb-3 text-foreground">Activities</h2>
                              <div className="flex flex-wrap gap-2">
                                  {camp.activities.map(activity => (
                                      <Badge key={activity} variant="secondary">{activity}</Badge>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="md:col-span-1">
                      <Card className="shadow-lg sticky top-24"> {/* Adjust top-X based on your header height */}
                          <CardHeader>
                              <CardTitle className="text-xl text-foreground">Camp Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div className="flex items-start">
                                  <CalendarDays className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                                  <div>
                                      <p className="font-medium text-foreground">Dates</p>
                                      <p className="text-muted-foreground">{camp.dates}</p>
                                  </div>
                              </div>
                              <div className="flex items-start">
                                  <DollarSign className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                                  <div>
                                      <p className="font-medium text-foreground">Price</p>
                                      <p className="text-2xl font-bold text-primary">{formattedPrice} ₽</p>
                                  </div>
                              </div>
                              {camp.originalLink && (
                                 <div className="flex items-start">
                                     <LinkIcon className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                                     <div>
                                         <p className="font-medium text-foreground">Original Source</p>
                                         <a href={camp.originalLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                                             {camp.originalLink}
                                         </a>
                                     </div>
                                 </div>
                             )}
                          </CardContent>
                          <CardFooter>
                              <Button className="w-full" size="lg">Book Now</Button>
                          </CardFooter>
                      </Card>
                  </div>
              </div>
          </div>
       </main>

       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
           <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
       </footer>
    </div>
  );
}

