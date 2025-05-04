

'use client';

import React, { useEffect } from 'react'; // Removed useState as camps are no longer fetched here
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tent } from 'lucide-react'; // Removed unused icons: Search, ListChecks, Sparkles, Building
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
// Removed unused Card components and Firestore imports

// Removed Camp interface and CampCard/SkeletonCampCard components as they are no longer needed here

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Removed unused toast import and state related to camps
  // const { toast } = useToast();
  // const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]);
  // const [campsLoading, setCampsLoading] = useState(true);

  useEffect(() => {
    // Redirect if user is logged in
    if (!loading && user) {
      router.push('/main');
    }
  }, [user, loading, router]);

   // Removed useEffect related to fetching camps for landing page

  // Show loading skeleton if auth is loading
  if (loading) {
     return (
         <div className="flex flex-col min-h-screen">
             {/* Header Skeleton */}
             <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
                 <Skeleton className="h-6 w-6 mr-2" />
                 <Skeleton className="h-6 w-32" />
                 <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                     <Skeleton className="h-8 w-20" />
                     <Skeleton className="h-8 w-24" />
                 </div>
             </header>
             {/* Landing Content Skeleton */}
             <main className="flex-1">
                {/* Hero Skeleton */}
                 <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center items-center">
                     <div className="container px-4 md:px-6 text-center space-y-6">
                         <Skeleton className="h-12 w-3/4 mx-auto" />
                         <Skeleton className="h-6 w-full max-w-[700px] mx-auto" />
                         <Skeleton className="h-6 w-11/12 max-w-[650px] mx-auto" />
                         <div className="flex justify-center space-x-4">
                             <Skeleton className="h-12 w-32" />
                             <Skeleton className="h-12 w-32" />
                         </div>
                     </div>
                 </section>
                 {/* Removed Camps List Skeleton */}
             </main>
             {/* Footer Skeleton */}
             <footer className="py-6 px-4 md:px-6 border-t">
                 <Skeleton className="h-4 w-1/4" />
             </footer>
         </div>
     );
  }

  // If user is logged in, this page shouldn't be visible due to the redirect above.
  // But as a fallback, render nothing or redirect again.
  if (user) {
    return null;
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header /> {/* Use the reusable Header component */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center items-center bg-gradient-to-b from-background to-muted/50">
          <div className="container px-4 md:px-6 text-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-foreground">
                Find Your Next Adventure
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Campanion helps you discover and book the best camps tailored to your interests. Explore nature, learn new skills, and make unforgettable memories.
              </p>
              <div className="space-x-4">
                 <Link
                    href="/register"
                    prefetch={false}
                    className={cn(buttonVariants({ size: 'lg' }))}
                 >
                    Get Started
                 </Link>
                 {/* Updated Explore Camps button link to /camps */}
                 <Link
                     href="/camps" // Link to the new public camps listing page
                     prefetch={false}
                     className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
                 >
                     Explore Camps
                 </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Removed Available Camps Section */}

      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
