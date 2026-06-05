/**
 * ─────────────────────────────────────────────────────────────────
 *  Independence Pathway Platform — Bulk Data Seed Script
 *  Run once: node seed.js
 *
 *  What it does:
 *   1. Creates caseworker + admin Firebase Auth accounts
 *   2. Writes their user profiles to Firestore /users
 *   3. Seeds 12 real Ontario organizations into /organizations
 *   4. Seeds 6 sample family intake profiles into /intakes + /users
 * ─────────────────────────────────────────────────────────────────
 *
 *  SETUP:
 *   1. npm install firebase (already done)
 *   2. Paste your Firebase config below
 *   3. node seed.js
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

// ─── PASTE YOUR FIREBASE CONFIG HERE ───────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
// ────────────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─────────────────────────────────────────────────────────────────
//  ACCOUNTS TO CREATE
// ─────────────────────────────────────────────────────────────────

const ACCOUNTS = [
  // Admin
  { email: "admin@ipp.demo",        password: "Demo1234!", role: "admin",      displayName: "Platform Admin" },
  // Caseworkers
  { email: "sarah.m@reena.demo",    password: "Demo1234!", role: "caseworker", displayName: "Sarah Mitchell" },
  { email: "david.k@reena.demo",    password: "Demo1234!", role: "caseworker", displayName: "David Kim" },
];

// ─────────────────────────────────────────────────────────────────
//  12 REAL ONTARIO ORGANIZATIONS
// ─────────────────────────────────────────────────────────────────

const ORGANIZATIONS = [
  {
    name: "Reena Community Residence",
    shortName: "REENA",
    description: "Intentional community apartments in Thornhill with on-site support. Residents are full tenants of their own units with 24/7 staff in the building. Jewish community values, culturally responsive programming.",
    phone: "(905) 889-6484",
    website: "https://reena.org",
    supportLevel: "medium",
    housingTypes: ["Own apartment in a supported building", "Intentional community"],
    tags: ["Supported Housing", "Life Skills", "Day Program"],
    regions: ["Thornhill / Vaughan", "York Region"],
    hasOpenings: true,
    openingCount: 2,
    minReadiness: 40,
  },
  {
    name: "Community Living Toronto",
    shortName: "CLT",
    description: "Life skills coaching, employment supports, and day programs across Toronto. One of Ontario's largest providers. Partner organization with a dedicated Reena referral pathway.",
    phone: "(416) 968-0650",
    website: "https://communitylivingtoronto.ca",
    supportLevel: "medium",
    housingTypes: ["Shared home with peers", "Small group home", "Own apartment in a supported building"],
    tags: ["Supported Housing", "Life Skills", "Employment", "Day Program"],
    regions: ["Toronto (GTA)", "Scarborough", "Etobicoke / Mississauga", "North York"],
    hasOpenings: true,
    openingCount: 5,
    minReadiness: 20,
  },
  {
    name: "Surrey Place",
    shortName: "SURREY",
    description: "Specialized services for adults with developmental disabilities and dual diagnoses. Clinical assessments, supported housing, and life skills. Multilingual staff. Expertise in complex needs.",
    phone: "(416) 925-5141",
    website: "https://surreyplace.ca",
    supportLevel: "high",
    housingTypes: ["Shared home with peers", "Small group home"],
    tags: ["Supported Housing", "Mental Health", "Life Skills"],
    regions: ["Toronto (GTA)", "North York", "York Region"],
    hasOpenings: false,
    openingCount: 0,
    minReadiness: 0,
  },
  {
    name: "Empower Simcoe",
    shortName: "EMPOWER",
    description: "Supported employment matching and life skills for adults with developmental disabilities. Job coaching, employer partnerships, and workplace support across Ontario. Strong employment outcomes.",
    phone: "(705) 737-3263",
    website: "https://empowersimcoe.ca",
    supportLevel: "low",
    housingTypes: ["Own apartment in a supported building", "Host family / homeshare"],
    tags: ["Employment", "Life Skills", "Supported Housing"],
    regions: ["York Region", "Other Ontario"],
    hasOpenings: true,
    openingCount: 3,
    minReadiness: 50,
  },
  {
    name: "Kinark Child & Family Services",
    shortName: "KINARK",
    description: "Transition planning and residential supports for young adults moving from children's services into adult developmental services. Expertise in 18+ transition, continuity of care, and family engagement.",
    phone: "(905) 474-9595",
    website: "https://kinark.on.ca",
    supportLevel: "medium",
    housingTypes: ["Small group home", "Shared home with peers"],
    tags: ["Supported Housing", "Life Skills"],
    regions: ["York Region", "Durham Region", "Toronto (GTA)"],
    hasOpenings: true,
    openingCount: 1,
    minReadiness: 15,
  },
  {
    name: "Christian Horizons",
    shortName: "CH",
    description: "Faith-based residential and day support services across Ontario. Individualized support in group homes and supported independent living. Strong community integration philosophy.",
    phone: "(519) 648-2288",
    website: "https://christianhorizons.org",
    supportLevel: "high",
    housingTypes: ["Small group home", "Shared home with peers", "Own apartment in a supported building"],
    tags: ["Supported Housing", "Day Program", "Life Skills"],
    regions: ["Other Ontario", "Toronto (GTA)"],
    hasOpenings: true,
    openingCount: 4,
    minReadiness: 10,
  },
  {
    name: "Participation House (Markham)",
    shortName: "PART.HOUSE",
    description: "Residential and day services in York Region. Specializes in adults with complex physical and developmental needs. Accessible units, personal support workers, 24/7 care available.",
    phone: "(905) 475-6390",
    website: "https://participationhouse.com",
    supportLevel: "high",
    housingTypes: ["Small group home", "Own apartment in a supported building"],
    tags: ["Supported Housing", "Life Skills", "Day Program"],
    regions: ["York Region", "Thornhill / Vaughan", "Scarborough"],
    hasOpenings: true,
    openingCount: 2,
    minReadiness: 0,
  },
  {
    name: "Geneva Centre for Autism",
    shortName: "GENEVA",
    description: "Specialized services and supported living for autistic adults. Structured programming, employment support, and life skills coaching. Evidence-based behavioural approaches.",
    phone: "(416) 322-7877",
    website: "https://autism.net",
    supportLevel: "medium",
    housingTypes: ["Own apartment in a supported building", "Shared home with peers"],
    tags: ["Supported Housing", "Employment", "Life Skills", "Day Program"],
    regions: ["Toronto (GTA)", "North York", "Scarborough"],
    hasOpenings: false,
    openingCount: 0,
    minReadiness: 35,
  },
  {
    name: "L'Arche Toronto",
    shortName: "L'ARCHE",
    description: "Intentional community homes where people with and without intellectual disabilities live and work together. Strong focus on relationship, belonging, and spiritual life. Culturally diverse community.",
    phone: "(416) 916-0260",
    website: "https://larche.ca",
    supportLevel: "medium",
    housingTypes: ["Intentional community", "Shared home with peers"],
    tags: ["Supported Housing", "Day Program"],
    regions: ["Toronto (GTA)", "North York"],
    hasOpenings: true,
    openingCount: 1,
    minReadiness: 30,
  },
  {
    name: "YWCA Toronto — Developmental Services",
    shortName: "YWCA",
    description: "Supported housing and employment for women with developmental disabilities. Feminist, trauma-informed approach. Programs include life skills, peer support, and employment readiness.",
    phone: "(416) 961-8100",
    website: "https://ywcatoronto.org",
    supportLevel: "medium",
    housingTypes: ["Own apartment in a supported building", "Shared home with peers"],
    tags: ["Supported Housing", "Employment", "Life Skills", "Cultural Services"],
    regions: ["Toronto (GTA)", "Etobicoke / Mississauga", "North York"],
    hasOpenings: true,
    openingCount: 2,
    minReadiness: 25,
  },
  {
    name: "TAIBU Community Health Centre",
    shortName: "TAIBU",
    description: "Culturally responsive services for Black communities, including adults with developmental disabilities. Navigation, case management, and referral to developmental services. Reduces systemic barriers for Black families.",
    phone: "(416) 644-3536",
    website: "https://taibuhealth.ca",
    supportLevel: "low",
    housingTypes: [],
    tags: ["Life Skills", "Cultural Services", "Legal Aid"],
    regions: ["Scarborough", "Toronto (GTA)"],
    hasOpenings: true,
    openingCount: 0,
    minReadiness: 0,
  },
  {
    name: "Reena — Supported Independent Living (SIL)",
    shortName: "REENA SIL",
    description: "Reena's Supported Independent Living program for individuals who want to live in their own apartment with periodic support rather than in a community residence. Flexible, person-centred, lower staffing ratio.",
    phone: "(905) 889-6484",
    website: "https://reena.org",
    supportLevel: "low",
    housingTypes: ["Own apartment in a supported building", "Host family / homeshare"],
    tags: ["Supported Housing", "Life Skills", "Employment"],
    regions: ["Thornhill / Vaughan", "York Region", "North York"],
    hasOpenings: true,
    openingCount: 3,
    minReadiness: 60,
  },
];

// ─────────────────────────────────────────────────────────────────
//  6 SAMPLE FAMILY INTAKE PROFILES
// ─────────────────────────────────────────────────────────────────

const FAMILY_PROFILES = [
  {
    account: { email: "chen.family@demo.ipp", password: "Demo1234!", displayName: "Linda Chen" },
    intake: {
      individualName: "Jordan Chen",
      individualAge: "24",
      caregiverName: "Linda Chen",
      livingSituation: "Living with family",
      visionStatement: "I want to have my own apartment, go to work, and cook my own meals. I want to be close to my family but have my own space.",
      priorities: ["Employment", "Having friends nearby", "Routine & structure", "Privacy & independence"],
      skills: { cooking: "reminders", budgeting: "some_help", transit: "independent", medication: "reminders", hygiene: "independent", communication: "reminders" },
      sdmInPlace: "in_progress",
      odspRegistered: "yes",
      hensonTrust: "no",
      legalNotes: "Working with a lawyer at ARCH Disability Law on SDM agreement.",
      supportLevel: "low",
      housingPreferences: ["Own apartment in a supported building"],
      preferredRegion: "Thornhill / Vaughan",
      additionalNotes: "Jewish family. Close to Reena community. Jordan loves art and wants to continue exhibiting work.",
      status: "submitted",
    },
  },
  {
    account: { email: "patel.family@demo.ipp", password: "Demo1234!", displayName: "Priya Patel" },
    intake: {
      individualName: "Arjun Patel",
      individualAge: "19",
      caregiverName: "Priya Patel",
      livingSituation: "Living with family",
      visionStatement: "Arjun wants to live with a small group of friends and have a job. He loves computers and gaming.",
      priorities: ["Employment", "Having friends nearby", "Community involvement", "Creative expression"],
      skills: { cooking: "some_help", budgeting: "full_support", transit: "some_help", medication: "independent", hygiene: "independent", communication: "reminders" },
      sdmInPlace: "no",
      odspRegistered: "applied",
      hensonTrust: "no",
      legalNotes: "",
      supportLevel: "medium",
      housingPreferences: ["Shared home with peers", "Small group home"],
      preferredRegion: "Scarborough",
      additionalNotes: "South Asian family. Hindu faith. Arjun has autism and thrives with visual schedules and structured routines.",
      status: "submitted",
    },
  },
  {
    account: { email: "robinson.family@demo.ipp", password: "Demo1234!", displayName: "Marcus Robinson" },
    intake: {
      individualName: "Destiny Robinson",
      individualAge: "28",
      caregiverName: "Marcus Robinson",
      livingSituation: "Group home",
      visionStatement: "Destiny wants to move into her own place and be more independent. She's been in a group home for 5 years and is ready for something more.",
      priorities: ["Privacy & independence", "Community involvement", "Physical activity", "Cultural connection"],
      skills: { cooking: "reminders", budgeting: "reminders", transit: "reminders", medication: "independent", hygiene: "independent", communication: "independent" },
      sdmInPlace: "no",
      odspRegistered: "yes",
      hensonTrust: "in_progress",
      legalNotes: "Henson Trust being set up through Black Legal Action Centre.",
      supportLevel: "low",
      housingPreferences: ["Own apartment in a supported building", "Intentional community"],
      preferredRegion: "Scarborough",
      additionalNotes: "Black family. Connected to TAIBU health centre. Destiny loves dancing and community events.",
      status: "submitted",
    },
  },
  {
    account: { email: "kowalski.family@demo.ipp", password: "Demo1234!", displayName: "Anna Kowalski" },
    intake: {
      individualName: "Tomasz Kowalski",
      individualAge: "33",
      caregiverName: "Anna Kowalski",
      livingSituation: "Living with family",
      visionStatement: "We are aging and cannot care for Tomasz much longer. He needs a safe place with people who understand him.",
      priorities: ["Routine & structure", "Having friends nearby", "Physical activity"],
      skills: { cooking: "full_support", budgeting: "full_support", transit: "full_support", medication: "some_help", hygiene: "some_help", communication: "some_help" },
      sdmInPlace: "yes",
      odspRegistered: "yes",
      hensonTrust: "yes",
      legalNotes: "Full legal planning complete. Guardianship with older brother Stefan.",
      supportLevel: "high",
      housingPreferences: ["Small group home", "Intentional community"],
      preferredRegion: "Etobicoke / Mississauga",
      additionalNotes: "Polish Catholic family. Tomasz has Down syndrome with moderate-high support needs. Needs familiar, stable environment. Parents are 72 and 74.",
      status: "submitted",
    },
  },
  {
    account: { email: "nguyen.family@demo.ipp", password: "Demo1234!", displayName: "Linh Nguyen" },
    intake: {
      individualName: "Mai Nguyen",
      individualAge: "22",
      caregiverName: "Linh Nguyen",
      livingSituation: "Living with family",
      visionStatement: "Mai wants to work and live near our family but have her own independence. She wants to cook Vietnamese food and be part of the community.",
      priorities: ["Employment", "Cultural connection", "Having friends nearby", "Routine & structure"],
      skills: { cooking: "reminders", budgeting: "some_help", transit: "independent", medication: "reminders", hygiene: "independent", communication: "reminders" },
      sdmInPlace: "no",
      odspRegistered: "no",
      hensonTrust: "no",
      legalNotes: "Family not yet connected to legal services. Language barrier has been a challenge.",
      supportLevel: "medium",
      housingPreferences: ["Own apartment in a supported building", "Shared home with peers"],
      preferredRegion: "Scarborough",
      additionalNotes: "Vietnamese family. Primary language Vietnamese at home. Mai has mild intellectual disability. Family wants culturally sensitive services.",
      status: "submitted",
    },
  },
  {
    account: { email: "martin.family@demo.ipp", password: "Demo1234!", displayName: "James Martin" },
    intake: {
      individualName: "Tyler Martin",
      individualAge: "20",
      caregiverName: "James Martin",
      livingSituation: "Living with family",
      visionStatement: "Tyler wants to get a job and eventually his own place. He's very social and wants to be around people.",
      priorities: ["Employment", "Having friends nearby", "Community involvement", "Creative expression"],
      skills: { cooking: "some_help", budgeting: "some_help", transit: "reminders", medication: "reminders", hygiene: "independent", communication: "independent" },
      sdmInPlace: "no",
      odspRegistered: "applied",
      hensonTrust: "no",
      legalNotes: "",
      supportLevel: "medium",
      housingPreferences: ["Shared home with peers", "Own apartment in a supported building"],
      preferredRegion: "North York",
      additionalNotes: "Tyler has autism spectrum disorder, level 1. Very communicative, loves music and wants to DJ. Single-parent household.",
      status: "submitted",
    },
  },
];

// ─────────────────────────────────────────────────────────────────
//  SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────

async function createAccount(email, password, role, displayName) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      role,
      createdAt: new Date().toISOString(),
    });
    console.log(`  ✅ Created ${role}: ${email} (uid: ${cred.user.uid.slice(0,8)}…)`);
    return cred.user.uid;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log(`  ⚠️  ${email} already exists — skipping account creation`);
      return null;
    }
    throw err;
  }
}

async function seedOrganizations() {
  console.log("\n📦 Seeding organizations…");
  for (const org of ORGANIZATIONS) {
    await addDoc(collection(db, "organizations"), {
      ...org,
      createdAt: new Date().toISOString(),
    });
    console.log(`  ✅ ${org.name}`);
  }
}

async function seedFamilies() {
  console.log("\n👨‍👩‍👧 Seeding family profiles…");
  for (const { account, intake } of FAMILY_PROFILES) {
    const uid = await createAccount(account.email, account.password, "family", account.displayName);
    if (uid) {
      await setDoc(doc(db, "intakes", uid), {
        ...intake,
        uid,
        submittedAt: new Date().toISOString(),
      });
      // Mark intake complete on user doc
      await setDoc(doc(db, "users", uid), { intakeComplete: true }, { merge: true });
      console.log(`  📋 Intake saved for ${intake.individualName}`);
    }
  }
}

async function seedStaff() {
  console.log("\n👤 Seeding staff accounts…");
  for (const acc of ACCOUNTS) {
    await createAccount(acc.email, acc.password, acc.role, acc.displayName);
  }
}

// ─────────────────────────────────────────────────────────────────
//  RUN
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Independence Pathway Platform — Seed Script");
  console.log("================================================\n");

  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.error("❌ You need to paste your Firebase config into this file first!");
    console.error("   Open seed.js and replace the firebaseConfig placeholder values.\n");
    process.exit(1);
  }

  try {
    await seedStaff();
    await seedOrganizations();
    await seedFamilies();

    console.log("\n================================================");
    console.log("✅ All done! Here are your demo accounts:\n");
    console.log("  ADMIN");
    console.log("  Email:    admin@ipp.demo");
    console.log("  Password: Demo1234!\n");
    console.log("  CASEWORKERS");
    console.log("  Email:    sarah.m@reena.demo  / Demo1234!");
    console.log("  Email:    david.k@reena.demo  / Demo1234!\n");
    console.log("  FAMILIES (all password: Demo1234!)");
    FAMILY_PROFILES.forEach(({ account, intake }) => {
      console.log(`  ${intake.individualName.padEnd(18)} → ${account.email}`);
    });
    console.log("\n  Open the app and sign in with any of the above accounts.");
    console.log("================================================\n");
  } catch (err) {
    console.error("\n❌ Seed failed:", err.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
