
// src/components/layout/Header.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tent, LogOut, PlusCircle, Home, Menu, User } from 'lucide-react';

export default function Header() {
  const { user } = useAuth(); // Removed profile
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to landing page after logout
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

  // Removed userIsOrganizer variable

  // Don't render header if user data is not yet available (or during initial load)
  // This prevents flashing of incorrect states
  // if (loading) {
  //   return null; // Or a skeleton header
  // }

  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-50">
      {user && ( // Only show menu trigger if user is logged in
         <Sheet>
             <SheetTrigger asChild>
                 <Button variant="ghost" size="icon" className="mr-2">
                     <Menu className="h-6 w-6" />
                     <span className="sr-only">Open Menu</span>
                 </Button>
             </SheetTrigger>
             <SheetContent side="left" className="w-[250px] sm:w-[300px] bg-background p-6 flex flex-col"> {/* Added flex flex-col */}
                 <SheetHeader className="mb-6">
                     <SheetTitle>
                         <Link href="/dashboard" className="flex items-center justify-center sm:justify-start text-foreground" prefetch={false}>
                             <Tent className="h-6 w-6 text-primary" />
                             <span className="ml-2 text-xl font-semibold">Campanion</span>
                         </Link>
                     </SheetTitle>
                     {user?.email && (
                       <SheetDescription className="text-muted-foreground">
                           {/* Removed welcome message from here */}
                           {/* Welcome, {user.email} */}
                       </SheetDescription>
                     )}
                 </SheetHeader>
                 <Separator className="mb-6" />
                 <div className="flex flex-col space-y-3 flex-grow"> {/* Added flex-grow */}
                     <SheetClose asChild>
                         <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" prefetch={false}>
                             <Home className="h-5 w-5" />
                             <span className="text-base font-medium">Dashboard</span>
                         </Link>
                     </SheetClose>
                     <SheetClose asChild>
                         <Link href="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" prefetch={false}>
                             <User className="h-5 w-5" />
                             <span className="text-base font-medium">Profile</span>
                         </Link>
                     </SheetClose>
                     {/* Always show Create Camp if user is logged in */}
                     <SheetClose asChild>
                         <Link href="/camps/new" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" prefetch={false}>
                             <PlusCircle className="h-5 w-5" />
                             <span className="text-base font-medium">Create Camp</span>
                         </Link>
                     </SheetClose>
                     {/* Add more links here as needed */}
                 </div>
                 {/* Footer pushed to bottom */}
                 <SheetFooter className="mt-auto pt-6"> {/* Added mt-auto and pt-6 */}
                     <Separator className="mb-4" />
                     <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground">
                         <LogOut className="mr-3 h-5 w-5" /> Logout
                     </Button>
                 </SheetFooter>
             </SheetContent>
         </Sheet>
       )}
      <Link href={user ? "/dashboard" : "/"} className="flex items-center justify-center text-foreground" prefetch={false}>
        <Tent className="h-6 w-6 text-primary" />
        <span className="ml-2 text-xl font-semibold">Campanion</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {user ? (
          <>
            {/* Always show Create Camp button if user is logged in */}
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/camps/new" prefetch={false}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Camp
              </Link>
            </Button>
             {/* Removed the welcome span */}
            <Button variant="ghost" onClick={handleLogout} size="sm" className="hidden sm:inline-flex text-foreground hover:bg-accent hover:text-accent-foreground">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </>
        ) : (
          <>
             {/* Show Login/Register buttons if user is not logged in - Adjust if needed on specific pages */}
              <Button variant="ghost" asChild>
                  <Link href="/login" prefetch={false}>
                      Login
                  </Link>
              </Button>
              <Button asChild>
                  <Link href="/register" prefetch={false}>
                      Register
                  </Link>
              </Button>
          </>
        )}
      </div>
    </header>
  );
}

