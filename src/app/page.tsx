
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MountainSnow, Tent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    // Optionally show a loading spinner or skeleton screen
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // If user is logged in, this page shouldn't be visible due to the redirect above.
  // But as a fallback, render nothing or redirect again.
  if (user) {
    return null;
  }


  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Tent className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-semibold">Campanion</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
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
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center items-center">
          <div className="container px-4 md:px-6 text-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-foreground">
                Find Your Next Adventure
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Campanion helps you discover and book the best camps tailored to your interests. Explore nature, learn new skills, and make unforgettable memories.
              </p>
              <div className="space-x-4">
                <Button size="lg" asChild>
                  <Link href="/register" prefetch={false}>
                    Get Started
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                   <Link href="#features" prefetch={false}> {/* Assuming a features section might be added later */}
                     Learn More
                   </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Placeholder for potential future sections like Features, Testimonials etc. */}
        {/* <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">...</section> */}

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
