import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  MASTER_GIFTS,
  MASTER_TASKS,
  RETIRED_WISHLIST_GIFT_NAMES,
  WISHLIST_CATALOG_VERSION,
} from '../constants';
import type { BankDetails, Gift, Task } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

interface UseProfileCollectionsOptions {
  viewingUserId: string | null;
  isOwner: boolean;
  hasSeededWishlist?: boolean;
  wishlistCatalogVersion?: number;
  hasSeededTasks?: boolean;
  hasCleanedLegacyWishlistImages?: boolean;
}

const LEGACY_IMAGE_HOST = 'picsum.photos';

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const templateNameMatches = (left?: string, right?: string) => {
  const normalizedLeft = normalizeComparableText(left || '');
  const normalizedRight = normalizeComparableText(right || '');

  return (
    Boolean(normalizedLeft) &&
    Boolean(normalizedRight) &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
};

const findMatchingGiftTemplate = (gift: Partial<Gift>) =>
  MASTER_GIFTS.find((template) =>
    (gift.catalogKey && template.catalogKey === gift.catalogKey) ||
    templateNameMatches(template.name, gift.name)
  );

const isRetiredWishlistGift = (gift: Partial<Gift>) =>
  RETIRED_WISHLIST_GIFT_NAMES.some((retiredName) => templateNameMatches(retiredName, gift.name));

const seedWishlist = async (userId: string) => {
  const batch = writeBatch(db);
  const wishlistRef = collection(db, 'profiles', userId, 'wishlist');

  MASTER_GIFTS.forEach((gift) => {
    batch.set(doc(wishlistRef), gift);
  });

  batch.set(
    doc(db, 'profiles', userId),
    { hasSeededWishlist: true, wishlistCatalogVersion: WISHLIST_CATALOG_VERSION },
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
  if (giftIds.length === 0) {
    await setDoc(
      doc(db, 'profiles', userId),
      { hasCleanedLegacyWishlistImages: true },
      { merge: true }
    );
    return;
  }

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

const syncWishlistCatalog = async (userId: string, existingGifts: Gift[]) => {
  const batch = writeBatch(db);
  const wishlistRef = collection(db, 'profiles', userId, 'wishlist');
  const matchedTemplateKeys = new Set<string>();
  let hasOperations = false;

  existingGifts.forEach((gift) => {
    const template = findMatchingGiftTemplate(gift);

    if (template) {
      matchedTemplateKeys.add(template.catalogKey);

      const nextData: Partial<Gift> = {};

      if (gift.catalogKey !== template.catalogKey) nextData.catalogKey = template.catalogKey;
      if (gift.name !== template.name) nextData.name = template.name;
      if (gift.category !== template.category) nextData.category = template.category;
      if (gift.isRepeatable !== template.isRepeatable) nextData.isRepeatable = template.isRepeatable;
      if ((gift.quantityNeeded || 1) !== (template.quantityNeeded || 1)) nextData.quantityNeeded = template.quantityNeeded;
      if ((gift.price || 0) !== (template.price || 0)) nextData.price = template.price;

      if (!template.isRepeatable && (gift.quantityReserved || 0) !== 0) {
        nextData.quantityReserved = 0;
      }

      if (Object.keys(nextData).length > 0) {
        batch.update(doc(wishlistRef, gift.id), nextData);
        hasOperations = true;
      }

      return;
    }

    if (isRetiredWishlistGift(gift)) {
      batch.delete(doc(wishlistRef, gift.id));
      hasOperations = true;
    }
  });

  MASTER_GIFTS.forEach((template) => {
    if (!matchedTemplateKeys.has(template.catalogKey)) {
      batch.set(doc(wishlistRef), template);
      hasOperations = true;
    }
  });

  batch.set(
    doc(db, 'profiles', userId),
    { wishlistCatalogVersion: WISHLIST_CATALOG_VERSION },
    { merge: true }
  );

  if (!hasOperations) {
    await setDoc(
      doc(db, 'profiles', userId),
      { wishlistCatalogVersion: WISHLIST_CATALOG_VERSION },
      { merge: true }
    );
    return;
  }

  await batch.commit();
};

export const useProfileCollections = ({
  viewingUserId,
  isOwner,
  hasSeededWishlist,
  wishlistCatalogVersion,
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
  const wishlistSyncStartedRef = useRef(false);

  useEffect(() => {
    wishlistSeedStartedRef.current = false;
    taskSeedStartedRef.current = false;
    cleanupStartedRef.current = false;
    wishlistSyncStartedRef.current = false;
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
        const snapshotGifts = snapshot.docs.map((giftDoc) => ({ id: giftDoc.id, ...giftDoc.data() } as Gift));
        setGifts(snapshotGifts);

        if (snapshot.empty && isOwner && !hasSeededWishlist && !wishlistSeedStartedRef.current) {
          wishlistSeedStartedRef.current = true;
          void seedWishlist(viewingUserId).catch((error) => {
            wishlistSeedStartedRef.current = false;
            handleFirestoreError(error, OperationType.WRITE, `profiles/${viewingUserId}/wishlist`);
          });
          return;
        }

        if (
          !snapshot.empty &&
          isOwner &&
          (wishlistCatalogVersion ?? 0) < WISHLIST_CATALOG_VERSION &&
          !wishlistSyncStartedRef.current
        ) {
          wishlistSyncStartedRef.current = true;
          void syncWishlistCatalog(viewingUserId, snapshotGifts)
            .catch((error) => {
              handleFirestoreError(error, OperationType.WRITE, `profiles/${viewingUserId}/wishlist`);
            })
            .finally(() => {
              wishlistSyncStartedRef.current = false;
            });
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `profiles/${viewingUserId}/wishlist`)
    );

    return unsubscribe;
  }, [viewingUserId, isOwner, hasSeededWishlist, wishlistCatalogVersion]);

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
  }, [viewingUserId, isOwner, gifts, hasLoadedWishlist, hasCleanedLegacyWishlistImages]);

  return {
    gifts,
    tasks,
    bankDetails,
  };
};
