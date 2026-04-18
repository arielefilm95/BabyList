export interface Gift {
  id: string;
  catalogKey?: string;
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
  catalogKey?: string;
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
  pregnancyStartDate?: string;
  gestationWeekAtStart?: number;
  gestationDaysAtStart?: number;
  role?: 'admin' | 'user';
  createdAt: any;
  hasSeededWishlist?: boolean;
  wishlistCatalogVersion?: number;
  hasSeededTasks?: boolean;
  hasCleanedLegacyWishlistImages?: boolean;
}

export type DonationCategory =
  | 'Ropa'
  | 'Juguetes'
  | 'Alimentación'
  | 'Cuna y mueble'
  | 'Paseo y transporte'
  | 'Higiene y salud'
  | 'Otros';

export type DonationCondition = 'Nuevo' | 'Como nuevo' | 'Bueno' | 'Regular';
export type DonationStatus = 'disponible' | 'reservado' | 'donado';
export type DonationContactMethod = 'whatsapp' | 'phone' | 'email';
export type DonationRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorBabyDueDate?: string;
  title: string;
  description: string;
  category: DonationCategory;
  condition: DonationCondition;
  quantity: number;
  imageUrls: string[];
  location: {
    city: string;
    commune: string;
  };
  status: DonationStatus;
  reservedBy?: string;
  reservedByName?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface DonationRequest {
  id: string;
  donationId: string;
  donationTitle: string;
  donationImageUrl?: string;
  donorId: string;
  donorName: string;
  requesterId: string;
  requesterName: string;
  requesterBabyDueDate?: string;
  requesterMessage?: string;
  status: DonationRequestStatus;
  donorContactMethod?: DonationContactMethod;
  donorContactValue?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface DonationContact {
  donationId: string;
  donorId: string;
  contactMethod: DonationContactMethod;
  contactValue: string;
  updatedAt: any;
}
