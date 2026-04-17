import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { MASTER_GIFTS, MASTER_TASKS } from '../constants';
import type { BankDetails, Gift, Task } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

interface UseProfileCollectionsOptions {
  viewingUserId: string | null;
  isOwner: boolean;
  hasSeededWishlist?: boolean;
  hasSeededTasks?: boolean;
  hasCleanedLegacyWishlistImages?: boolean;
}

const LEGACY_IMAGE_HOST = 'picsum.photos';

const seedWishlist = async (userId: string) => {
  const batch = writeBatch(db);
  const wishlistRef = collection(db, 'profiles', userId, 'wishlist');

  MASTER_GIFTS.forEach((gift) => {
    batch.set(doc(wishlistRef), gift);
  });

  batch.set(
    doc(db, 'profiles', userId),
    { hasSeededWishlist: true },
    { merge: true }
  );

  await batch.commit();
};

const seedTasks = async (userId: string) => {
  const batch = writeBatch(db);
  const tasksRef = collection(db, 'profiles', userId, 'tasks');

  MASTER_TASKS.forEach((task) => {
    batch.set(doc(tasksRef), task);
  });

  batch.set(
    doc(db, 'profiles', userId),
    { hasSeededTasks: true },
    { merge: true }
  );

  await batch.commit();
};

const cleanupLegacyWishlistImages = async (userId: string, giftIds: string[]) => {
  const batch = writeBatch(db);

  giftIds.forEach((giftId) => {
    batch.update(doc(db, 'profiles', userId, 'wishlist', giftId), {
      imageUrl: '',
    });
  });

  batch.set(
    doc(db, 'profiles', userId),
    { hasCleanedLegacyWishlistImages: true },
    { merge: true }
  );

  await batch.commit();
};

export const useProfileCollections = ({
  viewingUserId,
  isOwner,
  hasSeededWishlist,
  hasSeededTasks,
  hasCleanedLegacyWishlistImages,
}: UseProfileCollectionsOptions) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [hasLoadedWishlist, setHasLoadedWishlist] = useState(false);

  const wishlistSeedStartedRef = useRef(false);
  const taskSeedStartedRef = useRef(false);
  const cleanupStartedRef = useRef(false);

  useEffect(() => {
    wishlistSeedStartedRef.current = false;
    taskSeedStartedRef.current = false;
    cleanupStartedRef.current = false;
    setHasLoadedWishlist(false);
  }, [viewingUserId]);

  useEffect(() => {
    if (!viewingUserId) {
      setGifts([]);
      setHasLoadedWishlist(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'profiles', viewingUserId, 'wishlist')),
      (snapshot) => {
        setHasLoadedWishlist(true);
        setGifts(snapshot.docs.map((giftDoc) => ({ id: giftDoc.id, ...giftDoc.data() } as Gift)));

        if (snapshot.empty && isOwner && !hasSeededWishlist && !wishlistSeedStartedRef.current) {
          wishlistSeedStartedRef.current = true;
          void seedWishlist(viewingUserId).catch((error) => {
            wishlistSeedStartedRef.current = false;
            handleFirestoreError(error, OperationType.WRITE, `profiles/${viewingUserId}/wishlist`);
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/wishlist`)
    );

    return unsubscribe;
  }, [viewingUserId, isOwner, hasSeededWishlist]);

  useEffect(() => {
    if (!viewingUserId || !isOwner) {
      setTasks([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'profiles', viewingUserId, 'tasks')),
      (snapshot) => {
        setTasks(snapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() } as Task)));

        if (snapshot.empty && !hasSeededTasks && !taskSeedStartedRef.current) {
          taskSeedStartedRef.current = true;
          void seedTasks(viewingUserId).catch((error) => {
            taskSeedStartedRef.current = false;
            handleFirestoreError(error, OperationType.WRITE, `profiles/${viewingUserId}/tasks`);
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/tasks`)
    );

    return unsubscribe;
  }, [viewingUserId, isOwner, hasSeededTasks]);

  useEffect(() => {
    if (!viewingUserId) {
      setBankDetails(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'profiles', viewingUserId, 'settings', 'bankDetails'), (docSnap) => {
      setBankDetails(docSnap.exists() ? (docSnap.data() as BankDetails) : null);
    });

    return unsubscribe;
  }, [viewingUserId]);

  useEffect(() => {
    if (
      !viewingUserId ||
      !isOwner ||
      !hasLoadedWishlist ||
      hasCleanedLegacyWishlistImages ||
      cleanupStartedRef.current
    ) {
      return;
    }

    const legacyGiftIds = gifts
      .filter((gift) => gift.imageUrl && gift.imageUrl.includes(LEGACY_IMAGE_HOST))
      .map((gift) => gift.id);

    cleanupStartedRef.current = true;

    void cleanupLegacyWishlistImages(viewingUserId, legacyGiftIds).catch((error) => {
      cleanupStartedRef.current = false;
      handleFirestoreError(error, OperationType.WRITE, `profiles/${viewingUserId}/wishlist`);
    });
  }, [
    viewingUserId,
    isOwner,
    gifts,
    hasLoadedWishlist,
    hasCleanedLegacyWishlistImages,
  ]);

  return {
    gifts,
    tasks,
    bankDetails,
  };
};
