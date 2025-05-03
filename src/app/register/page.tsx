
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Tent } from 'lucide-react';


const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  isOrganizer: z.boolean().default(false),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      isOrganizer: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Store additional user info (like isOrganizer) in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        isOrganizer: values.isOrganizer,
        createdAt: new Date(),
      });

      toast({
        title: 'Registration Successful',
        description: 'Welcome to Campanion!',
      });
      router.push('/dashboard'); // Redirect to dashboard after successful registration
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
       <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 text-foreground hover:text-primary transition-colors" prefetch={false}>
          <Tent className="h-5 w-5" />
          <span className="font-semibold">Campanion</span>
       </Link>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Register</CardTitle>
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
                      <Input placeholder="••••••••" {...field} type="password" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isOrganizer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                     <FormControl>
                       <Checkbox
                         checked={field.value}
                         onCheckedChange={field.onChange}
                         disabled={isLoading}
                       />
                     </FormControl>
                     <div className="space-y-1 leading-none">
                       <FormLabel>
                         I am a camp organizer
                       </FormLabel>
                       <FormDescription>
                         Check this box if you plan to list camps on Campanion.
                       </FormDescription>
                     </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
            </form>
          </Form>
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
