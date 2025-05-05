
// src/app/camps/[id]/edit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, Timestamp, collection, getDocs } from 'firebase/firestore'; // Added collection, getDocs
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, Building, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react'; // Added LinkIcon, Sparkles, Loader2
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns'; // Import parse
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Import RadioGroup
import { extractCampDataFromUrl } from '@/ai/flows/extract-camp-data-flow'; // Import the new AI flow

// Organizer Interface (matching Firestore structure)
interface Organizer {
  id: string;
  name: string;
  link?: string;
  description: string;
  avatarUrl?: string;
  createdAt: Timestamp;
}

// Zod schema for camp editing form validation (similar to creation)
const editCampSchema = z.object({
  name: z.string().min(3, { message: 'Camp name must be at least 3 characters.' }),
  organizerId: z.string().min(1, { message: 'Organizer is required.' }), // Added organizerId validation
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  activities: z.string().optional(),
  status: z.enum(['draft', 'active', 'archive'], { required_error: 'Status is required.' }), // Added 'archive' status
  originalLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')), // Added optional originalLink
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type EditCampFormValues = z.infer<typeof editCampSchema>;

// CampData Interface including creatorId, creationMode and status
interface CampData {
  id: string;
  name: string;
  organizerId: string; // Ensure organizerId is present
  organizerName?: string; // Denormalized name
  organizerLink?: string; // Denormalized link
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  dates: string; // Keep original formatted string if needed, or regenerate
  location: string;
  price: number;
  imageUrl: string;
  activities: string[];
  creatorId: string; // Added creatorId
  creationMode: 'admin' | 'user'; // Added creationMode
  status: 'draft' | 'active' | 'archive'; // Added 'archive' status
  originalLink?: string; // Added optional originalLink
  // Keep organizerId from original camp data
}

// Date Picker Component (reusable)
function DatePickerField({ field, label, disabled, isAdmin }: {
    field: any;
    label: string;
    disabled: boolean;
    isAdmin: boolean; // Added isAdmin prop
}) {
    return (
        <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <Popover>
            <PopoverTrigger asChild>
            <FormControl>
                <Button
                variant={"outline"}
                className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                )}
                disabled={disabled}
                >
                {field.value ? (
                    format(field.value, "PPP") // Use a readable format like "Sep 20, 2024"
                ) : (
                    <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
            <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => {
                    // Allow admins to select any date
                    if (isAdmin) {
                        return false;
                    }
                    // For non-admins, disable past dates (excluding today)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Set time to the beginning of the day
                    return date < today;
                }}
                initialFocus
            />
            </PopoverContent>
        </Popover>
        <FormMessage />
        </FormItem>
    );
}

// Edit Camp Form Component - added organizers and organizersLoading props
function EditCampForm({ campData, campId, organizers, organizersLoading }: {
    campData: CampData;
    campId: string;
    organizers: Organizer[];
    organizersLoading: boolean;
}) {
    const { user, isAdmin } = useAuth(); // Get user and isAdmin status
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false); // Loading state for AI extraction

    const form = useForm<EditCampFormValues>({
        resolver: zodResolver(editCampSchema),
        defaultValues: {
            name: campData.name || '',
            organizerId: campData.organizerId || '', // Use existing organizerId
            description: campData.description || '',
            // Convert Firestore Timestamps back to JS Date objects for the form
            startDate: campData.startDate?.toDate() || undefined,
            endDate: campData.endDate?.toDate() || undefined,
            location: campData.location || '',
            price: campData.price || 0,
            imageUrl: campData.imageUrl || '',
            activities: campData.activities?.join(', ') || '', // Join array back into comma-separated string
            status: campData.status || 'draft', // Set initial status
            originalLink: campData.originalLink || '', // Set initial originalLink
        },
    });

     // Watch for changes in start date to potentially disable end date picker
    const startDateValue = form.watch('startDate');

    // Attempt to parse date string into Date object
    const parseDateString = (dateString: string | undefined): Date | undefined => {
        if (!dateString) return undefined;
        // Add more formats if needed
        const formats = [
            'MM/dd/yyyy', 'yyyy-MM-dd', 'MMM d, yyyy', 'MMMM d, yyyy', 'd MMM yyyy',
            'yyyy/MM/dd', 'dd.MM.yyyy', 'MM-dd-yyyy'
        ];
        for (const fmt of formats) {
            try {
                const parsedDate = parse(dateString, fmt, new Date());
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate;
                }
            } catch (e) {
                // Ignore parsing errors for this format
            }
        }
        console.warn(`Could not parse date string: ${dateString}`);
        return undefined; // Return undefined if no format matches
    };


     const handleExtractData = async () => {
        const url = form.getValues('originalLink');
        if (!url) {
            toast({ title: 'Missing URL', description: 'Please enter a URL in the "Original Link" field.', variant: 'destructive' });
            return;
        }

        try {
            new URL(url); // Validate URL format
        } catch (_) {
            toast({ title: 'Invalid URL', description: 'Please enter a valid URL.', variant: 'destructive' });
            return;
        }

        setIsExtracting(true);
        try {
            const result = await extractCampDataFromUrl({ url });

            // Set values, attempting to parse dates
            form.setValue('name', result.name || campData.name, { shouldValidate: true });
            form.setValue('description', result.description || campData.description, { shouldValidate: true });
            form.setValue('location', result.location || campData.location, { shouldValidate: true });
            form.setValue('price', result.price ?? campData.price, { shouldValidate: true });
            form.setValue('imageUrl', result.imageUrl || campData.imageUrl, { shouldValidate: true });
            form.setValue('activities', result.activities?.join(', ') || campData.activities?.join(', ') || '', { shouldValidate: true });


             // Attempt to parse and set dates
            const startDate = parseDateString(result.startDateString);
            const endDate = parseDateString(result.endDateString);

            if (startDate) {
                form.setValue('startDate', startDate, { shouldValidate: true });
            } else if (result.startDateString) {
                toast({ title: 'Date Parsing Warning', description: `Could not automatically parse start date: "${result.startDateString}". Please set manually.`, variant: 'default' });
            }

             if (endDate) {
                form.setValue('endDate', endDate, { shouldValidate: true });
            } else if (result.endDateString) {
                 toast({ title: 'Date Parsing Warning', description: `Could not automatically parse end date: "${result.endDateString}". Please set manually.`, variant: 'default' });
            }

            toast({ title: 'Data Extracted', description: 'Form fields have been populated. Please review and adjust.' });

        } catch (error) {
            console.error('Error extracting camp data:', error);
            toast({ title: 'Extraction Failed', description: 'Could not extract data from the provided URL. Please fill manually.', variant: 'destructive' });
        } finally {
            setIsExtracting(false);
        }
    };


    const onSubmit = async (values: EditCampFormValues) => {
        // Permission check: Ensure user is logged in and is the creator of the camp
        // Note: Only admins can reach this page due to routing rules, but double-check creatorId
        if (!user || campData.creatorId !== user.uid) {
             toast({
                title: 'Permission Denied',
                description: 'You do not have permission to edit this camp.',
                variant: 'destructive',
            });
            return;
        }

        // Additional check for non-admins trying to set past dates (though UI should prevent this)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isAdmin && values.startDate < today) {
            toast({
                title: 'Invalid Date',
                description: 'Start date cannot be in the past.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const activitiesArray = values.activities
                ? values.activities.split(',').map(activity => activity.trim()).filter(Boolean)
                : [];

            // Format dates for display string (consistent with creation)
            const formattedStartDate = format(values.startDate, "MMM d");
            const formattedEndDate = format(values.endDate, "MMM d, yyyy");
            const datesString = `${formattedStartDate} - ${formattedEndDate}`;

            // Find selected organizer details for denormalization
            const selectedOrganizer = organizers.find(org => org.id === values.organizerId);
            const organizerName = selectedOrganizer?.name || 'Unknown Organizer';
            const organizerLink = selectedOrganizer?.link || '';

            // Construct updated data, keeping creatorId and creationMode unchanged
            const updatedData: Partial<CampData> = { // Use Partial<CampData> to allow partial updates
                name: values.name,
                organizerId: values.organizerId, // Update organizer ID
                organizerName: organizerName, // Update denormalized name
                organizerLink: organizerLink, // Update denormalized link
                creatorId: campData.creatorId, // Keep original creatorId
                creationMode: campData.creationMode, // Keep original creationMode
                description: values.description,
                startDate: Timestamp.fromDate(values.startDate),
                endDate: Timestamp.fromDate(values.endDate),
                dates: datesString, // Update the formatted string
                location: values.location,
                price: values.price,
                imageUrl: values.imageUrl || `https://picsum.photos/seed/${values.name.replace(/\s+/g, '-')}/600/400`, // Fallback logic
                activities: activitiesArray,
                status: values.status, // Update the status field
                originalLink: values.originalLink || '', // Update originalLink, ensure it's not null/undefined
                // createdAt remains unchanged
            };

            const campDocRef = doc(db, 'camps', campId);
            await updateDoc(campDocRef, updatedData);

            toast({
                title: 'Camp Updated Successfully!',
                description: `Your camp "${values.name}" has been updated.`,
            });
            router.push('/admin'); // Redirect to admin page after update

        } catch (error) {
            console.error('Error updating camp in Firestore:', error);
            toast({
                title: 'Failed to Update Camp',
                description: 'An error occurred while saving the changes. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const originalLinkValue = form.watch('originalLink');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                 {/* Original Link Field with Extract Button */}
                 <FormField
                    control={form.control}
                    name="originalLink"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Original Link (Optional)</FormLabel>
                             <div className="flex gap-2">
                                <FormControl>
                                    <Input
                                        type="url"
                                        placeholder="https://original-source.com/camp"
                                        {...field}
                                        disabled={isLoading || organizersLoading || isExtracting}
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    onClick={handleExtractData}
                                    disabled={isLoading || organizersLoading || isExtracting || !originalLinkValue}
                                    variant="outline"
                                    size="icon"
                                    aria-label="Fill data from link"
                                >
                                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                </Button>
                             </div>
                            <FormDescription>
                                Enter a link to automatically fill some fields (Name, Description, Location, Price, Image, Activities, Dates).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Camp Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter camp name" {...field} disabled={isLoading || organizersLoading || isExtracting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Organizer Select Dropdown */}
                <FormField
                    control={form.control}
                    name="organizerId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Organizer</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || organizersLoading || isExtracting}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an organizer..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                     {organizersLoading ? (
                                        <SelectItem value="loading" disabled>Loading organizers...</SelectItem>
                                    ) : organizers.length > 0 ? (
                                        organizers.map((organizer) => (
                                            <SelectItem key={organizer.id} value={organizer.id}>
                                                 <div className="flex items-center gap-2">
                                                    {organizer.avatarUrl && (
                                                        <img src={organizer.avatarUrl} alt={organizer.name} className="h-5 w-5 rounded-full object-cover"/>
                                                    )}
                                                    {!organizer.avatarUrl && <Building className="h-5 w-5 text-muted-foreground" />}
                                                    <span>{organizer.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="no-organizers" disabled>No organizers found.</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                             <FormDescription>
                                Change the organizer responsible for this camp.
                             </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe your camp" {...field} disabled={isLoading || organizersLoading || isExtracting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                           <DatePickerField
                                field={field}
                                label="Start Date"
                                disabled={isLoading || organizersLoading || isExtracting}
                                isAdmin={isAdmin} // Pass admin status
                           />
                        )}
                     />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                           <DatePickerField
                               field={field}
                               label="End Date"
                               disabled={isLoading || organizersLoading || isExtracting || !startDateValue} // Disable if start date not picked
                               isAdmin={isAdmin} // Pass admin status
                           />
                        )}
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Rocky Mountains, CO" {...field} disabled={isLoading || organizersLoading || isExtracting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (₽)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Enter price" {...field} disabled={isLoading || organizersLoading || isExtracting} min="0" step="0.01" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>

                 <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} disabled={isLoading || organizersLoading || isExtracting} />
                            </FormControl>
                            <FormDescription>Update the image URL for your camp.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <FormField
                    control={form.control}
                    name="activities"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Activities (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Hiking, Swimming, Coding" {...field} disabled={isLoading || organizersLoading || isExtracting} />
                            </FormControl>
                            <FormDescription>Enter activities separated by commas.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                 {/* Status Field */}
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value} // Use value for controlled component
                          className="flex space-x-4"
                           disabled={isLoading || organizersLoading || isExtracting}
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="draft" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Draft
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="active" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Active
                            </FormLabel>
                          </FormItem>
                           <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="archive" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Archive
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Control the visibility of the camp. 'Draft' is hidden, 'Active' is visible, 'Archive' hides from lists but keeps data.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <Button type="submit" className="mt-6" disabled={isLoading || organizersLoading || isExtracting || organizers.length === 0}>
                   {isLoading ? 'Saving Changes...' : 'Save Changes'}
                </Button>
            </form>
        </Form>
    );
}

// Main Page Component
export default function EditCampPage() {
    const { user, isAdmin, loading: authLoading } = useAuth(); // Get isAdmin from context
    const router = useRouter();
    const params = useParams();
    const campId = params.id as string;
    const { toast } = useToast();

    const [campData, setCampData] = useState<CampData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [organizers, setOrganizers] = useState<Organizer[]>([]); // Added organizers state
    const [organizersLoading, setOrganizersLoading] = useState(true); // Added organizers loading state

    useEffect(() => {
        // Redirect if not logged in or not admin after auth check
        if (!authLoading && (!user || !isAdmin)) {
            toast({ title: 'Access Denied', description: 'You must be an administrator to edit camps.', variant: 'destructive' });
            router.push('/main'); // Redirect non-admins or logged-out users
            return;
        }

        // If auth is still loading, or user is not yet verified as admin, wait.
        if (authLoading || (user && !isAdmin)) {
            setLoading(true); // Keep loading state true until admin status is confirmed
            return;
        }

        // At this point, user is loaded and confirmed as admin
        if (campId && user && isAdmin) { // Fetch only if ID, user, and admin status are valid
            setLoading(true);
            setOrganizersLoading(true); // Start loading organizers
            setError(null);

            const fetchData = async () => { // Renamed function
                try {
                    // Fetch Camp Data
                    const campDocRef = doc(db, 'camps', campId);
                    const docSnap = await getDoc(campDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data() as Omit<CampData, 'id'>;
                        // **Permission Check:** Ensure the logged-in admin is the CREATOR of this camp
                        if (data.creatorId !== user.uid) {
                            setError("Permission Denied. You can only edit camps you created.");
                            toast({ title: 'Permission Denied', description: 'You did not create this camp.', variant: 'destructive' });
                            router.push('/admin');
                            return;
                        }
                        // Add default values for potentially missing fields
                        setCampData({
                            id: docSnap.id,
                            ...data,
                            creatorId: data.creatorId || user.uid, // Fallback just in case
                            creationMode: data.creationMode || 'admin', // Fallback just in case
                            status: data.status || 'draft', // Fallback status
                            originalLink: data.originalLink || '', // Load originalLink
                         });
                    } else {
                        setError("Camp not found.");
                        toast({ title: 'Error', description: 'Camp not found.', variant: 'destructive' });
                        router.push('/admin'); // Redirect if camp doesn't exist
                        return; // Stop further execution if camp not found
                    }

                    // Fetch Organizers Data
                    await fetchOrganizers(); // Fetch organizers after checking camp

                } catch (fetchError) {
                    console.error("Error fetching data:", fetchError);
                    setError("Failed to load required data.");
                    toast({ title: 'Error', description: 'Failed to load camp data. Please try again.', variant: 'destructive' });
                } finally {
                    setLoading(false); // Stop loading after camp fetch (or error)
                    // Organizers loading state is managed by fetchOrganizers
                }
            };

            fetchData(); // Call the updated function

        } else if (!campId) {
            setError("Camp ID is missing.");
            setLoading(false);
            setOrganizersLoading(false); // Stop organizers loading too
            router.push('/admin'); // Redirect if no ID
        }
    }, [campId, user, isAdmin, authLoading, router, toast]);

    // Function to fetch organizers from Firestore
    const fetchOrganizers = async () => {
         setOrganizersLoading(true); // Ensure loading state is true
         try {
             const organizersCollectionRef = collection(db, 'organizers');
             const querySnapshot = await getDocs(organizersCollectionRef);
             const fetchedOrganizers = querySnapshot.docs.map(doc => ({
                 id: doc.id,
                 ...doc.data() as Omit<Organizer, 'id'>
             })).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
             setOrganizers(fetchedOrganizers);
         } catch (error) {
             console.error("Error fetching organizers:", error);
             setError(prevError => prevError ?? "Failed to load organizers list."); // Set error if not already set
             toast({ title: 'Error', description: 'Failed to load organizers list.', variant: 'destructive' });
             setOrganizers([]); // Set empty on error
         } finally {
             setOrganizersLoading(false); // Stop loading after fetch attempt
         }
    };


    // Combined loading state check
    const isPageLoading = loading || authLoading || organizersLoading;

    // Loading state skeleton
    if (isPageLoading) {
        return (
             <div className="flex flex-col min-h-screen">
                 {/* Header Skeleton */}
                 <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
                     <Skeleton className="h-6 w-6 mr-2" />
                     <Skeleton className="h-6 w-32" />
                     <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                         <Skeleton className="h-8 w-20" />
                     </div>
                 </header>
                 {/* Edit Camp Form Skeleton */}
                 <main className="flex-1 p-4 md:p-8 lg:p-12">
                     <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                         <Skeleton className="h-8 w-32 mb-8" />
                         <Card>
                             <CardHeader>
                                 <Skeleton className="h-8 w-1/2 mb-2" />
                                 <Skeleton className="h-4 w-3/4" />
                             </CardHeader>
                             <CardContent>
                                 <Skeleton className="h-10 w-full mb-4" /> {/* Original Link */}
                                 <Skeleton className="h-10 w-full mb-4" /> {/* Camp Name */}
                                 <Skeleton className="h-10 w-full mb-4" /> {/* Organizer Dropdown Skeleton */}
                                 <Skeleton className="h-20 w-full mb-4" /> {/* Description */}
                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                     <Skeleton className="h-10 w-full" /> {/* Start Date */}
                                     <Skeleton className="h-10 w-full" /> {/* End Date */}
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                     <Skeleton className="h-10 w-full" /> {/* Location */}
                                     <Skeleton className="h-10 w-full" /> {/* Price */}
                                 </div>
                                 <Skeleton className="h-10 w-full mb-4" /> {/* Image URL */}
                                 <Skeleton className="h-10 w-full mb-4" /> {/* Activities */}
                                 <Skeleton className="h-10 w-full mb-4" /> {/* Status */}
                                 <Skeleton className="h-10 w-1/4 mt-6" /> {/* Submit Button */}
                             </CardContent>
                         </Card>
                     </div>
                 </main>
                 {/* Footer Skeleton */}
                 <footer className="py-6 px-4 md:px-6 border-t">
                     <Skeleton className="h-4 w-1/4" />
                 </footer>
             </div>
        );
    }

     // Error state display
    if (error) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="container mx-auto px-4 py-12 text-center">
                         {/* Link back to admin panel if error occurs here */}
                        <Link href="/admin" className="inline-flex items-center text-primary hover:underline mb-4" prefetch={false}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Admin Panel
                        </Link>
                        <p className="text-xl text-destructive">{error}</p>
                    </div>
                </main>
                <footer className="py-6 px-4 md:px-6 border-t">
                    <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
                </footer>
            </div>
        );
    }

    // Render the form if data is loaded and no error
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                    {/* Link back to admin panel */}
                    <Link href="/admin" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                         Back to Admin Panel
                    </Link>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl md:text-3xl font-bold">Edit Camp</CardTitle>
                            <CardDescription>Update the details for your camp: {campData?.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Pass organizers and loading state to the form */}
                            {campData && <EditCampForm
                                            campData={campData}
                                            campId={campId}
                                            organizers={organizers}
                                            organizersLoading={organizersLoading}
                                          />}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
            </footer>
        </div>
    );
}

