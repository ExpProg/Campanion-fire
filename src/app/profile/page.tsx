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
import { LogOut, Save } from 'lucide-react'; // Added Save icon
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Zod schema for profile form validation
const profileSchema = z.object({
  firstName: z.string().optional(),
  phoneNumber: z.string().optional(),
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
}


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        firstName: '',
        phoneNumber: '',
        organizerName: '',
        websiteUrl: '',
    },
  });

  // Fetch profile data on mount
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setProfileLoading(true);
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
              // Handle case where user doc doesn't exist (e.g., first time profile access)
              console.log("No profile document found for user, creating one might be needed or using defaults.");
          }
      }).catch(error => {
          console.error("Error fetching profile data:", error);
          toast({ title: 'Error', description: 'Could not load profile data.', variant: 'destructive' });
      }).finally(() => {
          setProfileLoading(false);
      });
    }
  }, [user, authLoading, router, toast, form]);


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
        // Prepare data, ensuring empty strings are handled if needed, or use serverTimestamp for updates
        const dataToSave = {
            firstName: values.firstName || '', // Store empty string if undefined
            phoneNumber: values.phoneNumber || '',
            organizerName: values.organizerName || '',
            websiteUrl: values.websiteUrl || '',
            // Add updatedAt timestamp if desired: updatedAt: serverTimestamp(),
        };

        // Use setDoc with merge:true or updateDoc. updateDoc fails if the doc doesn't exist.
        // setDoc with merge:true is safer as it creates or updates.
        await setDoc(userDocRef, dataToSave, { merge: true });

        toast({ title: 'Profile Updated', description: 'Your profile information has been saved.' });
    } catch (error) {
        console.error('Error updating profile:', error);
        toast({ title: 'Update Failed', description: 'Could not save profile changes.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };


  // Helper to generate initials
  const getInitials = (email: string | null | undefined) => {
    if (!email) return '??';
    return email.charAt(0).toUpperCase();
  };


  if (authLoading || profileLoading || (!user && !authLoading)) {
    return (
        <div className="flex flex-col min-h-screen">
             <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
                 <Skeleton className="h-6 w-6 mr-2" />
                 <Skeleton className="h-6 w-32" />
                 <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                     <Skeleton className="h-8 w-20" />
                 </div>
             </header>
            <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
                <div className="w-full max-w-2xl">
                    <Card className="shadow-lg">
                        <CardHeader className="items-center text-center">
                            <Skeleton className="h-24 w-24 rounded-full mb-4" />
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Separator className="my-6" />
                             <Skeleton className="h-6 w-1/3 mb-4" />
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Separator className="my-6" />
                            <Skeleton className="h-10 w-full mt-6" /> {/* Save button skeleton */}
                            <Skeleton className="h-10 w-full" /> {/* Logout button skeleton */}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <footer className="py-6 px-4 md:px-6 border-t">
               <Skeleton className="h-4 w-1/4" />
            </footer>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header />

       <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
           <div className="w-full max-w-2xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card className="shadow-lg bg-card text-card-foreground">
                            <CardHeader className="items-center text-center">
                                <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                                    {/* <AvatarImage src={user.photoURL || undefined} alt={user.email || 'User'} /> */}
                                    <AvatarFallback className="text-4xl">
                                        {getInitials(user?.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <CardTitle className="text-2xl font-bold">{user?.email}</CardTitle>
                                <CardDescription>
                                   Manage your profile information
                                </CardDescription>
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
                                                    <Input placeholder="Enter your phone number" {...field} disabled={isSaving} type="tel" />
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

                                <Button type="submit" className="w-full" disabled={isSaving}>
                                    <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
                                </Button>

                                <Button variant="outline" onClick={handleLogout} className="w-full">
                                    <LogOut className="mr-2 h-4 w-4" /> Logout
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </Form>
            </div>
        </main>

        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
            <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
        </footer>
    </div>
  );
}