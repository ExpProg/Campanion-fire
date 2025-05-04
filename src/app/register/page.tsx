
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'; // Import signInWithPopup
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore'; // Added Timestamp, getDoc
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


const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const handleGoogleSignUp = async () => {
     setIsGoogleLoading(true);
     try {
       const result = await signInWithPopup(auth, googleProvider);
       const user = result.user;
       // Ensure profile exists/is created (important for sign-up flow)
       await ensureUserProfile(user);
       toast({
         title: 'Google Sign-Up Successful',
         description: `Welcome, ${user.displayName || user.email}!`,
       });
       router.push('/main');
     } catch (error: any) {
       console.error('Google Sign-Up Error:', error);
       let errorMessage = 'Could not sign up with Google. Please try again.';
       if (error.code === 'auth/popup-closed-by-user') {
         errorMessage = 'Google Sign-Up cancelled.';
       } else if (error.code === 'auth/email-already-in-use') {
          // Although signInWithPopup usually handles this by signing in, good to have a check
          errorMessage = 'This email is already associated with an account. Try logging in.';
       }
       toast({
         title: 'Google Sign-Up Failed',
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
          <CardTitle className="text-2xl font-bold">Register</CardTitle>
          <CardDescription>Create your Campanion account or use Google</CardDescription>
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
                {isLoading ? 'Registering...' : 'Register'}
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
            {/* Google Sign Up Button */}
           <Button
             variant="outline"
             className="w-full"
             onClick={handleGoogleSignUp}
             disabled={isLoading || isGoogleLoading}
           >
             {isGoogleLoading ? (
               <>
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Signing up...
               </>
             ) : (
               <>
                <GoogleIcon /> Sign up with Google
               </>
             )}
           </Button>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline ml-1" prefetch={false}>
            Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
