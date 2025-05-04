
// src/app/admin/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Skeleton for the admin page while loading/checking auth
const AdminPageSkeleton = () => (
    <div className="flex flex-col min-h-screen">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
            <Skeleton className="h-6 w-6 mr-2" />
            <Skeleton className="h-6 w-32" />
            <div className="ml-auto flex gap-4 sm:gap-6 items-center">
                <Skeleton className="h-8 w-20" />
            </div>
        </header>
        <main className="flex-1 p-4 md:p-8 lg:p-12">
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                 <Skeleton className="h-8 w-40 mb-8" /> {/* Back link placeholder */}
                 <Card>
                     <CardHeader>
                         <Skeleton className="h-8 w-1/2 mb-2" />
                         <Skeleton className="h-4 w-3/4" />
                     </CardHeader>
                     <CardContent>
                         <Skeleton className="h-10 w-full mb-4" />
                         <Skeleton className="h-20 w-full mb-4" />
                     </CardContent>
                 </Card>
            </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t">
            <Skeleton className="h-4 w-1/4" />
        </footer>
    </div>
);

export default function AdminPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If auth is done loading and either user is not logged in or is not an admin, redirect
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/main'); // Redirect non-admins or logged-out users to the main page
        }
    }, [user, isAdmin, authLoading, router]);

    // Show skeleton while loading auth or if user is null but loading isn't finished
    if (authLoading || !user) {
        return <AdminPageSkeleton />;
    }

    // If user is loaded but not admin (this case should be handled by useEffect redirect, but added as safeguard)
    if (!isAdmin) {
       return (
            <div className="flex flex-col min-h-screen">
                 <Header />
                 <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                     <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                     <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                     <p className="text-muted-foreground mb-6">You do not have permission to view this page.</p>
                     <Link href="/main" className="inline-flex items-center text-primary hover:underline" prefetch={false}>
                         <ArrowLeft className="mr-2 h-4 w-4" />
                         Return to Main Page
                     </Link>
                 </main>
                 <footer className="py-6 px-4 md:px-6 border-t">
                    <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
                 </footer>
            </div>
       );
    }


    // Render admin content if user is admin
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                    <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-8" prefetch={false}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Main
                    </Link>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl md:text-3xl font-bold">Administrator Panel</CardTitle>
                            <CardDescription>Manage users, camps, and site settings.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Welcome, Admin!</p>
                            {/* Add Admin-specific components and functionality here */}
                            {/* Example: User management table, camp approval queue, etc. */}
                             <div className="mt-6 border p-4 rounded-md">
                                <h3 className="font-semibold mb-2">Placeholder Section</h3>
                                <p className="text-sm text-muted-foreground">Admin tools will be added here.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
            </footer>
        </div>
    );
}
