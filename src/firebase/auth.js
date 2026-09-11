import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

const LOCAL_USER_KEY = 'deeproom_local_user';

const getStoredLocalUser = () => {
  try {
    const data = localStorage.getItem(LOCAL_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setStoredLocalUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch (err) {
    console.warn('[DeepRoom] LocalStorage error:', err);
  }
};

export const normalizeUser = (user) => {
  if (!user) return null;
  const isAnon = Boolean(user.isAnonymous ?? user.is_anonymous);
  return {
    id: user.uid || user.id,
    uid: user.uid || user.id,
    email: user.email || (isAnon ? 'Guest (Unlinked Account)' : 'scholar@example.com'),
    full_name: user.displayName || user.full_name || (isAnon ? 'Guest Scholar' : user.email?.split('@')[0]) || 'DeepRoom Scholar',
    photo_url: user.photoURL || user.photo_url || null,
    is_anonymous: isAnon,
  };
};

export const signInWithEmail = async (email, password) => {
  if (isFirebaseConfigured && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return normalizeUser(cred.user);
  }
  const mockUser = {
    id: 'local_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
    email,
    full_name: email.split('@')[0],
    is_anonymous: false,
  };
  setStoredLocalUser(mockUser);
  return mockUser;
};

export const signUpWithEmail = async (email, password, fullName) => {
  if (isFirebaseConfigured && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (fullName) {
      await updateProfile(cred.user, { displayName: fullName });
    }
    return normalizeUser({ ...cred.user, displayName: fullName || cred.user.displayName });
  }
  const mockUser = {
    id: 'local_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
    email,
    full_name: fullName || email.split('@')[0],
    is_anonymous: false,
  };
  setStoredLocalUser(mockUser);
  return mockUser;
};

export const signInWithGoogle = async () => {
  if (isFirebaseConfigured && auth) {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return normalizeUser(cred.user);
  }
  const mockUser = {
    id: 'local_google_user',
    email: 'scholar@gmail.com',
    full_name: 'Scholar User',
    is_anonymous: false,
  };
  setStoredLocalUser(mockUser);
  return mockUser;
};

export const signInGuest = async () => {
  if (isFirebaseConfigured && auth) {
    const cred = await signInAnonymously(auth);
    return normalizeUser(cred.user);
  }
  const mockId = 'guest_' + Math.random().toString(36).substring(2, 9);
  const mockUser = {
    id: mockId,
    email: `${mockId}@deeproom.local`,
    full_name: 'Guest Scholar',
    is_anonymous: true,
  };
  setStoredLocalUser(mockUser);
  return mockUser;
};

export const logoutUser = async () => {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  setStoredLocalUser(null);
};

export const onAuthChange = (callback) => {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      callback(normalizeUser(firebaseUser));
    });
  }
  const localUser = getStoredLocalUser();
  callback(localUser);
  return () => {};
};

export const getCurrentUser = () => {
  if (isFirebaseConfigured && auth?.currentUser) {
    return normalizeUser(auth.currentUser);
  }
  return getStoredLocalUser();
};
