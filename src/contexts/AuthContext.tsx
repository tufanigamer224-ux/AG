import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_OWNER_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
  initMessagingIfSupported,
} from '../lib/firebase';
import { UserProfile, Wallet } from '../types/esports';

interface SignUpInput {
  mobileNumber: string;
  email: string;
  gameName: string;
  freeFireUid: string;
  password: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  wallet: Wallet | null;
  authReady: boolean;
  needsProfileCompletion: boolean;
  isAdminUser: boolean;
  signUpWithEmail: (input: SignUpInput) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  completeGoogleProfile: (input: {
    mobileNumber: string;
    gameName: string;
    freeFireUid: string;
  }) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  updateProfileDetails: (input: {
    mobileNumber: string;
    gameName: string;
    freeFireUid: string;
  }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  useEffect(() => {
    initMessagingIfSupported();

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setWallet(null);
        setNeedsProfileCompletion(false);
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const userPath = `users/${firebaseUser.uid}`;
    const walletPath = `wallets/${firebaseUser.uid}`;
    let userLoaded = false;
    let walletLoaded = false;

    const markReadyIfBoth = () => {
      if (userLoaded && walletLoaded) {
        setAuthReady(true);
      }
    };

    const unsubUser = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
          setNeedsProfileCompletion(false);
        } else {
          setProfile(null);
          setNeedsProfileCompletion(true);
        }
        userLoaded = true;
        markReadyIfBoth();
      },
      (error) => {
        userLoaded = true;
        markReadyIfBoth();
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    const unsubWallet = onSnapshot(
      doc(db, 'wallets', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setWallet(snap.data() as Wallet);
        } else {
          setWallet({
            userId: firebaseUser.uid,
            totalBalance: 0,
            depositBalance: 0,
            winningBalance: 0,
          });
        }
        walletLoaded = true;
        markReadyIfBoth();
      },
      (error) => {
        walletLoaded = true;
        markReadyIfBoth();
        handleFirestoreError(error, OperationType.GET, walletPath);
      }
    );

    return () => {
      unsubUser();
      unsubWallet();
    };
  }, [firebaseUser]);

  const signUpWithEmail = async (input: SignUpInput) => {
    const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    const uid = cred.user.uid;
    const batch = writeBatch(db);

    batch.set(doc(db, 'users', uid), {
      uid,
      mobileNumber: input.mobileNumber.trim(),
      email: input.email.trim().toLowerCase(),
      gameName: input.gameName.trim(),
      freeFireUid: input.freeFireUid.trim(),
      role: 'player',
      totalMatches: 0,
      totalWins: 0,
      totalKills: 0,
      winRate: 0,
      totalEarnings: 0,
      currentRank: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'wallets', uid), {
      userId: uid,
      totalBalance: 0,
      depositBalance: 0,
      winningBalance: 0,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists()) {
      setNeedsProfileCompletion(true);
    }
  };

  const completeGoogleProfile = async (input: {
    mobileNumber: string;
    gameName: string;
    freeFireUid: string;
  }) => {
    if (!auth.currentUser) throw new Error('Not authenticated.');
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);

    batch.set(doc(db, 'users', uid), {
      uid,
      mobileNumber: input.mobileNumber.trim(),
      email: (auth.currentUser.email || '').toLowerCase(),
      gameName: input.gameName.trim(),
      freeFireUid: input.freeFireUid.trim(),
      photoUrl: auth.currentUser.photoURL || '',
      role: 'player',
      totalMatches: 0,
      totalWins: 0,
      totalKills: 0,
      winRate: 0,
      totalEarnings: 0,
      currentRank: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const walletSnap = await getDoc(doc(db, 'wallets', uid));
    if (!walletSnap.exists()) {
      batch.set(doc(db, 'wallets', uid), {
        userId: uid,
        totalBalance: 0,
        depositBalance: 0,
        winningBalance: 0,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      setNeedsProfileCompletion(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateProfileDetails = async (input: {
    mobileNumber: string;
    gameName: string;
    freeFireUid: string;
  }) => {
    if (!auth.currentUser) throw new Error('Not authenticated.');
    const uid = auth.currentUser.uid;
    try {
      await updateDoc(doc(db, 'users', uid), {
        mobileNumber: input.mobileNumber.trim(),
        gameName: input.gameName.trim(),
        freeFireUid: input.freeFireUid.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('Password updates require an email/password account.');
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdminUser = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email === ADMIN_OWNER_EMAIL
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        wallet,
        authReady,
        needsProfileCompletion,
        isAdminUser,
        signUpWithEmail,
        loginWithEmail,
        loginWithGoogle,
        completeGoogleProfile,
        sendResetEmail,
        updateProfileDetails,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
