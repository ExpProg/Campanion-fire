
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'; // Import signInWithPopup
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { auth, db, googleProvider } from '@/config/firebase'; // Import db and googleProvider
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Tent } from 'lucide-react';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Define the Google icon as an inline SVG
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.7 0 265.2 0 130.8 109.3 21.8 244 21.8c67.7 0 120.6 28.2 159.9 64.9L353.4 137C319.1 109.3 286.3 92.8 244 92.8 155.6 92.8 85.8 162.4 85.8 255.6c0 93.1 69.8 162.8 158.2 162.8 74.3 0 124.9-49.3 130.5-114.3H244V261.8h244z"></path>
  </svg>
);


const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }), // Min 1 for login validation
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

   const handleGoogleSignIn = async () => {
     setIsGoogleLoading(true);
     try {
       const result = await signInWithPopup(auth, googleProvider);
       const user = result.user;
       await ensureUserProfile(user); // Ensure profile exists/is created
       toast({
         title: 'Google Sign-In Successful',
         description: `Welcome, ${user.displayName || user.email}!`,
       });
       router.push('/main');
     } catch (error: any) {
       console.error('Google Sign-In Error:', error);
       // Handle specific errors like popup closed, network error, etc.
       let errorMessage = 'Could not sign in with Google. Please try again.';
       if (error.code === 'auth/popup-closed-by-user') {
         errorMessage = 'Google Sign-In cancelled.';
       }
       toast({
         title: 'Google Sign-In Failed',
         description: errorMessage,
         variant: 'destructive',
       });
     } finally {
       setIsGoogleLoading(false);
     }
   };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
       <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 text-foreground hover:text-primary transition-colors" prefetch={false}>
          <Tent className="h-5 w-5" />
          <span className="font-semibold">Campanion</span>
        </Link>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your credentials or use Google</CardDescription>
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
                      <Input placeholder="you@example.com" {...field} type="email" disabled={isLoading || isGoogleLoading} />
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
                      <Input placeholder="••••••••" {...field} type="password" disabled={isLoading || isGoogleLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
           {/* Divider */}
           <div className="relative my-6">
             <div className="absolute inset-0 flex items-center">
               <span className="w-full border-t" />
             </div>
             <div className="relative flex justify-center text-xs uppercase">
               <span className="bg-background px-2 text-muted-foreground">
                 Or continue with
               </span>
             </div>
           </div>
           {/* Google Sign In Button */}
           <Button
             variant="outline"
             className="w-full"
             onClick={handleGoogleSignIn}
             disabled={isLoading || isGoogleLoading}
           >
             {isGoogleLoading ? (
               <>
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Signing in...
               </>
             ) : (
                <>
                 <GoogleIcon /> Sign in with Google
                </>
             )}
           </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm space-y-2">
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
