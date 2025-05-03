// src/scripts/seed-camps.ts
// To run this script, you might need ts-node: npm install -D ts-node
// Then execute: npx ts-node src/scripts/seed-camps.ts
// Ensure your FIREBASE_CONFIG environment variables or other auth method is set up.

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Adjust path as necessary

// Interface matching the desired Firestore structure (based on Camp in dashboard/page.tsx)
interface CampFirestoreData {
  name: string;
  description: string;
  dates: string;
  location: string;
  imageUrl: string;
  price: number;
  organizerEmail: string; // Added based on user request
  // organizerId?: string; // Optional: Could be added if UID for admin@admin.com is known
  createdAt: Timestamp; // Use Firestore Timestamp for consistency
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
  },
  {
    name: 'Creative Arts Camp Beta',
    description: 'Unleash your creativity with painting, pottery, and music workshops.',
    dates: 'August 5 - August 15, 2024',
    location: 'Forest Retreat, CA',
    imageUrl: 'https://picsum.photos/seed/camp2/600/400',
    price: 950,
  },
    {
    name: 'Science Explorers Gamma',
    description: 'Dive into the world of science with hands-on experiments and discovery.',
    dates: 'July 22 - August 1, 2024',
    location: 'Coastal Institute, ME',
    imageUrl: 'https://picsum.photos/seed/camp3/600/400',
    price: 1100,
  },
   {
    name: 'Wilderness Survival Delta',
    description: 'Learn essential survival skills in a challenging and rewarding environment.',
    dates: 'September 1 - September 10, 2024',
    location: 'Appalachian Trail, NC',
    imageUrl: 'https://picsum.photos/seed/camp4/600/400',
    price: 1350,
  },
];

const seedCamps = async () => {
  const campsCollectionRef = collection(db, 'camps');
  const organizerEmail = 'admin@admin.com'; // As requested by the user
  let successCount = 0;
  let errorCount = 0;

  console.log(`Starting to seed ${sampleCampsData.length} camps for organizer: ${organizerEmail}...`);
  console.log("Ensure Firebase security rules allow writes to the 'camps' collection.");

  const promises = sampleCampsData.map(async (campData) => {
    try {
      const campToAdd: CampFirestoreData = {
        ...campData,
        organizerEmail: organizerEmail,
        createdAt: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
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
