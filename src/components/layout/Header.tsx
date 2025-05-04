
// src/components/layout/Header.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from '@/components/ui/button'; // Import buttonVariants
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Removed AvatarImage as it wasn't used
import { Tent, LogOut, PlusCircle, Home, Menu, User, CalendarCheck, Shield, LogIn, UserPlus, Compass } from 'lucide-react'; // Added Shield for Admin, LogIn, UserPlus, Compass
import { cn } from '@/lib/utils'; // Import cn if not already imported

// Helper to generate initials for fallback avatar
const getInitials = (email: string | null | undefined) => {
    if (!email) return '??';
    return email.charAt(0).toUpperCase();
};

export default function Header() {
  const { user, isAdmin } = useAuth(); // Get isAdmin status
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


  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-50">
       {/* Always show menu trigger */}
       <Sheet>
           <SheetTrigger asChild>
               <Button variant="ghost" size="icon" className="mr-2">
                   <Menu className="h-6 w-6" />
                   <span className="sr-only">Open Menu</span>
               </Button>
           </SheetTrigger>
           <SheetContent side="left" className="w-[250px] sm:w-[300px] bg-background p-0 flex flex-col">
               <SheetHeader className="p-6 border-b">
                   <SheetTitle>
                       <SheetClose asChild>
                         <Link href={user ? "/main" : "/"} className="flex items-center justify-center sm:justify-start text-foreground" prefetch={false}>
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
                   {!user && (
                      <SheetDescription className="text-muted-foreground pt-2 text-center sm:text-left">
                         Welcome to Campanion!
                     </SheetDescription>
                   )}
               </SheetHeader>
               <div className="flex flex-col space-y-1 p-4 flex-grow">
                  {user ? (
                    <>
                      {/* Logged-in user menu items */}
                      <SheetClose asChild>
                           <Link href="/main" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full" prefetch={false}>
                               <Home className="h-5 w-5" />
                               <span className="text-base font-medium">Main</span>
                           </Link>
                       </SheetClose>
                       <SheetClose asChild>
                           <Link href="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full" prefetch={false}>
                               <User className="h-5 w-5" />
                               <span className="text-base font-medium">Profile</span>
                           </Link>
                       </SheetClose>
                        {/* Conditional Admin Panel Link */}
                        {isAdmin && (
                           <SheetClose asChild>
                               <Link href="/admin" className="flex items-center gap-3 rounded-md px-3 py-2 text-primary transition-colors hover:bg-accent hover:text-primary w-full" prefetch={false}>
                                   <Shield className="h-5 w-5" />
                                   <span className="text-base font-medium">Admin Panel</span>
                               </Link>
                           </SheetClose>
                       )}
                        {/* Conditional Create Camp Link for Admins Only */}
                        {isAdmin && (
                            <SheetClose asChild>
                                <Link href="/camps/new" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full" prefetch={false}>
                                    <PlusCircle className="h-5 w-5" />
                                    <span className="text-base font-medium">Create Camp</span>
                                </Link>
                            </SheetClose>
                        )}
                    </>
                  ) : (
                    <>
                       {/* Logged-out user menu items */}
                       <SheetClose asChild>
                           <Link href="/camps" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full" prefetch={false}>
                               <Compass className="h-5 w-5" />
                               <span className="text-base font-medium">Explore Camps</span>
                           </Link>
                       </SheetClose>
                        <SheetClose asChild>
                           <Link href="/login" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full" prefetch={false}>
                               <LogIn className="h-5 w-5" />
                               <span className="text-base font-medium">Login</span>
                           </Link>
                       </SheetClose>
                       <SheetClose asChild>
                           <Link href="/register" className="flex items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full" prefetch={false}>
                               <UserPlus className="h-5 w-5" />
                               <span className="text-base font-medium">Register</span>
                           </Link>
                       </SheetClose>
                    </>
                  )}
               </div>
               {/* Footer pushed to bottom */}
               <SheetFooter className="p-6 border-t mt-auto">
                  {user && (
                     <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground">
                         <LogOut className="mr-3 h-5 w-5" /> Logout
                     </Button>
                  )}
               </SheetFooter>
           </SheetContent>
       </Sheet>

      <Link href={user ? "/main" : "/"} className="flex items-center justify-center text-foreground" prefetch={false}>
        <Tent className="h-6 w-6 text-primary" />
        <span className="ml-2 text-xl font-semibold">Campanion</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {user ? (
          <>
             {/* Avatar Dropdown Menu */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                       <Avatar className="h-8 w-8 border-2 border-primary">
                         <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                       </Avatar>
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                     <Link href="/profile" className="flex items-center cursor-pointer w-full">
                       <User className="mr-2 h-4 w-4" />
                       <span>Profile</span>
                     </Link>
                  </DropdownMenuItem>
                    {/* Conditional Create Camp Link for Admins Only */}
                    {isAdmin && (
                       <DropdownMenuItem asChild>
                           <Link href="/camps/new" className="flex items-center cursor-pointer w-full">
                             <PlusCircle className="mr-2 h-4 w-4" />
                             <span>Create Camp</span>
                           </Link>
                       </DropdownMenuItem>
                    )}
                  {/* Conditional Admin Panel Link in Dropdown */}
                  {isAdmin && (
                     <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center cursor-pointer w-full text-primary">
                           <Shield className="mr-2 h-4 w-4" />
                           <span>Admin Panel</span>
                        </Link>
                     </DropdownMenuItem>
                  )}
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
            {/* Apply button styles directly to Link components */}
            <Link
              href="/login"
              prefetch={false}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))} // Use cn and buttonVariants
            >
              Login
            </Link>
            <Link
              href="/register"
              prefetch={false}
              className={cn(buttonVariants({ size: 'sm' }))} // Use cn and buttonVariants
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
