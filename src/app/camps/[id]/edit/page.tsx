
// src/app/camps/[id]/edit/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';

// Zod schema for camp editing form validation (similar to creation)
const editCampSchema = z.object({
  name: z.string().min(3, { message: 'Camp name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  activities: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type EditCampFormValues = z.infer<typeof editCampSchema>;

interface CampData {
  id: string;
  name: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  dates: string; // Keep original formatted string if needed, or regenerate
  location: string;
  price: number;
  imageUrl: string;
  activities: string[];
  organizerId: string;
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

// Edit Camp Form Component
function EditCampForm({ campData, campId }: { campData: CampData, campId: string }) {
    const { user, isAdmin } = useAuth(); // Get user and isAdmin status
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<EditCampFormValues>({
        resolver: zodResolver(editCampSchema),
        defaultValues: {
            name: campData.name || '',
            description: campData.description || '',
            // Convert Firestore Timestamps back to JS Date objects for the form
            startDate: campData.startDate?.toDate() || undefined,
            endDate: campData.endDate?.toDate() || undefined,
            location: campData.location || '',
            price: campData.price || 0,
            imageUrl: campData.imageUrl || '',
            activities: campData.activities?.join(', ') || '', // Join array back into comma-separated string
        },
    });

     // Watch for changes in start date to potentially disable end date picker
    const startDateValue = form.watch('startDate');

    const onSubmit = async (values: EditCampFormValues) => {
        if (!user?.uid || user.uid !== campData.organizerId) {
            toast({
                title: 'Error',
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

            const updatedData = {
                name: values.name,
                description: values.description,
                startDate: Timestamp.fromDate(values.startDate),
                endDate: Timestamp.fromDate(values.endDate),
                dates: datesString, // Update the formatted string
                location: values.location,
                price: values.price,
                imageUrl: values.imageUrl || `https://picsum.photos/seed/${values.name.replace(/\s+/g, '-')}/600/400`, // Fallback logic
                activities: activitiesArray,
                // organizerId and createdAt remain unchanged
            };

            const campDocRef = doc(db, 'camps', campId);
            await updateDoc(campDocRef, updatedData);

            toast({
                title: 'Camp Updated Successfully!',
                description: `Your camp "${values.name}" has been updated.`,
            });
            router.push('/main'); // Redirect to main page after update

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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Camp Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter camp name" {...field} disabled={isLoading} />
                            </FormControl>
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
                                <Textarea placeholder="Describe your camp" {...field} disabled={isLoading} />
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
                                disabled={isLoading}
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
                               disabled={isLoading || !startDateValue} // Disable if start date not picked
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
                                    <Input placeholder="e.g., Rocky Mountains, CO" {...field} disabled={isLoading} />
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
                                    <Input type="number" placeholder="Enter price" {...field} disabled={isLoading} min="0" step="0.01" />
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
                                <Input placeholder="https://example.com/image.jpg" {...field} disabled={isLoading} />
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
                                <Input placeholder="Hiking, Swimming, Coding" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormDescription>Enter activities separated by commas.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="mt-6" disabled={isLoading}>
                   {isLoading ? 'Saving Changes...' : 'Save Changes'}
                </Button>
            </form>
        </Form>
    );
}

// Main Page Component
export default function EditCampPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const campId = params.id as string;
    const { toast } = useToast();

    const [campData, setCampData] = useState<CampData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login'); // Redirect if not logged in
            return;
        }

        if (campId && user) { // Fetch only if ID and user exist
            setLoading(true);
            setError(null);
            const campDocRef = doc(db, 'camps', campId);
            getDoc(campDocRef)
                .then(docSnap => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as Omit<CampData, 'id'>;
                        if (data.organizerId === user.uid) { // Check ownership
                            setCampData({ id: docSnap.id, ...data });
                        } else {
                            setError('You do not have permission to edit this camp.');
                            toast({ title: 'Permission Denied', description: 'You can only edit camps you created.', variant: 'destructive' });
                            router.push('/main'); // Redirect if not owner
                        }
                    } else {
                        setError("Camp not found.");
                        toast({ title: 'Error', description: 'Camp not found.', variant: 'destructive' });
                        router.push('/main'); // Redirect if camp doesn't exist
                    }
                })
                .catch(fetchError => {
                    console.error("Error fetching camp data:", fetchError);
                    setError("Failed to load camp data.");
                    toast({ title: 'Error', description: 'Failed to load camp data. Please try again.', variant: 'destructive' });
                })
                .finally(() => {
                    setLoading(false);
                });
        } else if (!campId) {
            setError("Camp ID is missing.");
            setLoading(false);
            router.push('/main'); // Redirect if no ID
        }
    }, [campId, user, authLoading, router, toast]);

    // Loading state skeleton
    if (loading || authLoading || (!user && !authLoading)) {
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
                                 <Skeleton className="h-10 w-full mb-4" />
                                 <Skeleton className="h-20 w-full mb-4" />
                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                     <Skeleton className="h-10 w-full" />
                                     <Skeleton className="h-10 w-full" />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                     <Skeleton className="h-10 w-full" />
                                     <Skeleton className="h-10 w-full" />
                                 </div>
                                 <Skeleton className="h-10 w-full mb-4" />
                                 <Skeleton className="h-10 w-full mb-4" />
                                 <Skeleton className="h-10 w-1/4 mt-6" />
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
                        <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-4" prefetch={false}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Main
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
                    <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Main
                    </Link>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl md:text-3xl font-bold">Edit Camp</CardTitle>
                            <CardDescription>Update the details for your camp: {campData?.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {campData && <EditCampForm campData={campData} campId={campId} />}
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
