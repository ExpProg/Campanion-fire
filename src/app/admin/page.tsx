
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
import { ShieldAlert, ArrowLeft, Trash2, Pencil, ShieldCheck, Eye, CalendarCheck2, Check, PlusCircle, Users, FileText, Archive, AlertTriangle, CalendarClock, ArchiveRestore, Copy, List } from 'lucide-react'; // Added List icon
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, Timestamp, addDoc, updateDoc, writeBatch } from 'firebase/firestore'; // Added addDoc, deleteDoc, updateDoc, writeBatch
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

// Camp Data Interface including status
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
  organizerId?: string; // Link to the organizers collection
  organizerName?: string; // Denormalized organizer name
  organizerLink?: string; // Denormalized organizer link
  creatorId: string; // ID of the admin who created the camp
  creationMode: 'admin' | 'user'; // Added creationMode
  status: 'draft' | 'active' | 'archive'; // Added 'archive' status
  organizerEmail?: string; // May no longer be relevant
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

// Zod schema for Organizer creation/editing
const organizerSchema = z.object({
  name: z.string().min(2, { message: "Organizer name must be at least 2 characters." }),
  link: z.string().url({ message: "Please enter a valid URL for the organizer link." }).optional().or(z.literal('')),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  avatarUrl: z.string().url({ message: "Please enter a valid URL for the avatar image." }).optional().or(z.literal('')),
});

type OrganizerFormValues = z.infer<typeof organizerSchema>;

// Define the possible filter values excluding 'past'
type CampStatusFilter = 'all' | 'active' | 'draft' | 'archive';

// Define the possible detailed camp statuses excluding 'Past'
type DetailedCampStatus = 'Active' | 'Draft' | 'Archived';

// Helper function to determine camp status excluding 'Past'
const getCampStatus = (camp: Camp): DetailedCampStatus => {
  if (camp.status === 'draft') {
    return 'Draft';
  }
  if (camp.status === 'archive') {
    return 'Archived';
  }
  // If status is 'active', it's 'Active' (regardless of date for this context)
  if (camp.status === 'active') {
      return 'Active';
  }
  // Fallback for any other unexpected scenario
  return 'Draft'; // Default to Draft if status is somehow invalid
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
                 {/* Administrator Panel Title Skeleton */}
                 <div className="flex items-center gap-2 mb-4"> {/* Changed mb-8 to mb-4 to match actual implementation */}
                    <Skeleton className="h-8 w-8" /> {/* Icon skeleton */}
                    <Skeleton className="h-8 w-1/2" /> {/* Title skeleton */}
                 </div>
                 {/* Changed p to div to avoid hydration error */}
                 <div className="text-muted-foreground mb-12"><Skeleton className="h-4 w-1/3" /></div> {/* Welcome message skeleton */}


                 {/* Organizer Management Skeleton */}
                 <div className="mb-10">
                    <Skeleton className="h-8 w-56 mb-4" /> {/* Section title */}
                    <Skeleton className="h-10 w-36 mb-6" /> {/* Add Organizer Button */}
                    <AdminOrganizerListSkeleton count={2}/>
                 </div>
                 <Separator className="my-12" />


                 {/* Camps List Skeleton */}
                 <div className="mb-10">
                    <div className="flex justify-between items-center mb-4"> {/* Flex container for title and button */}
                       <Skeleton className="h-8 w-48" /> {/* Section title */}
                       <Skeleton className="h-10 w-40" /> {/* Create Camp Button Placeholder */}
                    </div>
                    <div className="flex space-x-4 mb-6"> {/* Filter Skeleton */}
                       <Skeleton className="h-6 w-16" />
                       <Skeleton className="h-6 w-16" />
                       <Skeleton className="h-6 w-16" />
                       <Skeleton className="h-6 w-16" /> {/* Removed Past filter skeleton */}
                    </div>
                    <AdminCampListSkeleton count={3} />
                    <Skeleton className="h-10 w-32 mt-4" /> {/* View All Button Skeleton */}
                 </div>
                 <Separator className="my-12" />

                 {/* Problematic Dates Section Skeleton */}
                 <div className="mb-10">
                    <Skeleton className="h-8 w-64 mb-4" /> {/* Section title */}
                    <Skeleton className="h-10 w-48 mb-4" /> {/* Button skeleton */}
                    <AdminCampListSkeleton count={1} />
                 </div>
            </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t">
            <Skeleton className="h-4 w-1/4" />
        </footer>
    </div>
);

// Reusable Camp List Item Component for Admin Panel
const AdminCampListItem = ({ camp, isCreator, onDeleteClick, onCopyClick, deletingCampId, isCopyingCampId, status, highlight }: {
    camp: Camp;
    isCreator: boolean; // Check if the logged-in user is the creator
    onDeleteClick: (campId: string) => void;
    onCopyClick: (campId: string) => void; // Added copy handler prop
    deletingCampId: string | null;
    isCopyingCampId: string | null; // Added copying state prop
    status: DetailedCampStatus; // Use DetailedCampStatus
    highlight?: boolean; // Optional flag for highlighting specific camps (e.g., started)
}) => {

    const badgeClasses = cn(
        'flex-shrink-0 transition-colors pointer-events-none',
        {
            'bg-[#FFD54F] text-yellow-950 dark:bg-[#FFD54F] dark:text-yellow-950 border-transparent': status === 'Active',
            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-transparent': status === 'Draft', // Draft color
            'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-transparent': status === 'Archived', // Archive color
        }
    );

    const badgeVariant = undefined;
    const formattedPrice = camp.price.toLocaleString('ru-RU'); // Format price with spaces

    // Choose icon based on status
    const StatusIcon = status === 'Active' ? CalendarCheck2
                     : status === 'Draft' ? FileText
                     : Archive; // Icon for Archived

    const formattedStartDate = camp.startDate ? camp.startDate.toDate().toLocaleDateString() : 'N/A';
    const formattedEndDate = camp.endDate ? camp.endDate.toDate().toLocaleDateString() : 'N/A';

    return (
      <div key={camp.id} className={cn(
          "flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors",
          highlight && "bg-yellow-50 border-yellow-200 hover:bg-yellow-100/80 dark:bg-yellow-900/20 dark:border-yellow-800/50 dark:hover:bg-yellow-900/30" // Highlight style for specific conditions
      )}>
         {/* Camp Image */}
          <div className="relative w-20 h-16 sm:w-24 sm:h-20 rounded-md overflow-hidden mr-4 flex-shrink-0">
            <Image
              src={camp.imageUrl || 'https://picsum.photos/seed/placeholder/200/150'}
              alt={camp.name}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 640px) 80px, 96px"
              data-ai-hint="camp event"
            />
          </div>
         {/* Basic Camp Info */}
         <div className="flex-1 min-w-0 mr-4">
             <div className="flex items-center gap-2 mb-1">
                 {highlight && <CalendarClock className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />}
                 <p className={cn("font-semibold truncate text-sm", highlight && "text-yellow-800 dark:text-yellow-300")}>{camp.name}</p> {/* Reduced font size for name */}
                 <Badge variant={badgeVariant} className={badgeClasses}>
                     <StatusIcon className="h-3 w-3 mr-1" />
                    {status}
                 </Badge>
             </div>
             <p className="text-sm text-muted-foreground truncate">{camp.location} | {formattedStartDate} - {formattedEndDate}</p>
             <p className="text-xs text-primary font-medium">{formattedPrice} ₽</p> {/* Reduced font size for price */}
             {highlight && camp.startDate && (
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Start date ({formattedStartDate}) is in the past or today.
                </p>
             )}
         </div>

         {/* Action Buttons */}
         <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
              <Button size="sm" asChild variant="ghost" aria-label={`View ${camp.name}`}>
                <Link href={`/camps/${camp.id}`} prefetch={false}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                </Link>
              </Button>
              {isCreator && ( // Check if the logged-in user is the creator
                  <>
                      <Button size="sm" asChild variant="ghost" aria-label={`Edit ${camp.name}`}>
                           <Link href={`/camps/${camp.id}/edit`} prefetch={false}>
                               <Pencil className="h-4 w-4" />
                               <span className="sr-only">Edit</span>
                           </Link>
                      </Button>
                       {/* Copy Button */}
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => onCopyClick(camp.id)}
                         disabled={isCopyingCampId === camp.id}
                         aria-label={`Copy ${camp.name}`}
                       >
                           <Copy className="h-4 w-4" />
                           <span className="sr-only">Copy</span>
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
                <Skeleton className="relative w-20 h-16 sm:w-24 sm:h-20 rounded-md mr-4 flex-shrink-0" /> {/* Image Skeleton */}
                <div className="flex-1 min-w-0 mr-4 space-y-1">
                     <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-16" /> {/* Badge placeholder */}
                     </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* View */}
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Edit */}
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Copy */}
                    <Skeleton className="h-8 w-8 rounded-md" /> {/* Delete */}
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
const AdminOrganizerListItem = ({ organizer, onEditClick, onDeleteClick, deletingOrganizerId }: {
    organizer: Organizer;
    onEditClick: (organizer: Organizer) => void; // Pass full organizer for editing
    onDeleteClick: (organizerId: string) => void;
    deletingOrganizerId: string | null;
}) => {
     // Placeholder for edit functionality - opens a dialog/modal
     const handleEdit = () => {
         onEditClick(organizer); // Pass the organizer data to the handler
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

            {/* Action Buttons */}
            <div className="flex gap-2 items-center flex-shrink-0">
                 <Button size="icon" variant="ghost" onClick={handleEdit} aria-label={`Edit ${organizer.name}`}>
                     <Pencil className="h-4 w-4" />
                     <span className="sr-only">Edit</span>
                 </Button>
                 <AlertDialog>
                     <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingOrganizerId === organizer.id} aria-label={`Delete ${organizer.name}`}>
                             <Trash2 className="h-4 w-4" />
                             <span className="sr-only">Delete</span>
                         </Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                         <AlertDialogHeader>
                             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                             <AlertDialogDescription>
                                 This action cannot be undone. This will permanently delete the organizer "{organizer.name}".
                             </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <AlertDialogAction onClick={() => onDeleteClick(organizer.id)} className="bg-destructive hover:bg-destructive/90">Delete Organizer</AlertDialogAction>
                         </AlertDialogFooter>
                     </AlertDialogContent>
                 </AlertDialog>
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

// Organizer Edit Form Component (Inside a Dialog) - IMPLEMENTED
const EditOrganizerForm = ({ organizer, setOpen, refreshOrganizers }: {
    organizer: Organizer | null; // Organizer to edit, or null if not editing
    setOpen: (open: boolean) => void;
    refreshOrganizers: () => void;
}) => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<OrganizerFormValues>({
        resolver: zodResolver(organizerSchema),
        defaultValues: { // Populate with organizer data when available
            name: organizer?.name || '',
            link: organizer?.link || '',
            description: organizer?.description || '',
            avatarUrl: organizer?.avatarUrl || '',
        },
    });

    // Reset form when organizer data changes (e.g., when dialog opens with new data)
    useEffect(() => {
        if (organizer) {
            form.reset({
                name: organizer.name,
                link: organizer.link || '', // Ensure optional fields are handled correctly
                description: organizer.description,
                avatarUrl: organizer.avatarUrl || '',
            });
        } else {
            form.reset({ // Reset to defaults if no organizer (e.g., dialog closed)
                name: '', link: '', description: '', avatarUrl: ''
            });
        }
    }, [organizer, form]);

    const onSubmit = async (values: OrganizerFormValues) => {
        if (!organizer) {
            toast({ title: 'Error', description: 'No organizer selected for editing.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
            const organizerRef = doc(db, 'organizers', organizer.id);
            // Create the data object to update, ensuring optional fields are handled
            const updatedData: Partial<Organizer> = {
                name: values.name,
                link: values.link || '', // Store empty string if link is removed
                description: values.description,
                avatarUrl: values.avatarUrl || `https://avatar.vercel.sh/${values.name.replace(/\s+/g, '-')}.png`, // Update or generate default avatar
                // createdAt should not be updated
            };

            await updateDoc(organizerRef, updatedData);
            toast({ title: 'Organizer Updated', description: `Organizer "${values.name}" updated.` });
            setOpen(false);
            refreshOrganizers();
        } catch (error) {
            console.error("Error updating organizer:", error);
            toast({ title: 'Update Failed', description: 'Could not update the organizer.', variant: 'destructive' });
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
                        {isSaving ? 'Saving...' : 'Save Changes'}
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
    const [isCopyingCampId, setIsCopyingCampId] = useState<string | null>(null); // Added copying state
    const [filterStatus, setFilterStatus] = useState<CampStatusFilter>('all');
    const [organizers, setOrganizers] = useState<Organizer[]>([]);
    const [organizersLoading, setOrganizersLoading] = useState(true);
    const [isCreateOrganizerOpen, setIsCreateOrganizerOpen] = useState(false);
    const [deletingOrganizerId, setDeletingOrganizerId] = useState<string | null>(null); // For tracking organizer deletion
    const [isEditOrganizerOpen, setIsEditOrganizerOpen] = useState(false); // State for edit dialog
    const [organizerToEdit, setOrganizerToEdit] = useState<Organizer | null>(null); // State to hold organizer being edited
    const [isArchiving, setIsArchiving] = useState(false); // State for archiving process


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
            // Correctly filter by the creatorId field
            .filter(camp => camp.creatorId === adminId);
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
            })).sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)); // Sort by creation date desc, handle potential missing createdAt
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
            // Define sort order: Active > Draft > Archived
            const statusOrder = { 'Active': 1, 'Draft': 2, 'Archived': 3 };
            if (statusOrder[statusA] !== statusOrder[statusB]) {
                return statusOrder[statusA] - statusOrder[statusB];
            }
            // If statuses are the same, sort by creation date desc
            const dateA = a.createdAt?.toDate() ?? new Date(0);
            const dateB = b.createdAt?.toDate() ?? new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        if (filterStatus === 'all') return sortedCamps;

        return sortedCamps.filter(camp => {
             const detailedStatus = getCampStatus(camp);
             switch (filterStatus) {
                 case 'active': return detailedStatus === 'Active';
                 case 'draft': return detailedStatus === 'Draft';
                 case 'archive': return detailedStatus === 'Archived';
                 default: return true; // Should not happen with 'all' handled
             }
         });

    }, [allAdminCamps, filterStatus]);
    
    const displayedCamps = useMemo(() => {
        return filteredAndSortedCamps.slice(0, 5);
    }, [filteredAndSortedCamps]);

    // Filter for active camps that have started (startDate <= today)
    const startedActiveCamps = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0); // Set to beginning of today
        const todayStartMillis = todayStart.getTime();

        return allAdminCamps.filter(camp =>
            camp.status === 'active' &&
            camp.startDate &&
            camp.startDate.toMillis() <= todayStartMillis
        ).sort((a, b) => { // Sort by start date, earliest first
            const dateA = a.startDate?.toMillis() ?? 0;
            const dateB = b.startDate?.toMillis() ?? 0;
            return dateA - dateB;
        });
    }, [allAdminCamps]);


    // Function to handle camp deletion
    const handleDeleteCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return;
        const campToDelete = allAdminCamps.find(camp => camp.id === campId);
        // Correctly check if the logged-in user is the creator
        if (!campToDelete || campToDelete.creatorId !== user.uid) {
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

    // Function to handle copying a camp
    const handleCopyCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return;

        const campToCopy = allAdminCamps.find(camp => camp.id === campId);
        if (!campToCopy) {
            toast({ title: 'Error', description: 'Camp not found.', variant: 'destructive' });
            return;
        }

        // Ensure the admin is the creator (though typically admin can copy any)
        if (campToCopy.creatorId !== user.uid) {
            toast({ title: 'Permission Denied', description: 'Cannot copy this camp.', variant: 'destructive' });
            return;
        }

        setIsCopyingCampId(campId);
        try {
            // Prepare the new camp data
            const { id, createdAt, ...originalData } = campToCopy; // Exclude original ID and createdAt
            const newCampData = {
                ...originalData,
                name: `${originalData.name} (Copy)`, // Append (Copy) to the name
                status: 'draft', // Set status to draft
                createdAt: Timestamp.now(), // Set new creation timestamp
                creatorId: user.uid, // Ensure the copier is the creator
                creationMode: 'admin', // Copied by admin
            };

            // Add the new document to Firestore
            const docRef = await addDoc(collection(db, 'camps'), newCampData);

            // Add the newly created camp to the local state
            const newCampWithId: Camp = {
                id: docRef.id,
                ...newCampData,
            };
            setAllAdminCamps(prev => [newCampWithId, ...prev]); // Add to the beginning of the list

            toast({
                title: 'Camp Copied',
                description: `A draft copy of "${campToCopy.name}" has been created.`,
            });

        } catch (error) {
            console.error("Error copying camp:", error);
            toast({ title: 'Copy Failed', description: 'Could not copy the camp.', variant: 'destructive' });
        } finally {
            setIsCopyingCampId(null);
        }
    };


    // Function to handle organizer deletion
    const handleDeleteOrganizer = async (organizerId: string) => {
        if (!organizerId || !isAdmin) return;
        setDeletingOrganizerId(organizerId);
        try {
            await deleteDoc(doc(db, 'organizers', organizerId));
            setOrganizers(prev => prev.filter(org => org.id !== organizerId));
            toast({ title: 'Organizer Deleted', description: 'The organizer has been removed.' });
        } catch (error) {
            console.error("Error deleting organizer:", error);
            toast({ title: 'Deletion Failed', description: 'Could not delete the organizer.', variant: 'destructive' });
        } finally {
            setDeletingOrganizerId(null);
        }
    };

    // Handler to open the edit organizer dialog
    const handleEditOrganizerClick = (organizer: Organizer) => {
        setOrganizerToEdit(organizer);
        setIsEditOrganizerOpen(true);
    };

    // Function to archive all started active camps
    const handleArchiveAllStarted = async () => {
        if (!isAdmin || startedActiveCamps.length === 0) return;
        setIsArchiving(true);
        try {
            const batch = writeBatch(db);
            startedActiveCamps.forEach(camp => {
                 if (camp.creatorId === user?.uid) { // Ensure admin owns the camp
                    const campRef = doc(db, 'camps', camp.id);
                    batch.update(campRef, { status: 'archive' });
                 }
            });
            await batch.commit();

            // Refresh local state
            fetchAdminCamps(user.uid); // Re-fetch camps to update the UI

            toast({
                title: 'Camps Archived',
                description: `${startedActiveCamps.length} started active camp(s) have been moved to archive.`
            });

        } catch (error) {
            console.error("Error archiving started camps:", error);
            toast({ title: 'Archiving Failed', description: 'Could not archive the camps.', variant: 'destructive' });
        } finally {
            setIsArchiving(false);
        }
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
                    {/* Administrator Panel Title - Moved out of Card */}
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl md:text-4xl font-bold">Administrator Panel</h1>
                    </div>
                    <p className="text-muted-foreground mb-12">Manage organizers, camps, and site settings. Welcome, Admin ({user.email})!</p>
                    

                    {/* Organizer Management Section */}
                    <div className="mb-12">
                         <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="h-6 w-6" /> Organizer Management
                             </h2>
                              {/* Create Organizer Dialog */}
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
                                  </DialogContent>
                              </Dialog>
                         </div>

                         {/* Organizer List */}
                         {organizersLoading ? (
                            <AdminOrganizerListSkeleton count={2}/>
                         ) : organizers.length > 0 ? (
                            <div className="border rounded-md">
                                {organizers.map((org) => (
                                    <AdminOrganizerListItem
                                        key={org.id}
                                        organizer={org}
                                        onEditClick={handleEditOrganizerClick}
                                        onDeleteClick={handleDeleteOrganizer}
                                        deletingOrganizerId={deletingOrganizerId}
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

                     {/* Edit Organizer Dialog */}
                     <Dialog open={isEditOrganizerOpen} onOpenChange={setIsEditOrganizerOpen}>
                         <DialogContent className="sm:max-w-[425px]">
                             <DialogHeader>
                                 <DialogTitle>Edit Organizer</DialogTitle>
                                 <DialogDescription>
                                     Update the details for {organizerToEdit?.name || 'the organizer'}.
                                 </DialogDescription>
                             </DialogHeader>
                             {/* Pass organizer data and handlers */}
                             <EditOrganizerForm
                                organizer={organizerToEdit}
                                setOpen={setIsEditOrganizerOpen}
                                refreshOrganizers={fetchOrganizers}
                             />
                         </DialogContent>
                     </Dialog>


                    <Separator className="my-12"/>

                     {/* Section for Admin's Created Camps with Filtering */}
                    <div className="mb-12"> {/* Changed mb-10 to mb-12 */}
                         <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold">My Created Camps</h2>
                             <Button asChild>
                                <Link href="/camps/new">
                                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Camp
                                </Link>
                             </Button>
                         </div>


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
                                <RadioGroupItem value="draft" id="r-draft" />
                                <Label htmlFor="r-draft">Draft</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="archive" id="r-archive" />
                                <Label htmlFor="r-archive">Archived</Label>
                            </div>
                            {/* Removed Past filter option */}
                         </RadioGroup>

                         {/* Camp List */}
                         {campsLoading ? (
                            <AdminCampListSkeleton count={displayedCamps.length > 0 ? displayedCamps.length : (filterStatus === 'all' ? 3 : 1) } />
                         ) : displayedCamps.length > 0 ? (
                            <>
                            <div className="border rounded-md">
                                {displayedCamps.map((camp) => (
                                    <AdminCampListItem
                                        key={camp.id}
                                        camp={camp}
                                        isCreator={camp.creatorId === user.uid} // Pass whether the current user is the creator
                                        onDeleteClick={handleDeleteCamp}
                                        onCopyClick={handleCopyCamp} // Pass copy handler
                                        deletingCampId={deletingCampId}
                                        isCopyingCampId={isCopyingCampId} // Pass copying state
                                        status={getCampStatus(camp)}
                                    />
                                ))}
                            </div>
                            {filteredAndSortedCamps.length > 5 && (
                                <div className="mt-4 text-center">
                                    <Button asChild variant="outline">
                                        <Link href="/admin/my-camps">
                                            <List className="mr-2 h-4 w-4" /> View All My Camps
                                        </Link>
                                    </Button>
                                </div>
                            )}
                            </>
                         ) : (
                             <Card className="text-center py-12 border-dashed">
                                 <CardContent>
                                     <p className="text-muted-foreground">
                                        {filterStatus === 'all' ? "You haven't created any camps yet." :
                                         filterStatus === 'active' ? "No active camps found." :
                                         filterStatus === 'draft' ? "No draft camps found." :
                                         filterStatus === 'archive' ? "No archived camps found." :
                                         "No camps found for this filter."} {/* Generic fallback */}
                                     </p>
                                     {/* Button removed from here as it's now at the top of the section */}
                                 </CardContent>
                             </Card>
                         )}
                    </div>

                    <Separator className="my-12"/>

                     {/* Section for Active Camps that have started */}
                     <div className="mb-10"> {/* Changed mb-12 to mb-10 */}
                          <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                                <CalendarClock className="h-6 w-6" /> Started Active Camps
                             </h2>
                             {startedActiveCamps.length > 0 && ( // Show button only if there are camps to archive
                                 <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                         <Button variant="destructive" size="sm" disabled={isArchiving}>
                                             <Archive className="mr-2 h-4 w-4" />
                                             {isArchiving ? 'Archiving...' : 'Archive All Started'}
                                         </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                         <AlertDialogHeader>
                                             <AlertDialogTitle>Confirm Archiving</AlertDialogTitle>
                                             <AlertDialogDescription>
                                                 Are you sure you want to archive all {startedActiveCamps.length} started active camp(s)? This will change their status to 'Archived'.
                                             </AlertDialogDescription>
                                         </AlertDialogHeader>
                                         <AlertDialogFooter>
                                             <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
                                             <AlertDialogAction onClick={handleArchiveAllStarted} disabled={isArchiving} className="bg-destructive hover:bg-destructive/90">
                                                Archive Camps
                                             </AlertDialogAction>
                                         </AlertDialogFooter>
                                     </AlertDialogContent>
                                 </AlertDialog>
                             )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            These camps are marked 'active' and their start date is in the past or today. Review if needed.
                          </p>
                          {campsLoading ? (
                              <AdminCampListSkeleton count={1} />
                          ) : startedActiveCamps.length > 0 ? (
                              <div className="border rounded-md border-yellow-200 dark:border-yellow-800/50">
                                  {startedActiveCamps.map((camp) => (
                                      <AdminCampListItem
                                          key={camp.id}
                                          camp={camp}
                                          isCreator={camp.creatorId === user.uid}
                                          onDeleteClick={handleDeleteCamp}
                                          onCopyClick={handleCopyCamp} // Pass copy handler
                                          deletingCampId={deletingCampId}
                                          isCopyingCampId={isCopyingCampId} // Pass copying state
                                          status={getCampStatus(camp)}
                                          highlight={true} // Pass the highlight flag
                                      />
                                  ))}
                              </div>
                          ) : (
                              <Card className="text-center py-8 border-dashed">
                                  <CardContent>
                                      <p className="text-muted-foreground">No active camps have started yet.</p>
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

