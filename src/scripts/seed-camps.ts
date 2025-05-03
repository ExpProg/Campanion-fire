
// src/scripts/seed-camps.ts
// To run this script, you might need ts-node: npm install -D ts-node
// Then execute: npx ts-node src/scripts/seed-camps.ts
// Ensure your FIREBASE_CONFIG environment variables or other auth method is set up.

import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Adjust path as necessary
import { format, parse, addDays } from 'date-fns'; // Import date-fns functions

// Interface matching the desired Firestore structure (based on create-camp/page.tsx)
interface CampFirestoreData {
  name: string;
  description: string;
  startDate: Timestamp; // Store as Timestamp
  endDate: Timestamp;   // Store as Timestamp
  dates: string;        // Store formatted string for display
  location: string;
  imageUrl: string;
  price: number;
  organizerEmail: string; // Keep email for potential display or fallback
  organizerId?: string; // Optional: Added to link to the user's UID
  createdAt: Timestamp; // Use Firestore Timestamp for consistency
  activities?: string[]; // Added based on create camp form
}

// Helper function to parse date strings and create Timestamps
// Assumes simple "Month Day" format for start and "Month Day, Year" for end
// Adjust parsing logic if your sample dates string format is different
const parseDateRange = (datesString: string): { startDate: Timestamp; endDate: Timestamp; formattedString: string } | null => {
    try {
        const parts = datesString.split(' - ');
        if (parts.length !== 2) throw new Error('Invalid date range format');

        const startDateStr = parts[0]; // e.g., "July 10"
        const endDateStr = parts[1];   // e.g., "July 20, 2024"

        // Attempt to parse the end date first to get the year
        const endDate = parse(endDateStr, 'MMMM d, yyyy', new Date());
        if (isNaN(endDate.getTime())) throw new Error(`Invalid end date format: ${endDateStr}`);

        const year = endDate.getFullYear();
        const startDateWithYear = `${startDateStr}, ${year}`; // e.g., "July 10, 2024"

        // Parse the start date with the inferred year
        const startDate = parse(startDateWithYear, 'MMMM d, yyyy', new Date());
         if (isNaN(startDate.getTime())) throw new Error(`Invalid start date format: ${startDateWithYear}`);

        // Ensure start date is not after end date
        if (startDate > endDate) {
             console.warn(`Start date ${startDateWithYear} is after end date ${endDateStr}. Adjusting start year.`);
             // Basic correction: assume start date is in the previous year if it's later in the same year
             startDate.setFullYear(year -1);
             // Re-validate or add more robust logic if needed
             if (startDate > endDate) throw new Error("Corrected start date is still after end date.");
        }

        // Re-format the string consistently
        const formattedStartDate = format(startDate, "MMM d");
        const formattedEndDate = format(endDate, "MMM d, yyyy");
        const formattedString = `${formattedStartDate} - ${formattedEndDate}`;


        return {
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            formattedString: formattedString
        };
    } catch (error: any) {
        console.error(`Error parsing date string "${datesString}": ${error.message}`);
        // Fallback: Create a dummy range if parsing fails
        const now = new Date();
        return {
             startDate: Timestamp.fromDate(now),
             endDate: Timestamp.fromDate(addDays(now, 7)), // e.g., 1 week duration
             formattedString: `Default Range - ${format(now, "MMM d, yyyy")}`
        };
    }
};


// Data copied from src/app/dashboard/page.tsx sampleCamps
const sampleCampsDataRaw = [
  {
    name: 'Adventure Camp Alpha',
    description: 'Experience the thrill of the outdoors with hiking, climbing, and more.',
    dates: 'July 10 - July 20, 2024',
    location: 'Rocky Mountains, CO',
    imageUrl: 'https://picsum.photos/seed/camp1/600/400',
    price: 1200,
    activities: ['Hiking', 'Climbing', 'Camping'],
  },
  {
    name: 'Creative Arts Camp Beta',
    description: 'Unleash your creativity with painting, pottery, and music workshops.',
    dates: 'August 5 - August 15, 2024',
    location: 'Forest Retreat, CA',
    imageUrl: 'https://picsum.photos/seed/camp2/600/400',
    price: 950,
    activities: ['Painting', 'Pottery', 'Music'],
  },
    {
    name: 'Science Explorers Gamma',
    description: 'Dive into the world of science with hands-on experiments and discovery.',
    dates: 'July 22 - August 1, 2024',
    location: 'Coastal Institute, ME',
    imageUrl: 'https://picsum.photos/seed/camp3/600/400',
    price: 1100,
    activities: ['Experiments', 'Biology', 'Chemistry'],
  },
   {
    name: 'Wilderness Survival Delta',
    description: 'Learn essential survival skills in a challenging and rewarding environment.',
    dates: 'September 1 - September 10, 2024',
    location: 'Appalachian Trail, NC',
    imageUrl: 'https://picsum.photos/seed/camp4/600/400',
    price: 1350,
    activities: ['Survival Skills', 'Navigation', 'Shelter Building'],
  },
];

// Function to get user ID by email
const getUserIdByEmail = async (email: string): Promise<string | null> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Assuming email is unique, return the first match's ID
            return querySnapshot.docs[0].id;
        } else {
            console.warn(`No user found with email: ${email}. Cannot link organizerId for seeded camps.`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching user ID for email ${email}:`, error);
        return null;
    }
};


const seedCamps = async () => {
  const campsCollectionRef = collection(db, 'camps');
  const organizerEmail = 'admin@admin.com'; // As requested by the user
  let successCount = 0;
  let errorCount = 0;

  console.log(`Starting to seed ${sampleCampsDataRaw.length} camps for organizer: ${organizerEmail}...`);
  console.log("Attempting to find organizer's UID...");

  // Get the organizer's UID based on their email
  const organizerId = await getUserIdByEmail(organizerEmail);
  if (organizerId) {
      console.log(`Found organizer UID: ${organizerId}. Proceeding with seeding.`);
  } else {
      console.warn("Could not find organizer UID. Camps will be seeded without organizerId link.");
  }

  console.log("Ensure Firebase security rules allow writes to the 'camps' collection.");

  const promises = sampleCampsDataRaw.map(async (campDataRaw) => {
    const dateInfo = parseDateRange(campDataRaw.dates);
    if (!dateInfo) {
        console.error(`[Error] Skipping camp "${campDataRaw.name}" due to date parsing error.`);
        errorCount++;
        return; // Skip this camp
    }

    try {
      const campToAdd: CampFirestoreData = {
        name: campDataRaw.name,
        description: campDataRaw.description,
        startDate: dateInfo.startDate, // Use parsed Timestamp
        endDate: dateInfo.endDate,     // Use parsed Timestamp
        dates: dateInfo.formattedString, // Use consistent formatted string
        location: campDataRaw.location,
        imageUrl: campDataRaw.imageUrl,
        price: campDataRaw.price,
        organizerEmail: organizerEmail,
        createdAt: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
        ...(organizerId && { organizerId: organizerId }), // Add organizerId only if found
        activities: campDataRaw.activities || [], // Ensure activities array exists
      };
      const docRef = await addDoc(campsCollectionRef, campToAdd);
      console.log(`[Success] Document written with ID: ${docRef.id} for camp: ${campDataRaw.name}`);
      successCount++;
    } catch (error) {
      console.error(`[Error] Adding document for camp: ${campDataRaw.name}`, error);
      errorCount++;
    }
  });

  await Promise.all(promises); // Wait for all addDoc operations to complete

  console.log("----------------------------------------");
  console.log("Seeding process finished.");
  console.log(`Successfully added: ${successCount} camps.`);
  console.log(`Failed to add: ${errorCount} camps.`);
  console.log("----------------------------------------");

  // Attempt a clean exit. Depending on the Node environment and Firestore SDK behavior,
  // the process might hang if connections are kept open. Consider force closing if needed.
  // process.exit(errorCount > 0 ? 1 : 0); // Optional: force exit with status code
};

// Execute the function and handle potential top-level errors
seedCamps().catch(error => {
    console.error("Seeding script failed unexpectedly:", error);
    process.exit(1); // Exit with error code if the script itself fails
});

// Note: If the script hangs after "Seeding process finished",
// it might be due to open Firestore connections. You might need to explicitly
// close the Firestore instance or use process.exit() if this is a one-off script.
// However, for simplicity, we'll let Node's default behavior handle termination.
