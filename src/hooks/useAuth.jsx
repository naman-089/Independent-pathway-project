import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Unblock the UI after 5s in case Firebase never responds (poor connection)
    const timeout = setTimeout(() => setLoading(false), 5000);

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      if (firebaseUser) {
        setUser(firebaseUser);
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) setProfile(snap.data());
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  async function signup(email, password, role, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profileData = {
      uid: cred.user.uid,
      email,
      displayName,
      role,           // "family" | "caseworker" | "admin"
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", cred.user.uid), profileData);
    setProfile(profileData);
    return cred;
  }

  async function login(email, password, remember = false) {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (snap.exists()) setProfile(snap.data());
    return cred;
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateDisplayName(newName) {
    await firebaseUpdateProfile(auth.currentUser, { displayName: newName });
    await setDoc(doc(db, "users", user.uid), { displayName: newName }, { merge: true });
    setProfile((p) => ({ ...p, displayName: newName }));
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signup, login, logout, resetPassword, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
