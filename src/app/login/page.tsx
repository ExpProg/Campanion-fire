
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Removed signInWithPopup import
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions
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

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }), // Min 1 for login validation
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Removed isGoogleLoading state
  // const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
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
      // Create initial profile if it doesn't exist
      await setDoc(userDocRef, {
        email: user.email,
        createdAt: Timestamp.now(),
        isAdmin: false, // Default isAdmin to false for new users
        firstName: user.displayName?.split(' ')[0] || '', // Attempt to get first name
        // Initialize other fields as needed
        phoneNumber: '',
        organizerName: '',
        websiteUrl: '',
      });
      console.log("Created Firestore user profile for:", user.email);
    }
  };


  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await ensureUserProfile(userCredential.user); // Ensure profile exists
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/main'); // Redirect to main page after successful login
    } catch (error: any) {
      console.error('Login Error:', error);
      let errorMessage = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error.code === 'auth/popup-closed-by-user') {
          // Keep this check if popup errors can still somehow occur, though unlikely without Google sign-in
          errorMessage = 'Login process cancelled.';
      }
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleGoogleSignIn function

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
       <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 text-foreground hover:text-primary transition-colors" prefetch={false}>
          <Tent className="h-5 w-5" />
          <span className="font-semibold">Campanion</span>
        </Link>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          {/* Updated description */}
          <CardDescription>Enter your email and password</CardDescription>
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
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
           {/* Removed Divider and Google Button */}
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm space-y-2 pt-6"> {/* Added pt-6 */}
           <Link href="/forgot-password" className="underline" prefetch={false}> {/* Add forgot password later if needed */}
             Forgot password?
           </Link>
          <div>
            Don't have an account?{' '}
            <Link href="/register" className="underline ml-1" prefetch={false}>
              Register
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
