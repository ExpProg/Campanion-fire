
// src/app/admin/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Trash2, Pencil, ShieldCheck, Eye, History, CalendarCheck2, Check, PlusCircle, Users } from 'lucide-react'; // Added Check, PlusCircle, Users icons
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, Timestamp, addDoc } from 'firebase/firestore'; // Added addDoc
import { db } from '@/config/firebase';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components

// Camp Data Interface
interface Camp {
  id: string;
  name: string;
  description: string;
  dates: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  location: string;
  imageUrl: string;
  price: number;
  organizerId?: string;
  organizerEmail?: string;
  createdAt?: Timestamp;
  activities?: string[];
}

// Organizer Data Interface
interface Organizer {
    id: string;
    name: string;
    link: string;
    description: string;
    avatarUrl: string;
    createdAt: Timestamp;
}

// Zod schema for Organizer creation
const organizerSchema = z.object({
  name: z.string().min(2, { message: "Organizer name must be at least 2 characters." }),
  link: z.string().url({ message: "Please enter a valid URL for the organizer link." }).optional().or(z.literal('')),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL for the avatar image." }).optional().or(z.literal('')),
});

type OrganizerFormValues = z.infer<typeof organizerSchema>;

// Define the possible filter values
type CampStatusFilter = 'all' | 'active' | 'past';

// Helper function to determine camp status
const getCampStatus = (camp: Camp): 'Active' | 'Past' => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to the beginning of today for comparison
  const endDate = camp.endDate?.toDate();
  return endDate && endDate >= today ? 'Active' : 'Past';
};


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
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                 <Skeleton className="h-8 w-40 mb-8" /> {/* Back link placeholder */}
                 <Card className="mb-12">
                     <CardHeader>
                         <Skeleton className="h-8 w-1/2 mb-2" />
                         <Skeleton className="h-4 w-3/4" />
                     </CardHeader>
                     <CardContent>
                        <Skeleton className="h-6 w-full max-w-md" />
                        <Skeleton className="h-16 w-full mt-6" />
                     </CardContent>
                 </Card>
                 {/* Organizer Management Skeleton */}
                 <div className="mb-10">
                    <Skeleton className="h-8 w-56 mb-4" /> {/* Section title */}
                    <Skeleton className="h-10 w-36 mb-6" /> {/* Add Organizer Button */}
                    <AdminOrganizerListSkeleton count={2}/>
                 </div>
                 <Separator className="my-12" />
                 {/* Camps List Skeleton */}
                 <div className="mb-10">
                    <Skeleton className="h-8 w-48 mb-4" /> {/* Section title */}
                    <div className="flex space-x-4 mb-6"> {/* Filter Skeleton */}
                       <Skeleton className="h-6 w-16" />
                       <Skeleton className="h-6 w-16" />
                       <Skeleton className="h-6 w-16" />
                    </div>
                    <AdminCampListSkeleton count={3} />
                 </div>
            </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t">
            <Skeleton className="h-4 w-1/4" />
        </footer>
    </div>
);

// Reusable Camp List Item Component for Admin Panel
const AdminCampListItem = ({ camp, isOwner, onDeleteClick, deletingCampId, status }: {
    camp: Camp;
    isOwner: boolean;
    onDeleteClick: (campId: string) => void;
    deletingCampId: string | null;
    status: 'Active' | 'Past';
}) => {

    const badgeClasses = cn(
        'flex-shrink-0 transition-colors pointer-events-none',
        {
            'bg-[#FFD54F] text-yellow-950 dark:bg-[#FFD54F] dark:text-yellow-950 border-transparent': status === 'Active',
            '': status === 'Past'
        }
    );

    const badgeVariant = status === 'Past' ? 'default' : undefined;

    return (
      <div key={camp.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
         {/* Basic Camp Info */}
         <div className="flex-1 min-w-0 mr-4">
             <div className="flex items-center gap-2 mb-1">
                 <p className="font-semibold truncate">{camp.name}</p>
                 <Badge variant={badgeVariant} className={badgeClasses}>
                    {status === 'Active' ? <CalendarCheck2 className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    {status}
                 </Badge>
             </div>
             <p className="text-sm text-muted-foreground truncate">{camp.location} | {camp.dates}</p>
             <p className="text-sm text-primary font-medium">{camp.price} ₽</p>
         </div>

         {/* Action Buttons */}
         <div className="flex gap-2 items-center flex-shrink-0">
              <Button size="sm" asChild variant="ghost" aria-label={`View ${camp.name}`}>
                <Link href={`/camps/${camp.id}`} prefetch={false}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                </Link>
              </Button>
              {isOwner && (
                  <>
                      <Button size="sm" asChild variant="ghost" aria-label={`Edit ${camp.name}`}>
                           <Link href={`/camps/${camp.id}/edit`} prefetch={false}>
                               <Pencil className="h-4 w-4" />
                               <span className="sr-only">Edit</span>
                           </Link>
                      </Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingCampId === camp.id} aria-label={`Delete ${camp.name}`}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the camp "{camp.name}".
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteClick(camp.id)} className="bg-destructive hover:bg-destructive/90">Delete Camp</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </>
              )}
          </div>
      </div>
    );
};


// Skeleton for the Camp List
const AdminCampListSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="border rounded-md">
        {[...Array(count)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 border-b last:border-b-0">
                <div className="flex-1 min-w-0 mr-4 space-y-1">
                     <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-16" /> {/* Badge placeholder */}
                     </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        ))}
    </div>
);

// Skeleton for Organizer List
const AdminOrganizerListSkeleton = ({ count = 2 }: { count?: number }) => (
    <div className="border rounded-md">
        {[...Array(count)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 border-b last:border-b-0">
                 <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
                 <div className="flex gap-2 items-center flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        ))}
    </div>
);

// Reusable Organizer List Item Component
const AdminOrganizerListItem = ({ organizer, onDeleteClick }: { // Simplified for now, add edit later if needed
    organizer: Organizer;
    onDeleteClick: (organizerId: string) => void; // Placeholder for delete functionality
}) => {
     const handleDelete = () => {
        // Implement confirmation dialog before actual deletion
        console.warn("Delete functionality not fully implemented yet for organizer:", organizer.id);
        // onDeleteClick(organizer.id);
     };

    return (
        <div key={organizer.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
            {/* Organizer Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={organizer.avatarUrl || undefined} alt={organizer.name} />
                    <AvatarFallback>{organizer.name?.charAt(0).toUpperCase() || 'O'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold truncate">{organizer.name}</p>
                    {organizer.link && (
                        <a href={organizer.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                            {organizer.link}
                        </a>
                    )}
                    <p className="text-sm text-muted-foreground truncate mt-1">{organizer.description}</p>
                </div>
            </div>

            {/* Action Buttons (Placeholder for Delete/Edit) */}
            <div className="flex gap-2 items-center flex-shrink-0">
                 {/* <Button size="icon" variant="ghost" aria-label={`Edit ${organizer.name}`} disabled>
                     <Pencil className="h-4 w-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} aria-label={`Delete ${organizer.name}`} disabled>
                     <Trash2 className="h-4 w-4" />
                 </Button> */}
                 <span className="text-xs text-muted-foreground italic">(Actions coming soon)</span>
             </div>
        </div>
    );
};

// Organizer Creation Form Component (inside Dialog)
const CreateOrganizerForm = ({ setOpen, refreshOrganizers }: { setOpen: (open: boolean) => void; refreshOrganizers: () => void }) => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<OrganizerFormValues>({
        resolver: zodResolver(organizerSchema),
        defaultValues: {
            name: '',
            link: '',
            description: '',
            avatarUrl: '',
        },
    });

    const onSubmit = async (values: OrganizerFormValues) => {
        setIsSaving(true);
        try {
            const organizerData = {
                ...values,
                avatarUrl: values.avatarUrl || `https://avatar.vercel.sh/${values.name.replace(/\s+/g, '-')}.png`, // Default avatar
                createdAt: Timestamp.now(),
            };
            await addDoc(collection(db, 'organizers'), organizerData);
            toast({ title: 'Organizer Created', description: `Organizer "${values.name}" added.` });
            setOpen(false); // Close dialog on success
            refreshOrganizers(); // Refresh the list
        } catch (error) {
            console.error("Error adding organizer:", error);
            toast({ title: 'Creation Failed', description: 'Could not create the organizer.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Organizer Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Camp Awesome Inc." {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Website Link (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://campawesome.com" {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe the organizer..." {...field} disabled={isSaving} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="avatarUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Avatar URL (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/logo.png" {...field} disabled={isSaving} />
                            </FormControl>
                            <FormDescription>If blank, a default avatar will be generated.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter className="mt-6">
                     <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
                     </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Create Organizer'}
                    </Button>
                 </DialogFooter>
            </form>
        </Form>
    );
};


export default function AdminPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [allAdminCamps, setAllAdminCamps] = useState<Camp[]>([]);
    const [campsLoading, setCampsLoading] = useState(true);
    const [deletingCampId, setDeletingCampId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<CampStatusFilter>('all');
    const [organizers, setOrganizers] = useState<Organizer[]>([]);
    const [organizersLoading, setOrganizersLoading] = useState(true);
    const [isCreateOrganizerOpen, setIsCreateOrganizerOpen] = useState(false);


    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/main');
        }
    }, [user, isAdmin, authLoading, router]);

    // Fetch admin's created camps & organizers
    useEffect(() => {
        if (isAdmin && user) {
            fetchAdminCamps(user.uid);
            fetchOrganizers();
        } else {
            setCampsLoading(false);
            setAllAdminCamps([]);
            setOrganizersLoading(false);
            setOrganizers([]);
        }
    }, [isAdmin, user]);

    // Function to fetch admin's created Firestore camps
    const fetchAdminCamps = async (adminId: string) => {
        setCampsLoading(true);
        try {
            const campsCollectionRef = collection(db, 'camps');
            const querySnapshot = await getDocs(campsCollectionRef);
            const fetchedCamps = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as Omit<Camp, 'id'>
            }))
            .filter(camp => camp.organizerId === adminId);
            setAllAdminCamps(fetchedCamps);
        } catch (error) {
            console.error("Error fetching admin's created camps:", error);
            toast({ title: 'Error', description: 'Could not load camps.', variant: 'destructive' });
        } finally {
            setCampsLoading(false);
        }
    };

    // Function to fetch organizers
    const fetchOrganizers = async () => {
        setOrganizersLoading(true);
        try {
            const organizersCollectionRef = collection(db, 'organizers');
            const querySnapshot = await getDocs(organizersCollectionRef);
            const fetchedOrganizers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data() as Omit<Organizer, 'id'>
            })).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()); // Sort by creation date desc
            setOrganizers(fetchedOrganizers);
        } catch (error) {
            console.error("Error fetching organizers:", error);
            toast({ title: 'Error', description: 'Could not load organizers.', variant: 'destructive' });
        } finally {
            setOrganizersLoading(false);
        }
    };


    // Filter and sort camps based on the selected status and desired order
    const filteredAndSortedCamps = useMemo(() => {
        const sortedCamps = [...allAdminCamps].sort((a, b) => {
            const statusA = getCampStatus(a);
            const statusB = getCampStatus(b);
            if (statusA === 'Active' && statusB === 'Past') return -1;
            if (statusA === 'Past' && statusB === 'Active') return 1;
            const dateA = a.createdAt?.toDate() ?? new Date(0);
            const dateB = b.createdAt?.toDate() ?? new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        if (filterStatus === 'all') return sortedCamps;
        return sortedCamps.filter(camp => (filterStatus === 'active' ? getCampStatus(camp) === 'Active' : getCampStatus(camp) === 'Past'));
    }, [allAdminCamps, filterStatus]);


    // Function to handle camp deletion
    const handleDeleteCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return;
        const campToDelete = allAdminCamps.find(camp => camp.id === campId);
        if (!campToDelete || campToDelete.organizerId !== user.uid) {
           toast({ title: 'Permission Denied', description: 'Cannot delete this camp.', variant: 'destructive' });
           return;
        }
        setDeletingCampId(campId);
        try {
            await deleteDoc(doc(db, 'camps', campId));
            setAllAdminCamps(prev => prev.filter(camp => camp.id !== campId));
            toast({ title: 'Camp Deleted', description: 'The camp has been successfully removed.' });
        } catch (error) {
            console.error("Error deleting camp:", error);
            toast({ title: 'Deletion Failed', description: 'Could not delete the camp.', variant: 'destructive' });
        } finally {
            setDeletingCampId(null);
        }
    };

    // Placeholder for organizer deletion
    const handleDeleteOrganizer = async (organizerId: string) => {
        console.warn(`Attempting to delete organizer ${organizerId} - NOT IMPLEMENTED`);
        // Add deletion logic here with confirmation
    };


    if (authLoading || (!user && !authLoading) ) {
        return <AdminPageSkeleton />;
    }

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


    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                    <Link href="/main" className="inline-flex items-center text-primary hover:underline mb-8" prefetch={false}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Main
                    </Link>
                    <Card className="shadow-lg mb-12">
                        <CardHeader>
                             <div className="flex items-center gap-2">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                                <CardTitle className="text-2xl md:text-3xl font-bold">Administrator Panel</CardTitle>
                             </div>
                            <CardDescription>Manage users, organizers, camps, and site settings.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Welcome, Admin ({user.email})!</p>
                            {/* Placeholder for user management */}
                            <div className="mt-6 border p-4 rounded-md bg-muted/50">
                                <h3 className="font-semibold mb-2">Placeholder: User Management</h3>
                                <p className="text-sm text-muted-foreground">User management tools will be added here.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Organizer Management Section */}
                    <div className="mb-12">
                         <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="h-6 w-6" /> Organizer Management
                             </h2>
                              <Dialog open={isCreateOrganizerOpen} onOpenChange={setIsCreateOrganizerOpen}>
                                  <DialogTrigger asChild>
                                      <Button>
                                          <PlusCircle className="mr-2 h-4 w-4" /> Add Organizer
                                      </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[425px]">
                                      <DialogHeader>
                                          <DialogTitle>Create New Organizer</DialogTitle>
                                          <DialogDescription>
                                              Fill in the details for the new organizer.
                                          </DialogDescription>
                                      </DialogHeader>
                                      <CreateOrganizerForm setOpen={setIsCreateOrganizerOpen} refreshOrganizers={fetchOrganizers} />
                                      {/* Footer is now inside the form */}
                                  </DialogContent>
                              </Dialog>
                         </div>

                         {organizersLoading ? (
                            <AdminOrganizerListSkeleton count={2}/>
                         ) : organizers.length > 0 ? (
                            <div className="border rounded-md">
                                {organizers.map((org) => (
                                    <AdminOrganizerListItem
                                        key={org.id}
                                        organizer={org}
                                        onDeleteClick={handleDeleteOrganizer}
                                    />
                                ))}
                            </div>
                         ) : (
                             <Card className="text-center py-12 border-dashed">
                                 <CardContent>
                                     <p className="text-muted-foreground">No organizers found.</p>
                                 </CardContent>
                             </Card>
                         )}
                    </div>

                    <Separator className="my-12"/>

                     {/* Section for Admin's Created Camps with Filtering */}
                    <div className="mb-10">
                         <h2 className="text-2xl font-bold mb-4">My Created Camps</h2>

                         {/* Filter Controls */}
                         <RadioGroup
                            defaultValue="all"
                            onValueChange={(value) => setFilterStatus(value as CampStatusFilter)}
                            className="flex space-x-4 mb-6"
                         >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="r-all" />
                                <Label htmlFor="r-all">All</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="active" id="r-active" />
                                <Label htmlFor="r-active">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="past" id="r-past" />
                                <Label htmlFor="r-past">Past</Label>
                            </div>
                         </RadioGroup>

                         {/* Camp List */}
                         {campsLoading ? (
                            <AdminCampListSkeleton count={3} />
                         ) : filteredAndSortedCamps.length > 0 ? (
                            <div className="border rounded-md">
                                {filteredAndSortedCamps.map((camp) => (
                                    <AdminCampListItem
                                        key={camp.id}
                                        camp={camp}
                                        isOwner={true}
                                        onDeleteClick={handleDeleteCamp}
                                        deletingCampId={deletingCampId}
                                        status={getCampStatus(camp)}
                                    />
                                ))}
                            </div>
                         ) : (
                             <Card className="text-center py-12 border-dashed">
                                 <CardContent>
                                     <p className="text-muted-foreground">
                                        {filterStatus === 'all' ? "You haven't created any camps yet." :
                                         filterStatus === 'active' ? "No active camps found." :
                                         "No past camps found."}
                                     </p>
                                     {filterStatus === 'all' && allAdminCamps.length === 0 && (
                                         <Button asChild className="mt-4">
                                             <Link href="/camps/new">Create Your First Camp</Link>
                                         </Button>
                                     )}
                                 </CardContent>
                             </Card>
                         )}
                    </div>
                </div>
            </main>
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
            </footer>
        </div>
    );
}
