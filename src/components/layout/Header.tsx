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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tent, LogOut, PlusCircle, Home, Menu, User } from 'lucide-react';

// Helper to generate initials for fallback avatar
const getInitials = (email: string | null | undefined) => {
    if (!email) return '??';
    return email.charAt(0).toUpperCase();
};

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
             <SheetContent side="left" className="w-[250px] sm:w-[300px] bg-background p-0 flex flex-col"> {/* Removed p-6, use sections for padding */}
                 <SheetHeader className="p-6 border-b"> {/* Added padding here */}
                     <SheetTitle>
                         <SheetClose asChild>
                           <Link href="/dashboard" className="flex items-center justify-center sm:justify-start text-foreground" prefetch={false}>
                               <Tent className="h-6 w-6 text-primary" />
                               <span className="ml-2 text-xl font-semibold">Campanion</span>
                           </Link>
                         </SheetClose>
                     </SheetTitle>
                     {user?.email && (
                       <SheetDescription className="text-muted-foreground pt-2 text-center sm:text-left">
                           Logged in as {user.email}
                       </SheetDescription>
                     )}
                 </SheetHeader>
                 {/* Separator removed, handled by border-b on Header */}
                 <div className="flex flex-col space-y-1 p-4 flex-grow"> {/* Use p-4 for link area, adjust spacing */}
                     <SheetClose asChild>
                         <Button variant="ghost" asChild className="justify-start">
                           <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" prefetch={false}>
                               <Home className="h-5 w-5" />
                               <span className="text-base font-medium">Dashboard</span>
                           </Link>
                         </Button>
                     </SheetClose>
                     <SheetClose asChild>
                         <Button variant="ghost" asChild className="justify-start">
                           <Link href="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" prefetch={false}>
                               <User className="h-5 w-5" />
                               <span className="text-base font-medium">Profile</span>
                           </Link>
                         </Button>
                     </SheetClose>
                     {/* Always show Create Camp if user is logged in */}
                     <SheetClose asChild>
                         <Button variant="ghost" asChild className="justify-start">
                           <Link href="/camps/new" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground" prefetch={false}>
                               <PlusCircle className="h-5 w-5" />
                               <span className="text-base font-medium">Create Camp</span>
                           </Link>
                          </Button>
                     </SheetClose>
                     {/* Add more links here as needed */}
                 </div>
                 {/* Footer pushed to bottom */}
                 <SheetFooter className="p-6 border-t mt-auto"> {/* Added padding here */}
                     {/* Separator removed, handled by border-t */}
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
      <div className="ml-auto flex items-center gap-4"> {/* Adjusted gap */}
        {user ? (
          <>
            {/* Always show Create Camp button if user is logged in */}
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/camps/new" prefetch={false}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Camp
              </Link>
            </Button>

             {/* Avatar Dropdown Menu */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                       <Avatar className="h-8 w-8">
                         {/* Add AvatarImage if user.photoURL is available */}
                         {/* <AvatarImage src={user.photoURL || undefined} alt={user.email || 'User'} /> */}
                         <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                       </Avatar>
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || user.email?.split('@')[0]} {/* Show display name or part of email */}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                     <Link href="/profile" className="flex items-center cursor-pointer">
                       <User className="mr-2 h-4 w-4" />
                       <span>Profile</span>
                     </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          </>
        ) : (
          <>
             {/* Show Login/Register buttons if user is not logged in - Adjust if needed on specific pages */}
              <Button variant="ghost" asChild size="sm"> {/* Added size=sm */}
                  <Link href="/login" prefetch={false}>
                      Login
                  </Link>
              </Button>
              <Button asChild size="sm"> {/* Added size=sm */}
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
