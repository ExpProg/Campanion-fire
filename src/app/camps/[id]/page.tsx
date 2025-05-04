
// src/app/camps/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, MapPin, DollarSign, Building } from 'lucide-react'; // Added Building
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, Timestamp } from 'firebase/firestore'; // Removed getDocFromServer
import { db } from '@/config/firebase';
import { format } from 'date-fns'; // Import format for date display if needed
import Header from '@/components/layout/Header'; // Import Header component

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
  organizerId: string; // Keep organizerId
  organizerName?: string; // Denormalized organizer name from Firestore
  organizerLink?: string; // Denormalized organizer link from Firestore
  contactEmail?: string; // Might be the same as organizerEmail or a separate field
  activities?: string[];
  // Add any other fields present in your Firestore document
}

// Removed Organizer Data Interface


// Function to fetch camp details from Firestore
async function fetchCampDetailsFromFirestore(id: string): Promise<Camp | null> {
  try {
    const campDocRef = doc(db, 'camps', id);
    const campDocSnap = await getDoc(campDocRef);

    if (campDocSnap.exists()) {
      const data = campDocSnap.data();

      // --- Date Handling ---
      let datesDisplay = data.dates || 'Dates not specified'; // Default to stored string

      // Optional: If 'dates' string is missing, try to reconstruct from Timestamps
      if (!datesDisplay && data.startDate && data.endDate && data.startDate.toDate && data.endDate.toDate) {
        try {
            const formattedStartDate = format(data.startDate.toDate(), "MMM d");
            const formattedEndDate = format(data.endDate.toDate(), "MMM d, yyyy");
            datesDisplay = `${formattedStartDate} - ${formattedEndDate}`;
        } catch (formatError) {
            console.error("Error formatting dates from Timestamps:", formatError);
            // Fallback if formatting fails
            datesDisplay = 'Date range available';
        }
      }
      // --- End Date Handling ---

      // --- Organizer Handling ---
      // Use denormalized data directly from the camp document
      const organizerName = data.organizerName || 'Campanion Partner';
      const organizerLink = data.organizerLink; // Assuming denormalized link


      // Construct the Camp object, mapping Firestore fields to the interface
      const camp: Camp = {
        id: campDocSnap.id,
        name: data.name || 'Unnamed Camp',
        description: data.description || '',
        dates: datesDisplay, // Use the determined display string
        startDate: data.startDate, // Keep timestamp if needed elsewhere
        endDate: data.endDate,     // Keep timestamp if needed elsewhere
        location: data.location || 'Location not specified',
        imageUrl: data.imageUrl || 'https://picsum.photos/seed/placeholder/800/500', // Fallback image
        price: data.price || 0,
        organizerId: data.organizerId || '', // Get organizerId
        organizerName: organizerName, // Use the determined organizer name
        organizerLink: organizerLink, // Use the fetched or denormalized link
        contactEmail: data.contactEmail || data.organizerEmail || 'Not specified', // Use specific contact email or fallback to organizer's email
        activities: data.activities || [], // Assuming activities is an array of strings
      };
      return camp;
    } else {
      console.log("No such camp document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching camp details from Firestore:", error);
    throw error; // Re-throw the error to be caught in the component
  }
}


export default function CampDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campId = params.id as string;

  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if auth is done loading and user is not logged in
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (campId && user) { // Fetch only if ID is present and user is logged in
      setLoading(true);
      setError(null); // Reset error state
      fetchCampDetailsFromFirestore(campId)
        .then(data => {
          if (data) {
            setCamp(data);
          } else {
             setError("Camp not found."); // Set error if data is null
          }
        })
        .catch(error => {
          console.error("Failed to fetch camp details:", error);
          setError("Failed to load camp details. Please try again."); // Set error on fetch failure
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!campId) {
        setLoading(false); // Stop loading if no ID
        setError("Camp ID is missing.");
        console.error("Camp ID is missing");
    }
  }, [campId, user]); // Depend on campId and user

  if (authLoading || loading || (!user && !authLoading)) { // Added condition for redirecting user
     return (
         <div className="flex flex-col min-h-screen">
             {/* Header Skeleton */}
             <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
                 <Skeleton className="h-6 w-6 mr-2" /> {/* Icon Skeleton */}
                 <Skeleton className="h-6 w-32" />     {/* Title Skeleton */}
                 <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                     <Skeleton className="h-8 w-20" /> {/* Button Skeleton */}
                 </div>
             </header>
             {/* Camp Details Content Skeleton */}
             <main className="flex-1 p-4 md:p-8 lg:p-12">
                 <div className="container mx-auto px-4 py-8 md:py-12">
                     <Skeleton className="h-8 w-32 mb-8" /> {/* Back button placeholder */}
                     <Skeleton className="w-full h-64 md:h-96 mb-8" /> {/* Image placeholder */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="md:col-span-2 space-y-4">
                             <Skeleton className="h-10 w-3/4" /> {/* Title placeholder */}
                             <Skeleton className="h-6 w-1/2" /> {/* Organizer placeholder */}
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-5/6" /> {/* Description placeholder */}
                         </div>
                         <div className="space-y-4">
                            {/* Info block skeleton */}
                             <Skeleton className="h-8 w-full" />
                             <Skeleton className="h-8 w-full" />
                             <Skeleton className="h-8 w-full" />
                             <Skeleton className="h-10 w-full mt-4" /> {/* Button placeholder */}
                         </div>
                     </div>
                 </div>
             </main>
             {/* Footer Skeleton */}
             <footer className="py-6 px-4 md:px-6 border-t">
                 <Skeleton className="h-4 w-1/4" />
             </footer>
         </div>
     );
  }

  if (error || !camp) {
    return (
       <div className="flex flex-col min-h-screen">
          <Header /> {/* Keep header for consistent navigation */}
          <main className="flex-1 flex items-center justify-center p-4">
             <div className="container mx-auto px-4 py-12 text-center">
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

  // Camp data is available
  const displayContactEmail = camp.contactEmail || 'Not specified';

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header /> {/* Use the reusable Header component */}

       <main className="flex-1 p-4 md:p-8 lg:p-12">
          <div className="container mx-auto px-4 py-8 md:py-12">
              <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Main
              </Link>

              <Card className="overflow-hidden shadow-lg">
                  <div className="relative w-full h-64 md:h-96">
                      <Image
                          src={camp.imageUrl}
                          alt={camp.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 100vw" // Full width on details page
                          priority // Prioritize loading the main image
                          data-ai-hint="camp nature activity"
                      />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                      <div className="md:col-span-2 p-6 md:p-8">
                          <CardHeader className="px-0 pt-0 pb-4">
                              <CardTitle className="text-3xl md:text-4xl font-bold mb-2">{camp.name}</CardTitle>
                              {/* Display organizer name, optionally link if link exists */}
                              <CardDescription className="text-lg text-muted-foreground flex items-center">
                                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                                Organized by {camp.organizerLink ? (
                                    <a href={camp.organizerLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">
                                        {camp.organizerName}
                                    </a>
                                ) : (
                                    <span className="ml-1">{camp.organizerName}</span>
                                )}
                              </CardDescription>
                          </CardHeader>
                          <CardContent className="px-0">
                              <p className="mb-6">{camp.description}</p>

                              {camp.activities && camp.activities.length > 0 && (
                                  <div className="mb-6">
                                      <h3 className="text-lg font-semibold mb-2">Activities</h3>
                                      <div className="flex flex-wrap gap-2">
                                          {camp.activities.map(activity => (
                                              <span key={activity} className="inline-block bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">{activity}</span>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              <div className="text-sm text-muted-foreground">
                                  Contact: {displayContactEmail}
                              </div>
                          </CardContent>
                      </div>
                      <div className="bg-muted/50 p-6 md:p-8 border-t md:border-t-0 md:border-l">
                          <h3 className="text-xl font-semibold mb-4">Camp Information</h3>
                          <div className="space-y-4">
                              <div className="flex items-start">
                                  <MapPin className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                                  <div>
                                      <p className="font-medium">Location</p>
                                      <p className="text-muted-foreground">{camp.location}</p>
                                  </div>
                              </div>
                              <div className="flex items-start">
                                  <CalendarDays className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                                  <div>
                                      <p className="font-medium">Dates</p>
                                      {/* Display the pre-formatted 'dates' string */}
                                      <p className="text-muted-foreground">{camp.dates}</p>
                                  </div>
                              </div>
                              <div className="flex items-start">
                                  <DollarSign className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                                  <div>
                                      <p className="font-medium">Price</p>
                                      <p className="text-2xl font-bold text-primary">{camp.price} ₽</p> {/* Changed $ to ₽ */}
                                  </div>
                              </div>
                          </div>
                          <CardFooter className="px-0 pb-0 pt-8">
                              <Button className="w-full" size="lg">Book Now</Button> {/* Add booking functionality later */}
                          </CardFooter>
                      </div>
                  </div>
              </Card>
          </div>
       </main>

       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
           <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
       </footer>
    </div>
  );
}
