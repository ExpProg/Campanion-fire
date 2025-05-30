
// src/app/profile/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Save, Trash2, Pencil, ArrowLeft, CalendarCheck, ShieldCheck, PlusCircle, ArrowRight, Building } from 'lucide-react'; // Added ArrowRight, Building
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, getDocs, deleteDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator'; // Import Separator
import Link from 'next/link';
import Image from 'next/image';
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
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { cn } from '@/lib/utils'; // Import cn for styling
import { Badge } from '@/components/ui/badge'; // Import Badge


// Basic regex for phone validation: allows optional +, digits, spaces, hyphens. Adjust as needed.
// Allows optional leading +, requires at least 7 digits, allows spaces and hyphens.
// Updated regex to match the format +7 xxx xxx-xx-xx more closely.
// It expects +7 followed by 10 digits, possibly separated by spaces or hyphens.
const phoneRegex = /^\+7[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;


// Zod schema for profile form validation
const profileSchema = z.object({
  firstName: z.string().optional(),
  phoneNumber: z.string()
    .optional()
    .or(z.literal('')) // Allow empty string
    .refine((val) => {
        if (!val) return true; // Allow empty string
        // Remove mask characters before validation
        const digitsOnly = val.replace(/[^\d+]/g, '');
        // Basic check for Russian format +7 followed by 10 digits
        return /^\+7\d{10}$/.test(digitsOnly);
    }, {
      message: 'Invalid phone number format. Expected +7 xxx xxx-xx-xx.',
    }),
  organizerName: z.string().optional(),
  websiteUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Interface for user profile data stored in Firestore
interface UserProfile {
    email: string;
    createdAt: Timestamp;
    firstName?: string;
    phoneNumber?: string;
    organizerName?: string;
    websiteUrl?: string;
    isAdmin?: boolean; // Added isAdmin field
}

// Interface for Camp data (matching structure used elsewhere) including creatorId and creationMode
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
  organizerId?: string; // Link to the organizers collection
  organizerName?: string; // Added organizerName
  organizerLink?: string; // Added organizerLink
  creatorId: string; // ID of the user who created the camp
  creationMode: 'admin' | 'user'; // Added creationMode
  organizerEmail?: string; // May no longer be relevant
  createdAt?: Timestamp;
  activities?: string[];
}


// Reusable Camp Card Component (moved from my-events for profile page usage)
const CampCard = ({ camp, isOwner, onDeleteClick, deletingCampId }: {
    camp: Camp;
    isOwner: boolean; // Still needed to differentiate booked vs created for styling/context if necessary
    onDeleteClick: (campId: string) => void; // This will be effectively unused here now
    deletingCampId: string | null; // This will be effectively unused here now
}) => {
    const formattedPrice = camp.price.toLocaleString('ru-RU'); // Format price with spaces
    const organizerDisplay = camp.organizerName || 'Campanion Partner'; // Fallback

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
                        {camp.activities.slice(0, 3).map(activity => (
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
          <div className="flex gap-2 items-center">
              <Button size="sm" asChild variant="outline">
              <Link href={`/camps/${camp.id}`} prefetch={false}>
                  View
              </Link>
              </Button>
              {/* REMOVED Edit and Delete buttons - manage from admin panel */}
          </div>
          </div>
      </Card>
    );
};

// Skeleton Card Component (moved from my-events)
const SkeletonCard = ({ count = 1 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="overflow-hidden bg-card">
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



export default function ProfilePage() {
  const { user, loading: authLoading, isAdmin } = useAuth(); // Get isAdmin from AuthContext
  const router = useRouter();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [campsLoading, setCampsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [myCreatedCamps, setMyCreatedCamps] = useState<Camp[]>([]);
  const [bookedCamps, setBookedCamps] = useState<Camp[]>([]); // Placeholder for booked camps


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        firstName: '',
        phoneNumber: '',
        organizerName: '',
        websiteUrl: '',
    },
    mode: 'onBlur', // Trigger validation on blur
  });

  // Fetch profile and camp data on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setProfileLoading(true);
      setCampsLoading(true); // Start loading camps as well

      // Fetch Profile Data
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
          if (docSnap.exists()) {
              const profileData = docSnap.data() as UserProfile;
              form.reset({
                  firstName: profileData.firstName || '',
                  phoneNumber: profileData.phoneNumber || '',
                  organizerName: profileData.organizerName || '',
                  websiteUrl: profileData.websiteUrl || '',
              });
          } else {
              console.log("No profile document found for user.");
               // Create initial profile if it doesn't exist
               const initialProfileData: UserProfile = {
                   email: user.email!,
                   createdAt: Timestamp.now(),
                   firstName: '',
                   phoneNumber: '',
                   organizerName: '',
                   websiteUrl: '',
                   isAdmin: false, // Default isAdmin to false for new users
               };
               setDoc(userDocRef, initialProfileData)
                 .catch(err => console.error("Failed to create initial profile:", err));
          }
      }).catch(error => {
          console.error("Error fetching profile data:", error);
          toast({ title: 'Error', description: 'Could not load profile data.', variant: 'destructive' });
      }).finally(() => {
          setProfileLoading(false);
      });

      // Fetch Created Camps Data (only if admin)
      if (isAdmin) {
        fetchMyCreatedCamps(user.uid);
      } else {
        setMyCreatedCamps([]); // Non-admins have no created camps shown here
      }

      // Fetch Booked Camps Data (Placeholder) - Assuming all users can book
      fetchMyBookedCamps(user.uid); // This will handle setting campsLoading to false

    }
  }, [user, authLoading, isAdmin, router, toast, form]); // Added isAdmin dependency


  // Function to fetch user's created Firestore camps (only called for admins now)
  const fetchMyCreatedCamps = async (userId: string) => {
    // campsLoading should be true already or set by caller
    try {
      const campsCollectionRef = collection(db, 'camps');
      const querySnapshot = await getDocs(campsCollectionRef);
      const fetchedCamps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'>
      }))
      // Correctly filter by creatorId
      .filter(camp => camp.creatorId === userId)
      .sort((a, b) => (b.createdAt?.toDate() ?? new Date(0)).getTime() - (a.createdAt?.toDate() ?? new Date(0)).getTime()); // Sort newest first

      setMyCreatedCamps(fetchedCamps);
    } catch (error) {
      console.error("Error fetching user's created camps:", error);
      toast({
        title: 'Error',
        description: 'Could not load your created camps.',
        variant: 'destructive',
      });
    } finally {
      // Loading state is managed by fetchMyBookedCamps
    }
  };

   // Function to fetch user's booked Firestore camps (Placeholder Logic)
   const fetchMyBookedCamps = async (userId: string) => {
    // Set loading true here if not admin (admin case already has loading true)
    if (!isAdmin) {
        setCampsLoading(true);
    }

    try {
        // Simulate fetching booked camp IDs (replace with actual Firestore query)
        const bookedCampIds: string[] = []; // Replace with actual data fetching logic

        if (bookedCampIds.length === 0) {
            setBookedCamps([]);
            // Loading is done if no booked camps found
             setCampsLoading(false);
            return;
        }

        // Fetch details for each booked camp
        const campPromises = bookedCampIds.map(campId => getDoc(doc(db, 'camps', campId)));
        const campSnapshots = await Promise.all(campPromises);

        const fetchedBookedCamps = campSnapshots
            .filter(snap => snap.exists()) // Ensure the camp document exists
            .map(snap => ({
                id: snap.id,
                ...snap.data() as Omit<Camp, 'id'>
            }))
             .sort((a, b) => (b.createdAt?.toDate() ?? new Date(0)).getTime() - (a.createdAt?.toDate() ?? new Date(0)).getTime()); // Sort newest first

        setBookedCamps(fetchedBookedCamps);

    } catch (error) {
        console.error("Error fetching user's booked camps:", error);
        toast({
            title: 'Error',
            description: 'Could not load your booked camps.',
            variant: 'destructive',
        });
         setBookedCamps([]); // Ensure it's empty on error
    } finally {
        // Set loading false after booked camps fetch is done
        setCampsLoading(false);
    }
};

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
      toast({ title: 'Logged Out Successfully' });
    } catch (error) {
      console.error('Logout Error:', error);
      toast({
        title: 'Logout Failed',
        description: 'An error occurred during logout.',
        variant: 'destructive',
      });
    }
  };

  // Handle profile form submission
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const cleanedPhoneNumber = values.phoneNumber
            ? '+' + (values.phoneNumber.replace(/[^\d]/g, '') || '').slice(1) // Ensure '+' and clean non-digits
            : '';


        if (cleanedPhoneNumber && !/^\+7\d{10}$/.test(cleanedPhoneNumber)) {
             toast({ title: 'Invalid Phone Number', description: 'Please enter a valid Russian phone number (+7 followed by 10 digits).', variant: 'destructive' });
             setIsSaving(false);
             return;
        }


        const dataToSave: Partial<UserProfile> = { // Use Partial<UserProfile> for update
            firstName: values.firstName || '',
            phoneNumber: cleanedPhoneNumber,
            organizerName: values.organizerName || '',
            websiteUrl: values.websiteUrl || '',
            // isAdmin is not editable via this form, it's fetched and displayed
        };

        // Use setDoc with merge: true to update or create the document
        await setDoc(userDocRef, dataToSave, { merge: true });

        toast({ title: 'Profile Updated', description: 'Your profile information has been saved.' });
    } catch (error) {
        console.error('Error updating profile:', error);
        toast({ title: 'Update Failed', description: 'Could not save profile changes.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
        form.reset(form.getValues()); // Reset dirty state after saving
    }
  };


  // Helper to generate initials
  const getInitials = (email: string | null | undefined) => {
    if (!email) return '??';
    return email.charAt(0).toUpperCase();
  };


  if (authLoading || profileLoading || (!user && !authLoading)) { // Combine loading states
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
                {/* Profile Section Skeleton */}
                <div className="w-full mb-12">
                    <Card className="shadow-lg">
                        <CardHeader className="items-center text-center">
                            <Skeleton className="h-24 w-24 rounded-full mb-4" />
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                             {/* Block 1 Skeletons */}
                             <Skeleton className="h-6 w-1/3 mb-4" />
                             <Skeleton className="h-10 w-full mb-4" />
                             <Skeleton className="h-10 w-full mb-4" />
                             <Separator className="my-6" />
                             {/* Block 2 Skeletons */}
                             <Skeleton className="h-6 w-1/3 mb-4" />
                             <Skeleton className="h-10 w-full mb-4" />
                             <Skeleton className="h-10 w-full mb-4" />
                             <Separator className="my-6" />
                             {/* Button Skeletons */}
                            <Skeleton className="h-10 w-full mt-6" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
                 {/* Camps Section Skeleton */}
                 <div className="w-full">
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
                </div>
            </main>
            <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
            </footer>
        </div>
    );
  }

  // Main render when data is loaded
  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header />

       <main className="flex-1 p-4 md:p-8 lg:p-12">
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
            {/* Profile Section */}
           <div className="w-full mb-12"> {/* Centered content */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card className="shadow-lg bg-card text-card-foreground">
                            <CardHeader className="items-center text-center">
                                <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                                    {/* AvatarImage can be added later if photoURL is available */}
                                    <AvatarFallback className="text-4xl">
                                        {getInitials(user?.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <CardTitle className="text-2xl font-bold">{user?.email}</CardTitle>
                                <CardDescription>
                                   Manage your profile and events
                                </CardDescription>
                                {isAdmin && ( // Conditionally render the admin badge
                                    <Badge variant="default" className="mt-2 bg-primary text-primary-foreground">
                                        <ShieldCheck className="mr-1 h-4 w-4" /> Administrator
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                 {/* Block 1: Personal Data */}
                                <div className="space-y-4">
                                     <h3 className="text-lg font-medium text-foreground">Personal Information</h3>
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter your first name" {...field} disabled={isSaving} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    {/* Removed InputMask, using standard Input */}
                                                    <Input
                                                        type="tel"
                                                        placeholder="+7 xxx xxx-xx-xx"
                                                        {...field} // Pass field props
                                                        disabled={isSaving}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator className="my-6" />

                                 {/* Block 2: Organizer Data */}
                                 <div className="space-y-4">
                                     <h3 className="text-lg font-medium text-foreground">Organizer Details</h3>
                                     <FormField
                                        control={form.control}
                                        name="organizerName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Organizer Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Your organization or public name" {...field} disabled={isSaving} />
                                                </FormControl>
                                                <FormDescription>This name may be displayed publicly on camps you create.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="websiteUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Website URL</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://your-website.com" {...field} disabled={isSaving} type="url" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 </div>

                                <Separator className="my-6" />

                                <Button type="submit" className="w-full" disabled={isSaving || !form.formState.isDirty}> {/* Disable if not saving and form is not dirty */}
                                    <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
                                </Button>

                                <Button variant="outline" onClick={handleLogout} className="w-full mt-4"> {/* Added margin top */}
                                    <LogOut className="mr-2 h-4 w-4" /> Logout
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </Form>
            </div>

            {/* Events Section */}
            <div className="w-full"> {/* Centered content */}
                 {/* Section for User's Created Camps (Only shown to Admins) */}
               {isAdmin && (
                    <div className="mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold mb-6">My Created Camps</h2>
                        {campsLoading ? (
                            <SkeletonCard count={myCreatedCamps.length > 0 ? myCreatedCamps.length : 1} />
                        ) : myCreatedCamps.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myCreatedCamps.map((camp) => (
                                    <CampCard
                                        key={camp.id}
                                        camp={camp}
                                        isOwner={true} // Always owner in this section
                                        onDeleteClick={() => {}} // Deletion handled in admin panel
                                        deletingCampId={null} // Deletion handled in admin panel
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <p className="text-muted-foreground mb-4">You haven't created any camps yet.</p>
                                    <Button asChild>
                                        <Link href="/camps/new"><PlusCircle className="mr-2 h-4 w-4"/>Create Your First Camp</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
               )}

               {/* Separator only shown if both sections might be visible */}
               {isAdmin && <Separator className="my-12"/>}


                {/* Section for Camps User Responded To (Booked Camps) */}
               <div>
                   <h2 className="text-2xl md:text-3xl font-bold mb-6">Camps I'm Attending</h2>
                   {campsLoading ? ( // Reuse campsLoading or create a specific one for booked camps
                       <SkeletonCard count={1} />
                   ) : bookedCamps.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {/* Map over bookedCamps and render CampCard (or a different booked card style) */}
                            {bookedCamps.map((camp) => (
                                <CampCard
                                    key={camp.id}
                                    camp={camp}
                                    isOwner={false} // User is attending, not owning
                                    onDeleteClick={() => {}} // No delete action for booked camps here
                                    deletingCampId={null}
                                />
                            ))}
                       </div>
                   ) : (
                       <Card className="text-center py-12">
                           <CardContent>
                               <p className="text-muted-foreground">You haven't booked any camps yet.</p>
                               <Button variant="outline" asChild>
                                    <Link href="/main"> {/* Corrected link */}
                                        Discover Camps
                                    </Link>
                                </Button>
                           </CardContent>
                       </Card>
                   )}
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

