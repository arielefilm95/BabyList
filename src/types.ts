export interface Gift {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  purchaseUrl?: string;
  price?: number;
  isReserved: boolean;
  reservedBy?: string;
  isRepeatable: boolean;
  quantityNeeded?: number;
  quantityReserved?: number;
}

export interface CartItem {
  gift: Gift;
  quantity: number;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  phase: 'Early' | 'Mid' | 'Late';
  isCompleted: boolean;
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  reservedBy?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'gift' | 'task' | 'system';
  createdAt: any;
  isRead: boolean;
  targetId?: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  description: string;
  date: string;
  createdAt: any;
  userId: string;
}

export interface BankDetails {
  bankName: string;
  accountType: string;
  accountNumber: string;
  rut: string;
  email: string;
  fullName: string;
}

export interface Profile {
  id: string;
  parent1Name: string;
  parent1Gender?: 'male' | 'female' | 'other';
  parent2Name: string;
  parent2Gender?: 'male' | 'female' | 'other';
  babyNames: string[];
  babyName?: string;
  babyCount: number;
  dueDate: string;
  pregnancyStartDate: string;
  gestationWeekAtStart?: number;
  gestationDaysAtStart?: number;
  role?: 'admin' | 'user';
  createdAt: any;
  hasSeededWishlist?: boolean;
  wishlistCatalogVersion?: number;
  hasSeededTasks?: boolean;
  hasCleanedLegacyWishlistImages?: boolean;
}
