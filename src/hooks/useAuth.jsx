import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  // Set when Firebase never responds in time — lets the UI explain *why*
  // the user landed back on the sign-in screen instead of looking signed out
  const [connectionIssue, setConnectionIssue] = useState(false);
  // Prevents auto-signout during the brief window when a new account is being created
  // and the Firestore user doc doesn't exist yet
  const signingUpRef = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setConnectionIssue(true);
      setLoading(false);
    }, 5000);

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      setConnectionIssue(false);
      if (firebaseUser) {
        setUser(firebaseUser);
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setProfile(snap.data());
          setLoading(false);
        } else if (!signingUpRef.current) {
          // Profile doc was deleted — sign the user out silently
          await signOut(auth);
          // The subsequent onAuthStateChanged(null) call will finish cleanup
          return;
        } else {
          // Mid-signup: doc not created yet, profile will be set explicitly by signup()
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  async function signup(email, password, role, displayName) {
    signingUpRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const profileData = {
        uid: cred.user.uid,
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", cred.user.uid), profileData);
      setProfile(profileData);
      return cred;
    } finally {
      signingUpRef.current = false;
    }
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
    <AuthContext.Provider value={{ user, profile, loading, connectionIssue, signup, login, logout, resetPassword, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
