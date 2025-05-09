
// src/app/main/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Building, PlusCircle, ArrowRight, Search, CalendarIcon, FilterX, DollarSign, ListFilter } from 'lucide-react'; // Added ListFilter
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetBody, // Added SheetBody
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  status: 'draft' | 'active' | 'archive';
  organizerId?: string;
  organizerName?: string;
  organizerLink?: string;
  creatorId?: string;
  createdAt?: Timestamp;
  activities?: string[];
}

// Organizer Interface (simplified for filtering)
interface Organizer {
    id: string;
    name: string;
}

// Date Range Picker Component
function DateRangePickerFilterField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder: string;
  disabled: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "LLL dd, y")} -{" "}
                {format(value.to, "LLL dd, y")}
              </>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
        {value && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
              className="w-full"
            >
              Clear Dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


// Banner Component
const Banner = ({ title, description, imageUrl, imageAlt, imageHint }: {
    title: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
    imageHint: string;
}) => (
    <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-lg mb-12">
        <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            style={{ objectFit: 'cover' }}
            sizes="100vw"
            priority
            data-ai-hint={imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent p-8 md:p-12 flex flex-col justify-center items-start text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            <p className="text-lg md:text-xl mb-6 max-w-xl">{description}</p>
        </div>
    </div>
);


export default function MainPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [firestoreCamps, setFirestoreCamps] = useState<Camp[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [organizersLoading, setOrganizersLoading] = useState(true);
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);


  // Main Filter states
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | undefined>(undefined);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(undefined);
  const [priceRangeFilter, setPriceRangeFilter] = useState<[number, number] | undefined>(undefined);
  const [maxPossiblePrice, setMaxPossiblePrice] = useState<number>(5000);

  // Temporary filter states for the sheet
  const [selectedOrganizerInSheet, setSelectedOrganizerInSheet] = useState<string | undefined>(selectedOrganizer);
  const [selectedLocationInSheet, setSelectedLocationInSheet] = useState<string | undefined>(selectedLocation);
  const [dateRangeFilterInSheet, setDateRangeFilterInSheet] = useState<DateRange | undefined>(dateRangeFilter);
  const [priceRangeFilterInSheet, setPriceRangeFilterInSheet] = useState<[number, number] | undefined>(priceRangeFilter);


  useEffect(() => {
    setFirestoreLoading(true);
    setOrganizersLoading(true);
    setLocationsLoading(true);
    fetchFirestoreData();
  }, []);

  const fetchFirestoreData = async () => {
    try {
      const campsCollectionRef = collection(db, 'camps');
      const today = Timestamp.now();
      const campsQuery = query(
          campsCollectionRef,
          where('status', '==', 'active'),
          where('endDate', '>=', today)
      );
      const campsSnapshot = await getDocs(campsQuery);
      const fetchedCamps = campsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Camp, 'id'>
      })).sort((a, b) => (a.startDate?.toDate() ?? new Date(0)).getTime() - (b.startDate?.toDate() ?? new Date(0)).getTime());

      setFirestoreCamps(fetchedCamps);

      if (fetchedCamps.length > 0) {
        const maxPrice = Math.max(...fetchedCamps.map(camp => camp.price), 0);
        setMaxPossiblePrice(Math.max(maxPrice, 100));
        // Initialize sheet price range if not set by user yet
        if (!priceRangeFilterInSheet) {
            setPriceRangeFilterInSheet([0, Math.max(maxPrice, 100)]);
        }
      } else {
        setMaxPossiblePrice(5000);
         if (!priceRangeFilterInSheet) {
            setPriceRangeFilterInSheet([0, 5000]);
        }
      }

      const locations = Array.from(new Set(fetchedCamps.map(camp => camp.location))).sort();
      setUniqueLocations(locations);
      setLocationsLoading(false);

      const organizersCollectionRef = collection(db, 'organizers');
      const organizersSnapshot = await getDocs(organizersCollectionRef);
      const fetchedOrganizers = organizersSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name as string,
      })).sort((a,b) => a.name.localeCompare(b.name));
      setOrganizers(fetchedOrganizers);
      setOrganizersLoading(false);

    } catch (error) {
      console.error("Error fetching data from Firestore:", error);
      toast({ title: 'Error fetching data', description: 'Could not load camps, organizers, or locations.', variant: 'destructive' });
      setUniqueLocations([]);
      setOrganizers([]);
    } finally {
      setFirestoreLoading(false);
    }
  };

  const filteredCamps = useMemo(() => {
    return firestoreCamps.filter(camp => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || (
        camp.name.toLowerCase().includes(lowercasedSearchTerm) ||
        camp.description.toLowerCase().includes(lowercasedSearchTerm) ||
        (camp.activities && camp.activities.some(activity => activity.toLowerCase().includes(lowercasedSearchTerm)))
      );

      const matchesOrganizer = !selectedOrganizer || camp.organizerId === selectedOrganizer;

      const matchesDateRange = (() => {
        if (!dateRangeFilter?.from && !dateRangeFilter?.to) return true;
        const campStart = camp.startDate?.toDate();
        const campEnd = camp.endDate?.toDate();
        if (!campStart || !campEnd) return false;
        const filterFrom = dateRangeFilter.from;
        const filterTo = dateRangeFilter.to;
        if (filterFrom && filterTo) return campStart <= filterTo && campEnd >= filterFrom;
        if (filterFrom) return campEnd >= filterFrom;
        if (filterTo) return campStart <= filterTo;
        return true;
      })();

      const matchesLocation = !selectedLocation || camp.location === selectedLocation;
      const matchesPriceRange = !priceRangeFilter || (camp.price >= priceRangeFilter[0] && camp.price <= priceRangeFilter[1]);

      return matchesSearch && matchesOrganizer && matchesDateRange && matchesLocation && matchesPriceRange;
    });
  }, [firestoreCamps, searchTerm, selectedOrganizer, dateRangeFilter, selectedLocation, priceRangeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedOrganizer(undefined);
    setDateRangeFilter(undefined);
    setSelectedLocation(undefined);
    setPriceRangeFilter(undefined);
    // Also clear sheet filters
    setSelectedOrganizerInSheet(undefined);
    setSelectedLocationInSheet(undefined);
    setDateRangeFilterInSheet(undefined);
    setPriceRangeFilterInSheet([0, maxPossiblePrice]); // Reset to full range
  };

  const handleApplySheetFilters = () => {
    setSelectedOrganizer(selectedOrganizerInSheet);
    setSelectedLocation(selectedLocationInSheet);
    setDateRangeFilter(dateRangeFilterInSheet);
    setPriceRangeFilter(priceRangeFilterInSheet);
    setIsSheetOpen(false);
  };

  const handleCancelSheetFilters = () => {
    // Reset sheet filters to main filters before closing
    setSelectedOrganizerInSheet(selectedOrganizer);
    setSelectedLocationInSheet(selectedLocation);
    setDateRangeFilterInSheet(dateRangeFilter);
    setPriceRangeFilterInSheet(priceRangeFilter || [0, maxPossiblePrice]);
    setIsSheetOpen(false);
  };

  // Update sheet filters when main filters change (e.g., "Clear All")
  useEffect(() => {
    setSelectedOrganizerInSheet(selectedOrganizer);
  }, [selectedOrganizer]);

  useEffect(() => {
    setSelectedLocationInSheet(selectedLocation);
  }, [selectedLocation]);

  useEffect(() => {
    setDateRangeFilterInSheet(dateRangeFilter);
  }, [dateRangeFilter]);

  useEffect(() => {
    setPriceRangeFilterInSheet(priceRangeFilter || [0, maxPossiblePrice]);
  }, [priceRangeFilter, maxPossiblePrice]);

  const CampCard = ({ camp }: { camp: Camp }) => {
    const organizerDisplay = camp.organizerName || 'Campanion Partner';
    const formattedPrice = camp.price.toLocaleString('ru-RU');

    return (
      <Card key={camp.id} className="overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 bg-card h-full">
        <div className="relative w-full h-48">
          <Image
            src={camp.imageUrl || 'https://picsum.photos/seed/placeholder/600/400'}
            alt={camp.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="camp nature adventure"
          />
        </div>
        <CardHeader>
          <CardTitle className="text-lg">{camp.name}</CardTitle>
          <CardDescription>{camp.location} | {camp.dates}</CardDescription>
          <CardDescription className="flex items-center pt-1">
            <Building className="h-4 w-4 mr-1 text-muted-foreground" />
             {camp.organizerLink ? (
                <a href={camp.organizerLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                    {organizerDisplay}
                </a>
            ) : (
                <span className="text-sm text-muted-foreground truncate">{organizerDisplay}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
            {camp.description}
            {' '}
            <Link href={`/camps/${camp.id}`} prefetch={false} className="text-primary hover:underline inline-flex items-center font-medium whitespace-nowrap">
              Read more <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </p>
          {camp.activities && camp.activities.length > 0 && (
            <div className="mt-2 mb-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Activities</h4>
              <div className="flex flex-wrap gap-1">
                {camp.activities.slice(0, 3).map(activity => (
                  <Badge key={activity} variant="secondary" className="text-xs">
                    {activity}
                  </Badge>
                ))}
                {camp.activities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    + {camp.activities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-6 pt-0 flex justify-between items-center gap-2">
          <span className="text-base font-semibold text-primary">{formattedPrice} ₽</span>
          <div className="flex gap-2 items-center">
            <Button size="sm" asChild variant="outline">
              <Link href={`/camps/${camp.id}`} prefetch={false}>
                View
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const SkeletonCard = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <Card key={index} className="overflow-hidden bg-card h-full">
          <Skeleton className="h-48 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/5 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardContent>
          <div className="p-6 pt-0 flex justify-between items-center">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        </Card>
      ))}
    </div>
  );

  const BannerSkeleton = () => (
    <div className="mb-12">
         <Skeleton className="w-full h-64 md:h-80 rounded-lg" />
    </div>
  );

  const HeaderSkeleton = () => (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background z-10">
        <Skeleton className="h-6 w-6 mr-2" />
        <Skeleton className="h-6 w-32" />
        <div className="ml-auto flex gap-4 sm:gap-6 items-center">
            <Skeleton className="h-8 w-20" />
        </div>
    </header>
  );

  const FooterSkeleton = () => (
   <footer className="py-6 px-4 md:px-6 border-t">
       <Skeleton className="h-4 w-1/4" />
   </footer>
  );

  const isLoading = authLoading || firestoreLoading || organizersLoading || locationsLoading;

  const locationOptions = useMemo(() => {
    return uniqueLocations.map(location => ({
        value: location,
        label: location,
    }));
  }, [uniqueLocations]);

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRangeFilterInSheet(value as [number, number]); // Update sheet filter first
  };

  const handleMainPriceRangeChange = (value: number[]) => {
    setPriceRangeFilter(value as [number, number]);
    setPriceRangeFilterInSheet(value as [number, number]); // Keep sheet filter in sync
  };


  const formatPriceForDisplay = (price: number) => {
    return price.toLocaleString('ru-RU');
  };

  const isAnyFilterActive = !!(searchTerm || selectedOrganizer || dateRangeFilter || selectedLocation || priceRangeFilter);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {authLoading ? <HeaderSkeleton /> : <Header />}

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
         <div className="mb-12">
            {isLoading ? <BannerSkeleton /> : (
                 <Banner
                     title="Find Your Perfect Camp Experience"
                     description="Explore a wide variety of camps, from outdoor adventures to creative workshops, and book your next adventure."
                     imageUrl="https://picsum.photos/seed/banner-discover/1200/400"
                     imageAlt="Children enjoying activities at a summer camp"
                     imageHint="camp discover explore fun"
                 />
            )}
         </div>

        <div id="available-camps">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Available Camps</h2>

          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full mb-2" /> {/* Search bar skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6"> {/* Visible filters skeletons */}
                <Skeleton className="h-10 w-full" /> {/* Date Range skeleton */}
                <Skeleton className="h-10 w-full" /> {/* Price Slider skeleton (simplified) */}
                <Skeleton className="h-10 w-full" /> {/* More Filters button skeleton */}
              </div>
              <Skeleton className="h-9 w-28 mb-6" /> {/* Clear All Filters button skeleton */}
            </>
          ) : (
            <>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, description, activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>

              {/* Visible Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[minmax(0,320px)_minmax(0,320px)_auto_auto] lg:grid-cols-[minmax(0,320px)_minmax(0,320px)_auto_auto] gap-4 mb-6 items-end">
                <div className="flex flex-col">
                  <Label htmlFor="date-range-filter-main" className="mb-1 block text-sm font-medium">Date Range</Label>
                  <DateRangePickerFilterField
                    value={dateRangeFilter}
                    onChange={setDateRangeFilter}
                    placeholder="Pick a date range"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="price-range-filter-main" className="mb-1 block text-sm font-medium">
                    Price Range (₽): {priceRangeFilter ? `${formatPriceForDisplay(priceRangeFilter[0])} - ${formatPriceForDisplay(priceRangeFilter[1])}` : `0 - ${formatPriceForDisplay(maxPossiblePrice)}`}
                  </Label>
                  <Slider
                    id="price-range-filter-main"
                    value={priceRangeFilter || [0, maxPossiblePrice]}
                    onValueChange={handleMainPriceRangeChange}
                    min={0}
                    max={maxPossiblePrice}
                    step={50}
                    disabled={isLoading}
                    className="w-full mt-1" 
                  />
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <ListFilter className="mr-2 h-4 w-4" /> More Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-sm">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>
                        Apply additional filters to refine your camp search.
                      </SheetDescription>
                    </SheetHeader>
                    <SheetBody className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="sheet-organizer-filter" className="text-sm font-medium">Organizer</Label>
                        <Select
                          value={selectedOrganizerInSheet || "all"}
                          onValueChange={(value) => setSelectedOrganizerInSheet(value === "all" ? undefined : value)}
                          disabled={isLoading || organizersLoading}
                        >
                          <SelectTrigger id="sheet-organizer-filter">
                            <SelectValue placeholder="All Organizers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizers</SelectItem>
                            {organizers.map(org => (
                              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="sheet-location-filter" className="text-sm font-medium">Location</Label>
                        <Combobox
                            options={locationOptions}
                            value={selectedLocationInSheet}
                            onChange={(value) => setSelectedLocationInSheet(value === "all" ? undefined : value)}
                            placeholder="Select location..."
                            searchPlaceholder="Search location..."
                            noResultsText="No location found."
                            disabled={isLoading || locationsLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sheet-date-range-filter" className="text-sm font-medium">Date Range</Label>
                        <DateRangePickerFilterField
                          value={dateRangeFilterInSheet}
                          onChange={setDateRangeFilterInSheet}
                          placeholder="Pick a date range"
                          disabled={isLoading}
                        />
                      </div>
                       <div>
                          <Label htmlFor="sheet-price-range-filter" className="mb-2 block text-sm font-medium">
                            Price Range (₽): {priceRangeFilterInSheet ? `${formatPriceForDisplay(priceRangeFilterInSheet[0])} - ${formatPriceForDisplay(priceRangeFilterInSheet[1])}` : `0 - ${formatPriceForDisplay(maxPossiblePrice)}`}
                          </Label>
                          <Slider
                            id="sheet-price-range-filter"
                            value={priceRangeFilterInSheet || [0, maxPossiblePrice]}
                            onValueChange={handlePriceRangeChange}
                            min={0}
                            max={maxPossiblePrice}
                            step={50}
                            disabled={isLoading}
                            className="w-full"
                          />
                        </div>
                    </SheetBody>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button type="button" variant="outline" onClick={handleCancelSheetFilters}>Cancel</Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button type="button" onClick={handleApplySheetFilters}>Apply Filters</Button>
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
                <Button
                  variant={isAnyFilterActive ? "destructive" : "outline"}
                  onClick={clearFilters}
                  disabled={isLoading}
                  className="h-10 px-3" // Ensured height consistency
                  aria-label="Clear All Filters"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {isLoading ? (
             <SkeletonCard count={6} />
          ) : filteredCamps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredCamps.map((camp) => <CampCard key={camp.id} camp={camp} />)}
           </div>
          ) : (
             <Card className="text-center py-12">
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        {firestoreLoading ? "Loading camps..." : "No camps found matching your criteria."}
                    </p>
                    {isAdmin && user && !firestoreLoading && (
                        <Button asChild>
                            <Link href="/camps/new"><PlusCircle className="mr-2 h-4 w-4"/>Create New Camp</Link>
                        </Button>
                    )}
                </CardContent>
             </Card>
          )}
        </div>
        </div>
      </main>

       {authLoading ? <FooterSkeleton /> : (
           <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t mt-auto">
                <p className="text-xs text-muted-foreground">&copy; 2024 Campanion. All rights reserved.</p>
           </footer>
        )}
    </div>
  );
}

