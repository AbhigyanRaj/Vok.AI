import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0SSZpVavRRIlad88sUbwTz6iChjQiU34",
  authDomain: "vokai-e2a44.firebaseapp.com",
  projectId: "vokai-e2a44",
  storageBucket: "vokai-e2a44.firebasestorage.app",
  messagingSenderId: "921533585737",
  appId: "1:921533585737:web:12da772a43a4c95fc82298",
  measurementId: "G-P2RFJ4WPYC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Module Firestore helpers
export interface VoiceModule {
  id?: string;
  userId: string;
  name: string;
  questions: string[];
  createdAt: number;
}

export const addVoiceModule = async (userId: string, name: string, questions: string[]) => {
  const docRef = await addDoc(collection(db, "modules"), {
    userId,
    name,
    questions,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const getUserModules = async (userId: string): Promise<VoiceModule[]> => {
  const q = query(collection(db, "modules"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as VoiceModule));
};

export const updateVoiceModule = async (id: string, data: Partial<VoiceModule>) => {
  const docRef = doc(db, "modules", id);
  await updateDoc(docRef, data);
};

export const deleteVoiceModule = async (id: string) => {
  const docRef = doc(db, "modules", id);
  await deleteDoc(docRef);
};

// User profile Firestore helpers
export interface UserProfile {
  uid: string;
  tokens: number;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { uid: docSnap.id, tokens: docSnap.data().tokens };
};

export const createUserProfile = async (uid: string) => {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, { uid, tokens: 100 });
};

export const updateUserTokens = async (uid: string, tokens: number) => {
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, { uid, tokens }, { merge: true });
};

export const incrementUserTokens = async (uid: string, amount: number) => {
  const profile = await getUserProfile(uid);
  if (!profile) return;
  await updateUserTokens(uid, profile.tokens + amount);
};

export const decrementUserTokens = async (uid: string, amount: number) => {
  const profile = await getUserProfile(uid);
  if (!profile || profile.tokens < amount) return false;
  await updateUserTokens(uid, profile.tokens - amount);
  return true;
};

export { auth, googleProvider, db }; 