
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Removed signInWithPopup import
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore'; // Added Timestamp, getDoc
// Removed googleProvider import
import { auth, db } from '@/config/firebase'; // Import db
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Tent } from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Removed GoogleIcon component

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Removed isGoogleLoading state
  // const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Function to check and create user profile if needed
  const ensureUserProfile = async (user: any) => {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        createdAt: Timestamp.now(),
        isAdmin: false, // Default isAdmin to false
        firstName: user.displayName?.split(' ')[0] || '',
        phoneNumber: '',
        organizerName: '',
        websiteUrl: '',
      });
      console.log("Created Firestore user profile for:", user.email);
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Ensure Firestore user profile is created
      await ensureUserProfile(user);

      toast({
        title: 'Registration Successful',
        description: 'Welcome to Campanion!',
      });
      router.push('/main'); // Redirect to main page after successful registration
    } catch (error: any) {
      console.error('Registration Error:', error);
      let errorMessage = 'An error occurred during registration.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in or use a different email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/popup-closed-by-user') {
         // Keep this check if popup errors can still somehow occur, though unlikely without Google sign-up
         errorMessage = 'Registration process cancelled.';
      }
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleGoogleSignUp function

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
       <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 text-foreground hover:text-primary transition-colors" prefetch={false}>
          <Tent className="h-5 w-5" />
          <span className="font-semibold">Campanion</span>
       </Link>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Register</CardTitle>
          {/* Updated description */}
          <CardDescription>Create your Campanion account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      {/* Removed isGoogleLoading from disabled */}
                      <Input placeholder="you@example.com" {...field} type="email" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      {/* Removed isGoogleLoading from disabled */}
                      <Input placeholder="••••••••" {...field} type="password" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Removed isGoogleLoading from disabled */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
            </form>
          </Form>
            {/* Removed Divider and Google Button */}
        </CardContent>
        <CardFooter className="text-center text-sm pt-6"> {/* Added pt-6 */}
          Already have an account?{' '}
          <Link href="/login" className="underline ml-1" prefetch={false}>
            Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
