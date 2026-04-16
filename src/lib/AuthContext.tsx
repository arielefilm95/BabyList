import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailOrUsername: (identifier: string, password: string) => Promise<void>;
  registerWithEmailAndPasswordAndUsername: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setIsAuthReady(true);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'profiles', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile({ id: doc.id, ...doc.data() } as Profile);
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
    }, (error) => {
      console.error("Error fetching profile:", error);
      setIsAuthReady(true);
    });

    return unsubscribeProfile;
  }, [user]);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const loginWithEmailOrUsername = async (identifier: string, password: string) => {
    try {
      let emailToUse = identifier;
      
      // If no @ symbol, assume it is a username and query for the email
      if (!identifier.includes('@')) {
        const usernameDoc = await getDoc(doc(db, 'usernames', identifier.toLowerCase()));
        if (usernameDoc.exists()) {
          emailToUse = usernameDoc.data().email;
        } else {
          throw new Error('Nombre de usuario no encontrado');
        }
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
    } catch (error) {
      console.error('Error in loginWithEmailOrUsername:', error);
      throw error;
    }
  }

  const registerWithEmailAndPasswordAndUsername = async (email: string, username: string, password: string) => {
    try {
      // Check if username exists
      const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
      if (usernameDoc.exists()) {
        throw new Error('El nombre de usuario ya está en uso');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save username mapping
      await setDoc(doc(db, 'usernames', username.toLowerCase()), { 
        email: email,
        uid: userCredential.user.uid
      });

    } catch (error) {
      console.error('Error in register:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const deleteUserAccount = async () => {
    if (!user) return;
    try {
      try {
        const usernameQuery = query(collection(db, 'usernames'), where('uid', '==', user.uid));
        const usernameDocs = await getDocs(usernameQuery);
        for(const uDoc of usernameDocs.docs) {
          await deleteDoc(doc(db, 'usernames', uDoc.id));
        }
      } catch(e) {
        console.error("Error deleting username mapping", e);
      }
      
      try {
        await deleteDoc(doc(db, 'profiles', user.uid));
      } catch(e) {
        console.error("Error deleting profile", e);
      }
      
      await deleteUser(user);
    } catch (error) {
      console.error("Error deleting user. Might require re-authentication.", error);
      throw error;
    }
  }

  const isAdmin = profile?.role === 'admin' || user?.email === 'aaes17@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isAuthReady, loginWithGoogle, loginWithEmailOrUsername, registerWithEmailAndPasswordAndUsername, logout, deleteUserAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
