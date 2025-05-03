
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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

// Zod schema for camp creation form validation
const createCampSchema = z.object({
  name: z.string().min(3, { message: 'Camp name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  dates: z.string().min(5, { message: 'Please provide dates (e.g., July 10-20).' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }), // coerce converts string input to number
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')), // Optional image URL
  activities: z.string().optional(), // Optional comma-separated activities
});

type CreateCampFormValues = z.infer<typeof createCampSchema>;

// Actual form component
function CreateCampForm() {
    const { user } = useAuth(); // Get user to associate camp with organizer
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CreateCampFormValues>({
        resolver: zodResolver(createCampSchema),
        defaultValues: {
            name: '',
            description: '',
            dates: '',
            location: '',
            price: 0,
            imageUrl: '',
            activities: '',
        },
    });

    const onSubmit = async (values: CreateCampFormValues) => {
        if (!user?.email) {
            toast({
                title: 'Error',
                description: 'You must be logged in to create a camp.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            const activitiesArray = values.activities
                ? values.activities.split(',').map(activity => activity.trim()).filter(Boolean)
                : [];

            const campData = {
                name: values.name,
                description: values.description,
                dates: values.dates,
                location: values.location,
                price: values.price,
                imageUrl: values.imageUrl || `https://picsum.photos/seed/${values.name.replace(/\s+/g, '-')}/600/400`, // Use name for seed or default
                activities: activitiesArray,
                organizerEmail: user.email, // Associate with the logged-in organizer
                createdAt: Timestamp.fromDate(new Date()),
            };

            const docRef = await addDoc(collection(db, 'camps'), campData);

            toast({
                title: 'Camp Created Successfully!',
                description: `Your camp "${values.name}" has been added.`,
            });
            // Redirect to the dashboard or the new camp's page
            router.push('/dashboard');
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
                    <FormField
                        control={form.control}
                        name="dates"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dates</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., July 10 - July 20, 2024" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

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
                 </div>


                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Enter price" {...field} disabled={isLoading} min="0" step="0.01" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

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
                </div>


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
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if auth loading is done, user exists, but is not an organizer OR if user doesn't exist
    if (!loading) {
        if (!user) {
            router.push('/login'); // Not logged in
        } else if (!profile?.isOrganizer) {
            router.push('/dashboard'); // Logged in but not an organizer
        }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile?.isOrganizer) {
    // Show loading state or redirect happens in useEffect
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <Skeleton className="h-8 w-32 mb-8" /> {/* Back button placeholder */}
            <Card>
                <CardHeader>
                     <Skeleton className="h-8 w-1/2 mb-2" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-10 w-full mb-4" />
                     <Skeleton className="h-10 w-full mb-4" />
                     <Skeleton className="h-20 w-full mb-4" />
                     <Skeleton className="h-10 w-1/4 mt-6" />
                </CardContent>
            </Card>
        </div>
    );
  }


  // User is logged in and is an organizer
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl"> {/* Added max-w */}
      <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline mb-6" prefetch={false}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
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
  );
}

