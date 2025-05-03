
// src/app/camps/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { ArrowLeft, CalendarDays, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

// Sample Camp Data Interface (ensure consistency)
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string;
  location: string;
  imageUrl: string;
  price: number;
  // Add more detailed fields if needed
  organizerName?: string;
  contactEmail?: string;
  activities?: string[];
}

// Placeholder function for fetching camp details - replace with actual data fetching
async function fetchCampDetails(id: string): Promise<Camp | null> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Sample data - find camp by ID from a mock list or API
  const sampleCamps: Camp[] = [
    {
      id: '1',
      name: 'Adventure Camp Alpha',
      description: 'Experience the thrill of the outdoors with hiking, climbing, kayaking, and campfire stories under the stars. Suitable for ages 12-16.',
      dates: 'July 10 - July 20, 2024',
      location: 'Rocky Mountains, CO',
      imageUrl: 'https://picsum.photos/seed/camp1/800/500',
      price: 1200,
      organizerName: 'Outdoor Adventures Inc.',
      contactEmail: 'info@outdooradventures.com',
      activities: ['Hiking', 'Rock Climbing', 'Kayaking', 'Campfire Skills'],
    },
    {
      id: '2',
      name: 'Creative Arts Camp Beta',
      description: 'Unleash your creativity with painting, pottery, music workshops, and a final showcase performance. Perfect for aspiring artists aged 10-15.',
      dates: 'August 5 - August 15, 2024',
      location: 'Forest Retreat, CA',
      imageUrl: 'https://picsum.photos/seed/camp2/800/500',
      price: 950,
      organizerName: 'Artistic Souls Collective',
      contactEmail: 'contact@artisticsouls.org',
      activities: ['Painting', 'Pottery', 'Music', 'Theater'],
    },
    {
        id: '3',
        name: 'Science Explorers Gamma',
        description: 'Dive into the world of science with hands-on experiments, robotics challenges, and nature exploration. For curious minds aged 11-14.',
        dates: 'July 22 - August 1, 2024',
        location: 'Coastal Institute, ME',
        imageUrl: 'https://picsum.photos/seed/camp3/800/500',
        price: 1100,
        organizerName: 'Young Scientists Foundation',
        contactEmail: 'programs@ysfoundation.net',
        activities: ['Robotics', 'Chemistry Experiments', 'Marine Biology', 'Astronomy'],
    },
    {
        id: '4',
        name: 'Wilderness Survival Delta',
        description: 'Learn essential survival skills like shelter building, fire starting, navigation, and foraging in a challenging and rewarding environment. Ages 14+.',
        dates: 'September 1 - September 10, 2024',
        location: 'Appalachian Trail, NC',
        imageUrl: 'https://picsum.photos/seed/camp4/800/500',
        price: 1350,
        organizerName: 'Survival Training Experts',
        contactEmail: 'admin@survivalexperts.co',
        activities: ['Shelter Building', 'Fire Starting', 'Navigation', 'Foraging'],
    }
  ];
  return sampleCamps.find(camp => camp.id === id) || null;
}

export default function CampDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campId = params.id as string;

  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if auth is done loading and user is not logged in
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (campId && user) { // Fetch only if ID is present and user is logged in
      setLoading(true);
      fetchCampDetails(campId)
        .then(data => {
          setCamp(data);
        })
        .catch(error => {
          console.error("Failed to fetch camp details:", error);
          // Handle error state, maybe show a toast
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!campId) {
        setLoading(false); // Stop loading if no ID
        console.error("Camp ID is missing");
        // Maybe redirect or show an error message
    }
  }, [campId, user]); // Depend on campId and user

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
          <Skeleton className="h-8 w-32 mb-8" /> {/* Back button placeholder */}
          <Skeleton className="w-full h-64 md:h-96 mb-8" /> {/* Image placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                 <Skeleton className="h-10 w-3/4" /> {/* Title placeholder */}
                 <Skeleton className="h-6 w-1/2" /> {/* Subtitle placeholder */}
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-10 w-full" /> {/* Button placeholder */}
              </div>
          </div>
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
         <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline mb-4" prefetch={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
             Back to Dashboard
         </Link>
        <p className="text-xl text-destructive">Camp not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
       <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
           Back to Dashboard
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
                       <CardDescription className="text-lg text-muted-foreground">Organized by {camp.organizerName || 'Campanion Partner'}</CardDescription>
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
                            Contact: {camp.contactEmail || 'Not specified'}
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
                                <p className="text-muted-foreground">{camp.dates}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                           <DollarSign className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                           <div>
                               <p className="font-medium">Price</p>
                               <p className="text-2xl font-bold text-primary">${camp.price}</p>
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
  );
}
