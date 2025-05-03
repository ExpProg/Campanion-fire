
// src/scripts/seed-camps.ts
// To run this script, you might need ts-node: npm install -D ts-node
// Then execute: npx ts-node src/scripts/seed-camps.ts
// Ensure your FIREBASE_CONFIG environment variables or other auth method is set up.

import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Adjust path as necessary

// Interface matching the desired Firestore structure (based on Camp in dashboard/page.tsx)
interface CampFirestoreData {
  name: string;
  description: string;
  dates: string;
  location: string;
  imageUrl: string;
  price: number;
  organizerEmail: string; // Keep email for potential display or fallback
  organizerId?: string; // Optional: Added to link to the user's UID
  createdAt: Timestamp; // Use Firestore Timestamp for consistency
  activities?: string[]; // Added based on create camp form
}

// Data copied from src/app/dashboard/page.tsx sampleCamps
const sampleCampsData = [
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

  console.log(`Starting to seed ${sampleCampsData.length} camps for organizer: ${organizerEmail}...`);
  console.log("Attempting to find organizer's UID...");

  // Get the organizer's UID based on their email
  const organizerId = await getUserIdByEmail(organizerEmail);
  if (organizerId) {
      console.log(`Found organizer UID: ${organizerId}. Proceeding with seeding.`);
  } else {
      console.warn("Could not find organizer UID. Camps will be seeded without organizerId link.");
  }

  console.log("Ensure Firebase security rules allow writes to the 'camps' collection.");

  const promises = sampleCampsData.map(async (campData) => {
    try {
      const campToAdd: CampFirestoreData = {
        ...campData,
        organizerEmail: organizerEmail,
        createdAt: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
        ...(organizerId && { organizerId: organizerId }), // Add organizerId only if found
        activities: campData.activities || [], // Ensure activities array exists
      };
      const docRef = await addDoc(campsCollectionRef, campToAdd);
      console.log(`[Success] Document written with ID: ${docRef.id} for camp: ${campData.name}`);
      successCount++;
    } catch (error) {
      console.error(`[Error] Adding document for camp: ${campData.name}`, error);
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
