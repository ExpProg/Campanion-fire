
// src/app/camps/new/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, ShieldAlert } from 'lucide-react'; // Added ShieldAlert
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header'; // Import Header component

// Zod schema for camp creation form validation
const createCampSchema = z.object({
  name: z.string().min(3, { message: 'Camp name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }), // coerce converts string input to number
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')), // Optional image URL
  activities: z.string().optional(), // Optional comma-separated activities
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"], // Set the error path to the endDate field
});


type CreateCampFormValues = z.infer<typeof createCampSchema>;

// Date Picker Component (simplified version)
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
                format(field.value, "PPP")
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
                // Ensure comparison is only against the date part, not time
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


// Actual form component
function CreateCampForm() {
    const { user, isAdmin } = useAuth(); // Get user and isAdmin status
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CreateCampFormValues>({
        resolver: zodResolver(createCampSchema),
        defaultValues: {
            name: '',
            description: '',
            startDate: undefined, // Use undefined for date picker initial state
            endDate: undefined,
            location: '',
            price: 0,
            imageUrl: '',
            activities: '',
        },
    });

    const onSubmit = async (values: CreateCampFormValues) => {
        if (!user?.uid || !user?.email || !isAdmin) { // Check if user is admin
            toast({
                title: 'Permission Denied',
                description: 'Only administrators can create camps.',
                variant: 'destructive',
            });
            return;
        }

        // Additional check for non-admins trying to create past camps (though UI should prevent this)
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

            // Format dates for display string
            const formattedStartDate = format(values.startDate, "MMM d");
            const formattedEndDate = format(values.endDate, "MMM d, yyyy");
            const datesString = `${formattedStartDate} - ${formattedEndDate}`;

            const campData = {
                name: values.name,
                description: values.description,
                startDate: Timestamp.fromDate(values.startDate), // Store as Timestamp
                endDate: Timestamp.fromDate(values.endDate),     // Store as Timestamp
                dates: datesString, // Store formatted string for easy display
                location: values.location,
                price: values.price,
                imageUrl: values.imageUrl || `https://picsum.photos/seed/${values.name.replace(/\s+/g, '-')}/600/400`, // Use name for seed or default
                activities: activitiesArray,
                organizerEmail: user.email, // Keep email for display purposes if needed
                organizerId: user.uid, // Associate with the logged-in organizer's UID
                createdAt: Timestamp.fromDate(new Date()),
            };

            const docRef = await addDoc(collection(db, 'camps'), campData);

            toast({
                title: 'Camp Created Successfully!',
                description: `Your camp "${values.name}" has been added.`,
            });
            // Redirect to the main page or the new camp's page
            router.push('/main');
            // Optional: redirect to the new camp's detail page: router.push(`/camps/${docRef.id}`);

        } catch (error) {
            console.error('Error adding camp to Firestore:', error);
            toast({
                title: 'Failed to Create Camp',
                description: 'An error occurred while saving the camp. Please try again.',
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
                     {/* Start Date Picker */}
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

                     {/* End Date Picker */}
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                           <DatePickerField
                                field={field}
                                label="End Date"
                                disabled={isLoading || !form.watch('startDate')} // Disable if start date not picked
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
                                <FormLabel>Price (₽)</FormLabel> {/* Changed $ to ₽ */}
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
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormDescription>If left blank, a placeholder image will be used.</FormDescription>
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
                   {isLoading ? 'Creating Camp...' : 'Create Camp'}
                </Button>
            </form>
        </Form>
    );
}


export default function CreateCampPage() {
  const { user, isAdmin, loading } = useAuth(); // Get user, isAdmin and loading status
  const router = useRouter();

  useEffect(() => {
    // Redirect logic: Redirect if loading is done and user is not logged in OR not an admin
    if (!loading && (!user || !isAdmin)) {
        router.push('/main'); // Redirect to main page if not admin or not logged in
    }
  }, [user, isAdmin, loading, router]);


  if (loading || !user || !isAdmin) { // Show skeleton if loading, or user not logged in, or not admin
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
             {/* Conditional Content: Show "Access Denied" if not admin, otherwise skeleton */}
             <main className="flex-1 p-4 md:p-8 lg:p-12">
                {!loading && user && !isAdmin ? ( // Show access denied if loaded, user exists but is not admin
                  <div className="container mx-auto px-4 py-12 flex flex-col items-center text-center">
                     <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                     <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                     <p className="text-muted-foreground mb-6">Only administrators can create new camps.</p>
                     <Link href="/main" className="inline-flex items-center text-primary hover:underline" prefetch={false}>
                         <ArrowLeft className="mr-2 h-4 w-4" />
                         Return to Main Page
                     </Link>
                 </div>
                ) : ( // Otherwise (still loading or user is admin), show skeleton
                    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                        <Skeleton className="h-8 w-32 mb-8" /> {/* Back button placeholder */}
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
                                <Skeleton className="h-10 w-1/4 mt-6" />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
             {/* Footer Skeleton */}
             <footer className="py-6 px-4 md:px-6 border-t">
                 <Skeleton className="h-4 w-1/4" />
             </footer>
         </div>
     );
  }


  // User is logged in and is an admin
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header /> {/* Use the reusable Header component */}

      <main className="flex-1 p-4 md:p-8 lg:p-12">
          <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl"> {/* Added max-w */}
              <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Main
              </Link>

              <Card className="shadow-lg">
                  <CardHeader>
                      <CardTitle className="text-2xl md:text-3xl font-bold">Create a New Camp</CardTitle>
                      <CardDescription>Fill in the details to list your camp on Campanion.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <CreateCampForm />
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
