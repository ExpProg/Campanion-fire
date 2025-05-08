
// src/app/admin/my-camps/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, Trash2, Pencil, Eye, CalendarCheck2, FileText, Archive, Copy, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import Image from 'next/image'; // Import Image
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
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import PaginationControls from '@/components/layout/PaginationControls'; // Import PaginationControls

const ITEMS_PER_PAGE = 15;

// Camp Data Interface (consistent with admin/page.tsx)
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
  organizerName?: string;
  organizerLink?: string;
  creatorId: string;
  creationMode: 'admin' | 'user';
  status: 'draft' | 'active' | 'archive';
  createdAt?: Timestamp;
  activities?: string[];
}

type CampStatusFilter = 'all' | 'active' | 'draft' | 'archive';
type DetailedCampStatus = 'Active' | 'Draft' | 'Archived';

const getCampStatus = (camp: Camp): DetailedCampStatus => {
  if (camp.status === 'draft') return 'Draft';
  if (camp.status === 'archive') return 'Archived';
  if (camp.status === 'active') return 'Active';
  return 'Draft';
};

// Reusable Camp List Item (from admin/page.tsx, slightly adapted)
const AdminCampListItem = ({ camp, isCreator, onDeleteClick, onCopyClick, deletingCampId, isCopyingCampId, status }: {
    camp: Camp;
    isCreator: boolean;
    onDeleteClick: (campId: string) => void;
    onCopyClick: (campId: string) => void;
    deletingCampId: string | null;
    isCopyingCampId: string | null;
    status: DetailedCampStatus;
}) => {
    const badgeClasses = cn(
        'flex-shrink-0 transition-colors pointer-events-none',
        {
            'bg-[#FFD54F] text-yellow-950 dark:bg-[#FFD54F] dark:text-yellow-950 border-transparent': status === 'Active',
            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-transparent': status === 'Draft',
            'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-transparent': status === 'Archived',
        }
    );
    const StatusIcon = status === 'Active' ? CalendarCheck2 : status === 'Draft' ? FileText : Archive;
    const formattedPrice = camp.price.toLocaleString('ru-RU');
    const formattedStartDate = camp.startDate ? camp.startDate.toDate().toLocaleDateString() : 'N/A';
    const formattedEndDate = camp.endDate ? camp.endDate.toDate().toLocaleDateString() : 'N/A';

    return (
      <div key={camp.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
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
         <div className="flex-1 min-w-0 mr-4">
             <div className="flex items-center gap-2 mb-1">
                 <p className="font-semibold truncate text-sm">{camp.name}</p> {/* Reduced font size for name */}
                 <Badge variant={undefined} className={badgeClasses}>
                     <StatusIcon className="h-3 w-3 mr-1" />
                    {status}
                 </Badge>
             </div>
             <p className="text-sm text-muted-foreground truncate">{camp.location} | {formattedStartDate} - {formattedEndDate}</p>
             <p className="text-xs text-primary font-medium">{formattedPrice} ₽</p> {/* Reduced font size for price */}
         </div>
         <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
              <Button size="sm" asChild variant="ghost" aria-label={`View ${camp.name}`}>
                <Link href={`/camps/${camp.id}`} prefetch={false}><Eye className="h-4 w-4" /></Link>
              </Button>
              {isCreator && (
                  <>
                      <Button size="sm" asChild variant="ghost" aria-label={`Edit ${camp.name}`}>
                           <Link href={`/camps/${camp.id}/edit`} prefetch={false}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => onCopyClick(camp.id)} disabled={isCopyingCampId === camp.id} aria-label={`Copy ${camp.name}`}>
                           <Copy className="h-4 w-4" />
                       </Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingCampId === camp.id} aria-label={`Delete ${camp.name}`}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{camp.name}".</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteClick(camp.id)} className="bg-destructive hover:bg-destructive/90">Delete Camp</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </>
              )}
          </div>
      </div>
    );
};

// Skeleton for the Camp List (from admin/page.tsx)
const AdminCampListSkeleton = ({ count = ITEMS_PER_PAGE }: { count?: number }) => (
    <div className="border rounded-md">
        {[...Array(count)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 border-b last:border-b-0">
                <Skeleton className="relative w-20 h-16 sm:w-24 sm:h-20 rounded-md mr-4 flex-shrink-0" /> {/* Image Skeleton */}
                <div className="flex-1 min-w-0 mr-4 space-y-1">
                     <div className="flex items-center gap-2 mb-1"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-16" /></div>
                    <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
                    <Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>
        ))}
    </div>
);

// Skeleton for the full page
const AllMyCampsPageSkeleton = () => (
    <div className="flex flex-col min-h-screen">
        <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
            <Skeleton className="h-6 w-6 mr-2" /><Skeleton className="h-6 w-32" />
            <div className="ml-auto flex gap-4 sm:gap-6 items-center"><Skeleton className="h-8 w-20" /></div>
        </header>
        <main className="flex-1 p-4 md:p-8 lg:p-12">
            <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                 <Skeleton className="h-8 w-40 mb-8" /> {/* Back link placeholder */}
                 <div className="flex justify-between items-center mb-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-10 w-40" /></div>
                 <div className="flex space-x-4 mb-6"><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-16" /></div>
                 <AdminCampListSkeleton count={ITEMS_PER_PAGE} />
                 {/* Skeleton for pagination controls */}
                 <div className="flex items-center justify-between mt-6">
                    <Skeleton className="h-6 w-40" /> {/* Showing X-Y of Z */}
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-9 w-24" /> {/* Previous button */}
                        <Skeleton className="h-9 w-24" /> {/* Next button */}
                    </div>
                </div>
            </div>
        </main>
        <footer className="py-6 px-4 md:px-6 border-t"><Skeleton className="h-4 w-1/4" /></footer>
    </div>
);


export default function AllMyCampsPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [allAdminCamps, setAllAdminCamps] = useState<Camp[]>([]);
    const [campsLoading, setCampsLoading] = useState(true);
    const [deletingCampId, setDeletingCampId] = useState<string | null>(null);
    const [isCopyingCampId, setIsCopyingCampId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<CampStatusFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/main');
        }
    }, [user, isAdmin, authLoading, router]);

    useEffect(() => {
        if (isAdmin && user) {
            fetchAdminCamps(user.uid);
        } else {
            setCampsLoading(false);
            setAllAdminCamps([]);
        }
    }, [isAdmin, user]);

    const fetchAdminCamps = async (adminId: string) => {
        setCampsLoading(true);
        try {
            const campsCollectionRef = collection(db, 'camps');
            const querySnapshot = await getDocs(campsCollectionRef);
            const fetchedCamps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<Camp, 'id'> }))
                .filter(camp => camp.creatorId === adminId);
            setAllAdminCamps(fetchedCamps);
        } catch (error) {
            console.error("Error fetching admin's created camps:", error);
            toast({ title: 'Error', description: 'Could not load your camps.', variant: 'destructive' });
        } finally {
            setCampsLoading(false);
        }
    };

    const filteredAndSortedCamps = useMemo(() => {
        const sortedCamps = [...allAdminCamps].sort((a, b) => {
            const statusA = getCampStatus(a);
            const statusB = getCampStatus(b);
            const statusOrder = { 'Active': 1, 'Draft': 2, 'Archived': 3 };
            if (statusOrder[statusA] !== statusOrder[statusB]) return statusOrder[statusA] - statusOrder[statusB];
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
                 default: return true;
             }
         });
    }, [allAdminCamps, filterStatus]);

    const totalPages = Math.ceil(filteredAndSortedCamps.length / ITEMS_PER_PAGE);

    const paginatedCamps = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredAndSortedCamps.slice(startIndex, endIndex);
    }, [filteredAndSortedCamps, currentPage]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleDeleteCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return;
        const campToDelete = allAdminCamps.find(camp => camp.id === campId);
        if (!campToDelete || campToDelete.creatorId !== user.uid) {
           toast({ title: 'Permission Denied', description: 'Cannot delete this camp.', variant: 'destructive' });
           return;
        }
        setDeletingCampId(campId);
        try {
            await deleteDoc(doc(db, 'camps', campId));
            // Refetch or update local state
            setAllAdminCamps(prev => prev.filter(camp => camp.id !== campId));
            // Adjust current page if the last item on the page was deleted
            if (paginatedCamps.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
            toast({ title: 'Camp Deleted', description: 'The camp has been removed.' });
        } catch (error) {
            console.error("Error deleting camp:", error);
            toast({ title: 'Deletion Failed', description: 'Could not delete the camp.', variant: 'destructive' });
        } finally {
            setDeletingCampId(null);
        }
    };

    const handleCopyCamp = async (campId: string) => {
        if (!campId || !user || !isAdmin) return;
        const campToCopy = allAdminCamps.find(camp => camp.id === campId);
        if (!campToCopy || campToCopy.creatorId !== user.uid) {
            toast({ title: 'Error/Permission Denied', description: 'Camp not found or cannot be copied.', variant: 'destructive' });
            return;
        }
        setIsCopyingCampId(campId);
        try {
            const { id, createdAt, ...originalData } = campToCopy;
            const newCampData = { ...originalData, name: `${originalData.name} (Copy)`, status: 'draft', createdAt: Timestamp.now(), creatorId: user.uid, creationMode: 'admin' };
            const docRef = await addDoc(collection(db, 'camps'), newCampData);
            setAllAdminCamps(prev => [{ id: docRef.id, ...newCampData }, ...prev]);
            toast({ title: 'Camp Copied', description: `Draft copy of "${campToCopy.name}" created.` });
        } catch (error) {
            console.error("Error copying camp:", error);
            toast({ title: 'Copy Failed', description: 'Could not copy the camp.', variant: 'destructive' });
        } finally {
            setIsCopyingCampId(null);
        }
    };

    if (authLoading || (!user && !authLoading)) {
        return <AllMyCampsPageSkeleton />;
    }

    if (!isAdmin) {
       return (
            <div className="flex flex-col min-h-screen">
                 <Header />
                 <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                     <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                     <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                     <p className="text-muted-foreground mb-6">You do not have permission to view this page.</p>
                     <Link href="/main" className="inline-flex items-center text-primary hover:underline" prefetch={false}><ArrowLeft className="mr-2 h-4 w-4" />Return to Main</Link>
                 </main>
                 <footer className="py-6 px-4 md:px-6 border-t"><p className="text-xs text-muted-foreground">&copy; 2024 Campanion</p></footer>
            </div>
       );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                    <Link href="/admin" className="inline-flex items-center text-primary hover:underline mb-8" prefetch={false}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Panel
                    </Link>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl md:text-4xl font-bold">All My Created Camps</h1>
                        <Button asChild>
                           <Link href="/camps/new"><PlusCircle className="mr-2 h-4 w-4" />Create New Camp</Link>
                        </Button>
                    </div>

                    <RadioGroup defaultValue="all" onValueChange={(value) => { setFilterStatus(value as CampStatusFilter); setCurrentPage(1);}} className="flex space-x-4 mb-6">
                       <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="r-all-page" /><Label htmlFor="r-all-page">All</Label></div>
                       <div className="flex items-center space-x-2"><RadioGroupItem value="active" id="r-active-page" /><Label htmlFor="r-active-page">Active</Label></div>
                       <div className="flex items-center space-x-2"><RadioGroupItem value="draft" id="r-draft-page" /><Label htmlFor="r-draft-page">Draft</Label></div>
                       <div className="flex items-center space-x-2"><RadioGroupItem value="archive" id="r-archive-page" /><Label htmlFor="r-archive-page">Archived</Label></div>
                    </RadioGroup>

                    {campsLoading ? (
                       <AdminCampListSkeleton count={ITEMS_PER_PAGE} />
                    ) : paginatedCamps.length > 0 ? (
                        <>
                           <div className="border rounded-md">
                               {paginatedCamps.map((camp) => (
                                   <AdminCampListItem
                                       key={camp.id}
                                       camp={camp}
                                       isCreator={camp.creatorId === user.uid}
                                       onDeleteClick={handleDeleteCamp}
                                       onCopyClick={handleCopyCamp}
                                       deletingCampId={deletingCampId}
                                       isCopyingCampId={isCopyingCampId}
                                       status={getCampStatus(camp)}
                                   />
                               ))}
                           </div>
                           {totalPages > 1 && (
                               <PaginationControls
                                   currentPage={currentPage}
                                   totalPages={totalPages}
                                   onPageChange={handlePageChange}
                                   totalItems={filteredAndSortedCamps.length}
                                   itemsPerPage={ITEMS_PER_PAGE}
                               />
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
                                    "No camps found for this filter."}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
            </footer>
        </div>
    );
}

