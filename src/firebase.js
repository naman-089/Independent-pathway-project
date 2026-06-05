import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE
//  1. Go to https://console.firebase.google.com
//  2. Create a project → Add app (web) → Copy the config below
//  3. Enable Email/Password in Authentication → Sign-in methods
//  4. Create a Firestore database (start in test mode for now)
// ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDDlK6xJocsxBs_fkTDizKV2GuJ5rl1v98",
  authDomain: "independence-pathway-project.firebaseapp.com",
  projectId: "independence-pathway-project",
  storageBucket: "independence-pathway-project.firebasestorage.app",
  messagingSenderId: "2415083343",
  appId: "1:2415083343:web:2271917fef7dd7737b8f3a",
  measurementId: "G-Z2T0FX3KRH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
