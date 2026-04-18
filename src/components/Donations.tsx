import React, { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import {
  DONATION_CATEGORIES,
  DONATION_CONDITIONS,
  CHILEAN_REGIONS,
  DONATION_CATEGORY_CONFIG,
  DONATION_CONDITION_CONFIG,
} from '../constants';
import type {
  Donation,
  DonationCategory,
  DonationCondition,
  DonationContact,
  DonationContactMethod,
  DonationRequest,
  DonationRequestStatus,
} from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Baby,
  Camera,
  Check,
  Filter,
  Gift,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  X,
} from 'lucide-react';

const MAX_DONATION_IMAGES = 5;
const MAX_DONATION_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const DONATION_UPLOAD_ROUTE = '/api/donations/upload';
const DONATION_DELETE_IMAGES_ROUTE = '/api/donations/delete-images';
const VERCEL_BLOB_MULTIPART_THRESHOLD_BYTES = 4_500_000;


const REQUEST_STATUS_LABELS: Record<DonationRequestStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const REQUEST_STATUS_STYLES: Record<DonationRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-teal-100 text-teal-700',
  rejected: 'bg-stone-200 text-stone-700',
  cancelled: 'bg-stone-200 text-stone-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const DONATION_STATUS_LABELS: Record<Donation['status'], string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  donado: 'Entregado',
};

const DONATION_STATUS_STYLES: Record<Donation['status'], string> = {
  disponible: 'bg-teal-100 text-teal-700',
  reservado: 'bg-amber-100 text-amber-700',
  donado: 'bg-emerald-100 text-emerald-700',
};

type LocalDonationImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type DonationFormState = {
  title: string;
  description: string;
  category: DonationCategory;
  condition: DonationCondition;
  quantity: number;
  city: string;
  commune: string;
  contactValue: string;
};

const EMPTY_DONATION_FORM: DonationFormState = {
  title: '',
  description: '',
  category: 'Ropa',
  condition: 'Bueno',
  quantity: 1,
  city: '',
  commune: '',
  contactValue: '',
};

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const getTimestampMs = (value: unknown) => {
  if (value && typeof value === 'object') {
    const maybeTimestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTimestamp.toMillis === 'function') return maybeTimestamp.toMillis();
    if (typeof maybeTimestamp.seconds === 'number') return maybeTimestamp.seconds * 1000;
  }

  if (typeof value === 'string') {
    const parsedDate = Date.parse(value);
    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  }

  return 0;
};

function sortNewestFirst<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((left, right) => getTimestampMs(right.createdAt) - getTimestampMs(left.createdAt));
}

const buildRequesterName = (parent1Name: string, parent2Name: string) =>
  [parent1Name, parent2Name].filter(Boolean).join(' y ');

const getContactHref = (method: DonationContactMethod, value: string) => {
  const trimmedValue = value.trim();

  if (method === 'whatsapp') {
    const digitsOnly = trimmedValue.replace(/\D/g, '');
    return digitsOnly ? `https://wa.me/${digitsOnly}` : null;
  }

  if (method === 'phone') {
    return trimmedValue ? `tel:${trimmedValue}` : null;
  }

  return trimmedValue ? `mailto:${trimmedValue}` : null;
};

const getContactActionLabel = (method: DonationContactMethod) => {
  if (method === 'whatsapp') return 'Abrir WhatsApp';
  if (method === 'phone') return 'Llamar';
  return 'Enviar email';
};

const getContactActionIcon = (method: DonationContactMethod) => {
  if (method === 'phone') return Phone;
  return MessageCircle;
};

const normalizeWhatsAppValue = (value: string) => {
  return value.trim();
};

const validateWhatsAppValue = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return 'Debes indicar un número de WhatsApp para tu donación.';
  if (trimmedValue.replace(/\D/g, '').length < 8) return 'Ingresa un número de WhatsApp válido para coordinar la entrega.';

  return null;
};

export const Donations = () => {
  const { user, profile } = useAuth();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImagesRef = useRef<LocalDonationImage[]>([]);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<DonationRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<DonationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [submittingDonation, setSubmittingDonation] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<LocalDonationImage[]>([]);
  const [requestingDonation, setRequestingDonation] = useState<Donation | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  const [filterCity, setFilterCity] = useState('');
  const [filterCommune, setFilterCommune] = useState('');
  const [filterCategory, setFilterCategory] = useState<DonationCategory | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<DonationFormState>(EMPTY_DONATION_FORM);

  const hasBabyOnTheWay = profile?.dueDate && new Date(profile.dueDate) > new Date();

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => () => {
    selectedImagesRef.current.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    const donationsQuery = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const nextDonations = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
        })) as Donation[];
        setDonations(nextDonations);
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Error loading donations:', snapshotError);
        setError('No pudimos cargar las donaciones. Revisa los permisos de Firestore para esta base.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setIncomingRequests([]);
      return;
    }

    const incomingQuery = query(collection(db, 'donationRequests'), where('donorId', '==', user.uid));
    const unsubscribe = onSnapshot(incomingQuery, (snapshot) => {
      const nextRequests = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      })) as DonationRequest[];
      setIncomingRequests(sortNewestFirst<DonationRequest>(nextRequests));
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOutgoingRequests([]);
      return;
    }

    const outgoingQuery = query(collection(db, 'donationRequests'), where('requesterId', '==', user.uid));
    const unsubscribe = onSnapshot(outgoingQuery, (snapshot) => {
      const nextRequests = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      })) as DonationRequest[];
      setOutgoingRequests(sortNewestFirst<DonationRequest>(nextRequests));
    });

    return unsubscribe;
  }, [user]);

  const publicDonations = donations.filter((donation) => donation.status === 'disponible' && donation.donorId !== user?.uid);
  const myDonations: Donation[] = sortNewestFirst<Donation>(
    donations.filter((donation) => donation.donorId === user?.uid)
  );

  const filteredDonations = publicDonations.filter((donation) => {
    if (filterCity && donation.location.city !== filterCity) return false;
    if (filterCommune && donation.location.commune !== filterCommune) return false;
    if (filterCategory && donation.category !== filterCategory) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      if (
        !donation.title.toLowerCase().includes(search) &&
        !donation.description.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const pendingIncomingRequests = incomingRequests.filter((request) => request.status === 'pending');
  const requestCountsByDonationId = pendingIncomingRequests.reduce<Record<string, number>>((accumulator, request) => {
    accumulator[request.donationId] = (accumulator[request.donationId] ?? 0) + 1;
    return accumulator;
  }, {});

  const acceptedRequestByDonationId = incomingRequests.reduce<Record<string, DonationRequest>>((accumulator, request) => {
    if ((request.status === 'accepted' || request.status === 'completed') && !accumulator[request.donationId]) {
      accumulator[request.donationId] = request;
    }
    return accumulator;
  }, {});

  const activeOutgoingRequestByDonationId = outgoingRequests.reduce<Record<string, DonationRequest>>((accumulator, request) => {
    if ((request.status === 'pending' || request.status === 'accepted' || request.status === 'completed') && !accumulator[request.donationId]) {
      accumulator[request.donationId] = request;
    }
    return accumulator;
  }, {});

  const cities = CHILEAN_REGIONS.map((region) => region.name.replace(' de Santiago', ''));
  const selectedRegion = CHILEAN_REGIONS.find(
    (region) => region.name.replace(' de Santiago', '') === formData.city
  );
  const communes = selectedRegion?.cities || [];

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const nextValue = name === 'quantity' ? Math.max(1, Number(value) || 1) : value;
    setFormData((current) => ({ ...current, [name]: nextValue }));

    if (name === 'city') {
      setFormData((current) => ({ ...current, commune: '' }));
    }
  };

  const clearSelectedImages = () => {
    selectedImagesRef.current.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl);
    });
    selectedImagesRef.current = [];
    setSelectedImages([]);
  };

  const resetDonationForm = () => {
    setFormData(EMPTY_DONATION_FORM);
    setEditingDonation(null);
    setExistingImageUrls([]);
    clearSelectedImages();
  };

  const openCreateDialog = () => {
    resetDonationForm();
    setShowAddDialog(true);
  };

  const openEditDialog = async (donation: Donation) => {
    clearSelectedImages();
    setEditingDonation(donation);
    setExistingImageUrls(donation.imageUrls ?? []);

    let contactFormValues = {
      contactValue: '',
    };

    try {
      const contactSnapshot = await getDoc(doc(db, 'donationContacts', donation.id));
      if (contactSnapshot.exists()) {
        const contactData = contactSnapshot.data() as Omit<DonationContact, 'donationId'>;
        contactFormValues = {
          contactValue: contactData.contactMethod === 'email' ? '' : contactData.contactValue,
        };
      }
    } catch (contactError) {
      console.error('Error loading donation contact:', contactError);
    }

    setFormData({
      title: donation.title,
      description: donation.description,
      category: donation.category,
      condition: donation.condition,
      quantity: donation.quantity,
      city: donation.location.city,
      commune: donation.location.commune,
      ...contactFormValues,
    });
    setShowAddDialog(true);
  };

  const handleDialogChange = (open: boolean) => {
    setShowAddDialog(open);
    if (!open && !submittingDonation) {
      resetDonationForm();
    }
  };

  const handleRequestDialogChange = (open: boolean) => {
    if (!open && !requestSubmitting) {
      setRequestingDonation(null);
      setRequestMessage('');
    }
  };

  const appendSelectedImages = (fileList: FileList | null) => {
    if (!fileList) return;

    const candidateFiles = Array.from(fileList);
    const validFiles = candidateFiles.filter((file) => file.type.startsWith('image/'));
    const validSizedFiles = validFiles.filter((file) => file.size <= MAX_DONATION_IMAGE_SIZE_BYTES);
    const totalImagesCount = existingImageUrls.length + selectedImagesRef.current.length;
    const availableSlots = Math.max(0, MAX_DONATION_IMAGES - totalImagesCount);

    if (!availableSlots) {
      alert(`Solo puedes subir hasta ${MAX_DONATION_IMAGES} fotos por donacion.`);
      return;
    }

    const filesToAdd = validSizedFiles.slice(0, availableSlots);

    if (candidateFiles.length !== validFiles.length) {
      alert('Solo se permiten archivos de imagen.');
    } else if (validFiles.length !== validSizedFiles.length) {
      alert('Cada imagen debe pesar menos de 8 MB.');
    } else if (validSizedFiles.length > availableSlots) {
      alert(`Solo puedes subir hasta ${MAX_DONATION_IMAGES} fotos por donacion.`);
    }

    if (!filesToAdd.length) return;

    const nextImages = filesToAdd.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedImages((current) => [...current, ...nextImages]);
  };

  const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    appendSelectedImages(event.target.files);
    event.target.value = '';
  };

  const handleRemoveImage = (imageId: string) => {
    setSelectedImages((current) => {
      const imageToRemove = current.find((image) => image.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return current.filter((image) => image.id !== imageId);
    });
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImageUrls((current) => current.filter((url) => url !== imageUrl));
  };

  const uploadSelectedImages = async (userId: string) => {
    if (!selectedImagesRef.current.length) return [];
    if (!user) {
      throw new Error('Debes iniciar sesion para subir imagenes.');
    }

    const uploadGroupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const idToken = await user.getIdToken();

    return Promise.all(
      selectedImagesRef.current.map(async ({ file }, index) => {
        const safeName = sanitizeFileName(file.name || `image-${index + 1}.jpg`) || `image-${index + 1}.jpg`;
        const pathname = `donations/${userId}/${uploadGroupId}/${index + 1}-${safeName}`;
        const blob = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: DONATION_UPLOAD_ROUTE,
          clientPayload: JSON.stringify({ userId }),
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          multipart: file.size > VERCEL_BLOB_MULTIPART_THRESHOLD_BYTES,
          ...(file.type ? { contentType: file.type } : {}),
        });

        return blob.url;
      })
    );
  };

  const deleteDonationImages = async (userId: string, urls: string[]) => {
    if (!urls.length) return;
    if (!user) {
      throw new Error('Debes iniciar sesion para borrar imagenes.');
    }

    const idToken = await user.getIdToken();
    const response = await fetch(DONATION_DELETE_IMAGES_ROUTE, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId,
        urls,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || 'No pudimos borrar las imagenes antiguas.');
    }
  };

  const handleSubmitDonation = async () => {
    if (!user || !profile) return;
    if (!formData.title || !formData.description || !formData.city || !formData.commune) {
      alert('Por favor completa todos los campos.');
      return;
    }

    const contactError = validateWhatsAppValue(formData.contactValue);
    if (contactError) {
      alert(contactError);
      return;
    }

    setSubmittingDonation(true);
    try {
      const removedImageUrls = editingDonation
        ? (editingDonation.imageUrls ?? []).filter((imageUrl) => !existingImageUrls.includes(imageUrl))
        : [];
      const uploadedImageUrls = await uploadSelectedImages(user.uid);
      const imageUrls = [...existingImageUrls, ...uploadedImageUrls];
      const donationPayload = {
        donorName: buildRequesterName(profile.parent1Name, profile.parent2Name),
        donorBabyDueDate: profile.dueDate,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        condition: formData.condition,
        quantity: formData.quantity,
        imageUrls,
        location: {
          city: formData.city,
          commune: formData.commune,
        },
        updatedAt: serverTimestamp(),
      };

      const donationContactPayload = {
        donationId: editingDonation?.id ?? '',
        donorId: user.uid,
        contactMethod: 'whatsapp' as DonationContactMethod,
        contactValue: normalizeWhatsAppValue(formData.contactValue),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);

      if (editingDonation) {
        if (editingDonation.donorId !== user.uid) {
          throw new Error('Solo puedes editar tus propias donaciones.');
        }

        const donationRef = doc(db, 'donations', editingDonation.id);
        batch.update(donationRef, donationPayload);
        batch.set(doc(db, 'donationContacts', editingDonation.id), {
          ...donationContactPayload,
          donationId: editingDonation.id,
        });
      } else {
        const donationRef = doc(collection(db, 'donations'));
        batch.set(donationRef, {
          donorId: user.uid,
          ...donationPayload,
          status: 'disponible',
          createdAt: serverTimestamp(),
        });
        batch.set(doc(db, 'donationContacts', donationRef.id), {
          ...donationContactPayload,
          donationId: donationRef.id,
        });
      }

      await batch.commit();

      if (removedImageUrls.length > 0) {
        try {
          await deleteDonationImages(user.uid, removedImageUrls);
        } catch (cleanupError) {
          console.error('Error deleting removed donation images:', cleanupError);
        }
      }

      setShowAddDialog(false);
      resetDonationForm();
    } catch (error) {
      console.error('Error saving donation:', error);
      alert(error instanceof Error ? error.message : 'No pudimos guardar la donacion.');
    } finally {
      setSubmittingDonation(false);
    }
  };

  const openRequestDialog = (donation: Donation) => {
    if (!user || !profile) {
      alert('Inicia sesion para solicitar una donacion.');
      return;
    }

    const activeRequest = activeOutgoingRequestByDonationId[donation.id];
    if (activeRequest && (activeRequest.status === 'pending' || activeRequest.status === 'accepted' || activeRequest.status === 'completed')) {
      alert('Ya tienes una solicitud activa para esta donacion.');
      return;
    }

    setRequestMessage('');
    setRequestingDonation(donation);
  };

  const handleSubmitRequest = async () => {
    if (!user || !profile || !requestingDonation) return;

    const activeRequest = activeOutgoingRequestByDonationId[requestingDonation.id];
    if (activeRequest && (activeRequest.status === 'pending' || activeRequest.status === 'accepted' || activeRequest.status === 'completed')) {
      alert('Ya tienes una solicitud activa para esta donacion.');
      return;
    }

    setRequestSubmitting(true);
    try {
      const requesterName = buildRequesterName(profile.parent1Name, profile.parent2Name);
      const donationRequestRef = await addDoc(collection(db, 'donationRequests'), {
        donationId: requestingDonation.id,
        donationTitle: requestingDonation.title,
        donationImageUrl: requestingDonation.imageUrls?.[0] ?? '',
        donorId: requestingDonation.donorId,
        donorName: requestingDonation.donorName,
        requesterId: user.uid,
        requesterName,
        requesterBabyDueDate: profile.dueDate,
        requesterMessage: requestMessage.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'profiles', requestingDonation.donorId, 'notifications'), {
        title: 'Nueva solicitud de donacion',
        message: `${requesterName} quiere coordinar "${requestingDonation.title}".`,
        type: 'gift',
        isRead: false,
        targetId: donationRequestRef.id,
        createdAt: serverTimestamp(),
      });

      setRequestingDonation(null);
      setRequestMessage('');
    } catch (error) {
      console.error('Error creating donation request:', error);
      alert(error instanceof Error ? error.message : 'No pudimos enviar tu solicitud.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleAcceptRequest = async (request: DonationRequest) => {
    if (!user) return;

    try {
      const contactSnapshot = await getDoc(doc(db, 'donationContacts', request.donationId));
      if (!contactSnapshot.exists()) {
        throw new Error('Antes de aceptar, agrega un medio de contacto editando tu donacion.');
      }

      const contactData = contactSnapshot.data() as DonationContact;
      const requestsSnapshot = await getDocs(query(collection(db, 'donationRequests'), where('donationId', '==', request.donationId)));
      const batch = writeBatch(db);

      batch.update(doc(db, 'donations', request.donationId), {
        status: 'reservado',
        reservedBy: request.requesterId,
        reservedByName: request.requesterName,
        updatedAt: serverTimestamp(),
      });

      requestsSnapshot.docs.forEach((snapshotDoc) => {
        const requestData = snapshotDoc.data() as DonationRequest;

        if (snapshotDoc.id === request.id) {
          batch.update(snapshotDoc.ref, {
            status: 'accepted',
            donorContactMethod: contactData.contactMethod,
            donorContactValue: contactData.contactValue,
            updatedAt: serverTimestamp(),
          });
          return;
        }

        if (requestData.status === 'pending') {
          batch.update(snapshotDoc.ref, {
            status: 'rejected',
            updatedAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();

      await addDoc(collection(db, 'profiles', request.requesterId, 'notifications'), {
        title: 'Solicitud aceptada',
        message: `Tu solicitud por "${request.donationTitle}" fue aceptada. Ya puedes ver el contacto del donante.`,
        type: 'gift',
        isRead: false,
        targetId: request.id,
        createdAt: serverTimestamp(),
      });

      const otherPendingRequests = requestsSnapshot.docs
        .filter((snapshotDoc) => snapshotDoc.id !== request.id)
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as DonationRequest),
        }))
        .filter((requestData) => requestData.status === 'pending');

      await Promise.all(
        otherPendingRequests.map((requestData) =>
          addDoc(collection(db, 'profiles', requestData.requesterId, 'notifications'), {
            title: 'Solicitud rechazada',
            message: `La donacion "${requestData.donationTitle}" ya fue coordinada con otra familia.`,
            type: 'gift',
            isRead: false,
            targetId: requestData.id,
            createdAt: serverTimestamp(),
          })
        )
      );
    } catch (error) {
      console.error('Error accepting donation request:', error);
      alert(error instanceof Error ? error.message : 'No pudimos aceptar la solicitud.');
    }
  };

  const handleRejectRequest = async (request: DonationRequest) => {
    try {
      await updateDoc(doc(db, 'donationRequests', request.id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'profiles', request.requesterId, 'notifications'), {
        title: 'Solicitud rechazada',
        message: `La solicitud por "${request.donationTitle}" no fue aceptada.`,
        type: 'gift',
        isRead: false,
        targetId: request.id,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting donation request:', error);
      alert(error instanceof Error ? error.message : 'No pudimos rechazar la solicitud.');
    }
  };

  const handleReopenDonation = async (donation: Donation) => {
    if (!user || donation.donorId !== user.uid) return;

    try {
      const requestsSnapshot = await getDocs(query(collection(db, 'donationRequests'), where('donationId', '==', donation.id)));
      const batch = writeBatch(db);

      batch.update(doc(db, 'donations', donation.id), {
        status: 'disponible',
        reservedBy: deleteField(),
        reservedByName: deleteField(),
        updatedAt: serverTimestamp(),
      });

      const cancelledRequests = requestsSnapshot.docs
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ref: snapshotDoc.ref,
          ...(snapshotDoc.data() as DonationRequest),
        }))
        .filter((requestData) => requestData.status === 'accepted');

      cancelledRequests.forEach((requestData) => {
        batch.update(requestData.ref, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      await Promise.all(
        cancelledRequests.map((requestData) =>
          addDoc(collection(db, 'profiles', requestData.requesterId, 'notifications'), {
            title: 'Coordinacion cancelada',
            message: `La donacion "${requestData.donationTitle}" volvió a quedar disponible.`,
            type: 'gift',
            isRead: false,
            targetId: requestData.id,
            createdAt: serverTimestamp(),
          })
        )
      );
    } catch (error) {
      console.error('Error reopening donation:', error);
      alert(error instanceof Error ? error.message : 'No pudimos volver a publicar la donacion.');
    }
  };

  const handleMarkDonationCompleted = async (donation: Donation) => {
    if (!user || donation.donorId !== user.uid) return;

    try {
      const requestsSnapshot = await getDocs(query(collection(db, 'donationRequests'), where('donationId', '==', donation.id)));
      const batch = writeBatch(db);

      batch.update(doc(db, 'donations', donation.id), {
        status: 'donado',
        updatedAt: serverTimestamp(),
      });

      const acceptedRequests = requestsSnapshot.docs
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ref: snapshotDoc.ref,
          ...(snapshotDoc.data() as DonationRequest),
        }))
        .filter((requestData) => requestData.status === 'accepted');

      acceptedRequests.forEach((requestData) => {
        batch.update(requestData.ref, {
          status: 'completed',
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      await Promise.all(
        acceptedRequests.map((requestData) =>
          addDoc(collection(db, 'profiles', requestData.requesterId, 'notifications'), {
            title: 'Donacion entregada',
            message: `La coordinacion por "${requestData.donationTitle}" fue marcada como completada.`,
            type: 'gift',
            isRead: false,
            targetId: requestData.id,
            createdAt: serverTimestamp(),
          })
        )
      );
    } catch (error) {
      console.error('Error completing donation:', error);
      alert(error instanceof Error ? error.message : 'No pudimos marcar la donacion como entregada.');
    }
  };

  const clearFilters = () => {
    setFilterCity('');
    setFilterCommune('');
    setFilterCategory('');
    setSearchQuery('');
  };

  const hasActiveFilters = Boolean(filterCity || filterCommune || filterCategory || searchQuery);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={handleDialogChange}>
        <Dialog open={Boolean(requestingDonation)} onOpenChange={handleRequestDialogChange}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-stone-800">
                <Gift className="h-6 w-6 text-rose-500" />
                Donaciones
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {hasBabyOnTheWay
                  ? 'Tu bebé está en camino. Aquí puedes donar, solicitar y coordinar donaciones.'
                  : 'Explora donaciones disponibles y ayuda a otras familias.'}
              </p>
            </div>

            {profile && (
              <DialogTrigger asChild>
                <Button className="bg-rose-500 hover:bg-rose-600" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Donar algo
                </Button>
              </DialogTrigger>
            )}
          </div>

          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                {editingDonation ? 'Editar donacion' : 'Donar articulo'}
              </DialogTitle>
            </DialogHeader>

            {!hasBabyOnTheWay ? (
              <div className="space-y-4 py-8 text-center">
                <Baby className="mx-auto h-16 w-16 text-stone-300" />
                <p className="text-stone-600">
                  Para donar, necesitas tener un perfil con un bebé en camino activo.
                </p>
                <p className="text-sm text-stone-500">
                  Completa tu perfil con la fecha de parto para participar.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titulo *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ej: Bodies de recien nacido (0-3M)"
                    value={formData.title}
                    onChange={handleInputChange}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe el articulo: estado, talla, marca, cantidad..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Fotos</Label>
                    <span className="text-xs text-stone-500">
                      Hasta {MAX_DONATION_IMAGES} imagenes de 8 MB
                    </span>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageInputChange}
                    className="hidden"
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageInputChange}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={submittingDonation || existingImageUrls.length + selectedImages.length >= MAX_DONATION_IMAGES}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Camara
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={submittingDonation || existingImageUrls.length + selectedImages.length >= MAX_DONATION_IMAGES}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Galeria
                    </Button>
                  </div>

                  {existingImageUrls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-500">Fotos guardadas</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {existingImageUrls.map((imageUrl) => (
                          <div key={imageUrl} className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                            <img
                              src={imageUrl}
                              alt="Foto guardada de la donacion"
                              className="h-28 w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(imageUrl)}
                              className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-stone-600 shadow-sm transition hover:bg-white"
                              aria-label="Quitar imagen guardada"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-500">Fotos nuevas</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {selectedImages.map((image) => (
                          <div key={image.id} className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                            <img
                              src={image.previewUrl}
                              alt="Vista previa de donacion"
                              className="h-28 w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.id)}
                              className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-stone-600 shadow-sm transition hover:bg-white"
                              aria-label="Quitar imagen"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800"
                    >
                      {DONATION_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Condicion *</Label>
                    <select
                      id="condition"
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800"
                    >
                      {DONATION_CONDITIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <select
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800"
                    >
                      <option value="">Seleccionar...</option>
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commune">Comuna *</Label>
                    <select
                      id="commune"
                      name="commune"
                      value={formData.commune}
                      onChange={handleInputChange}
                      disabled={!formData.city}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800 disabled:opacity-50"
                    >
                      <option value="">Seleccionar...</option>
                      {communes.map((commune) => (
                        <option key={commune} value={commune}>
                          {commune}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div>
                    <Label className="text-sm font-medium text-stone-800">WhatsApp para coordinar</Label>
                    <p className="mt-1 text-xs text-stone-500">
                      Este número no se muestra en público. Solo se comparte con quien aceptes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactValue">Número de WhatsApp</Label>
                    <Input
                      id="contactValue"
                      name="contactValue"
                      placeholder="+56 9 1234 5678"
                      value={formData.contactValue}
                      onChange={handleInputChange}
                      maxLength={120}
                    />
                    <p className="text-xs text-stone-500">
                      Usaremos este número para crear un enlace directo a WhatsApp cuando aceptes una solicitud.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => handleDialogChange(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmitDonation}
                    disabled={submittingDonation}
                    className="flex-1 bg-rose-500 hover:bg-rose-600"
                  >
                    {submittingDonation
                      ? editingDonation
                        ? 'Guardando...'
                        : 'Publicando...'
                      : editingDonation
                        ? 'Guardar cambios'
                        : 'Publicar donacion'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                Solicitar donacion
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="font-medium text-stone-800">{requestingDonation?.title}</p>
                <p className="mt-1 text-sm text-stone-500">
                  Se enviará una solicitud al donante. Si la acepta, verás su contacto aquí mismo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestMessage">Mensaje para el donante (opcional)</Label>
                <Textarea
                  id="requestMessage"
                  placeholder="Ej: Me interesa mucho, puedo retirarlo esta semana."
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => handleRequestDialogChange(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={requestSubmitting}
                  className="flex-1 bg-rose-500 hover:bg-rose-600"
                >
                  {requestSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Dialog>

      {pendingIncomingRequests.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-800">Solicitudes recibidas</h3>
            <p className="text-sm text-stone-500">
              Revisa quién quiere tus donaciones antes de compartir tu contacto.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pendingIncomingRequests.map((request) => (
              <IncomingRequestCard
                key={request.id}
                request={request}
                onAccept={() => handleAcceptRequest(request)}
                onReject={() => handleRejectRequest(request)}
              />
            ))}
          </div>
        </section>
      )}

      {outgoingRequests.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-800">Mis solicitudes</h3>
            <p className="text-sm text-stone-500">
              Aquí ves el estado de cada solicitud y el contacto cuando sea aceptada.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {outgoingRequests.map((request) => (
              <OutgoingRequestCard key={request.id} request={request} />
            ))}
          </div>
        </section>
      )}

      {myDonations.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-800">Mis donaciones</h3>
            <p className="text-sm text-stone-500">
              Administra tus publicaciones, solicitudes pendientes y entregas coordinadas.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myDonations.map((donation) => (
              <MyDonationCard
                key={donation.id}
                donation={donation}
                pendingRequestCount={requestCountsByDonationId[donation.id] ?? 0}
                acceptedRequest={acceptedRequestByDonationId[donation.id]}
                onEdit={() => openEditDialog(donation)}
                onReopen={() => handleReopenDonation(donation)}
                onMarkCompleted={() => handleMarkDonationCompleted(donation)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-800">Donaciones disponibles</h3>
          <p className="text-sm text-stone-500">
            Explora publicaciones públicas y envía una solicitud si te interesa alguna.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Buscar donaciones..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-stone-100' : ''}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && <span className="ml-2 h-2 w-2 rounded-full bg-rose-500" />}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <select
                    value={filterCity}
                    onChange={(event) => {
                      setFilterCity(event.target.value);
                      setFilterCommune('');
                    }}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800"
                  >
                    <option value="">Todas</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Comuna</Label>
                  <select
                    value={filterCommune}
                    onChange={(event) => setFilterCommune(event.target.value)}
                    disabled={!filterCity}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800 disabled:opacity-50"
                  >
                    <option value="">Todas</option>
                    {CHILEAN_REGIONS.find(
                      (region) => region.name.replace(' de Santiago', '') === filterCity
                    )?.cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select
                    value={filterCategory}
                    onChange={(event) => setFilterCategory(event.target.value as DonationCategory | '')}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-stone-800"
                  >
                    <option value="">Todas</option>
                    {DONATION_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredDonations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="mx-auto mb-4 h-16 w-16 text-stone-200" />
              <h3 className="mb-2 text-lg font-medium text-stone-600">
                {hasActiveFilters ? 'No hay donaciones con esos filtros' : 'No hay donaciones disponibles'}
              </h3>
              <p className="mb-4 text-sm text-stone-500">
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros o buscar en otra zona.'
                  : 'Todavía no hay publicaciones disponibles en este momento.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : profile && hasBabyOnTheWay ? (
                <Button onClick={openCreateDialog} className="bg-rose-500 hover:bg-rose-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Donar algo
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDonations.map((donation) => (
              <PublicDonationCard
                key={donation.id}
                donation={donation}
                currentUserId={user?.uid}
                activeRequest={activeOutgoingRequestByDonationId[donation.id]}
                onRequest={() => openRequestDialog(donation)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface PublicDonationCardProps {
  donation: Donation;
  currentUserId?: string;
  activeRequest?: DonationRequest;
  onRequest: () => void;
}

const PublicDonationCard: React.FC<PublicDonationCardProps> = ({
  donation,
  currentUserId,
  activeRequest,
  onRequest,
}) => {
  const categoryConfig = DONATION_CATEGORY_CONFIG[donation.category] || DONATION_CATEGORY_CONFIG.Otros;
  const conditionConfig = DONATION_CONDITION_CONFIG[donation.condition];
  const activeStatus = activeRequest?.status;

  const requestButtonText =
    activeStatus === 'pending'
      ? 'Solicitud enviada'
      : activeStatus === 'accepted'
        ? 'Solicitud aceptada'
        : activeStatus === 'completed'
          ? 'Donacion coordinada'
          : 'Me interesa';

  const requestDisabled = Boolean(activeStatus === 'pending' || activeStatus === 'accepted' || activeStatus === 'completed');

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <DonationImageBanner donation={donation} emoji={categoryConfig.emoji} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-base">{donation.title}</CardTitle>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${DONATION_STATUS_STYLES[donation.status]}`}>
            {DONATION_STATUS_LABELS[donation.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${categoryConfig.bgColor} ${categoryConfig.textColor}`}>
            {categoryConfig.emoji} {donation.category}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${conditionConfig.bgColor} text-stone-600`}>
            {donation.condition}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2 text-sm">{donation.description}</CardDescription>

        <div className="flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="h-3 w-3" />
          <span>
            {donation.location.commune}, {donation.location.city}
          </span>
        </div>

        {donation.donorBabyDueDate && (
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <Baby className="h-3 w-3" />
            <span>Bebé en camino del donante</span>
          </div>
        )}

        <div className="pt-2">
          {!currentUserId ? (
            <p className="text-center text-xs text-stone-400">Inicia sesion para solicitarla</p>
          ) : (
            <Button
              onClick={onRequest}
              size="sm"
              disabled={requestDisabled}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-stone-200 disabled:text-stone-500"
            >
              <Heart className="mr-1 h-4 w-4" />
              {requestButtonText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface MyDonationCardProps {
  donation: Donation;
  pendingRequestCount: number;
  acceptedRequest?: DonationRequest;
  onEdit: () => void;
  onReopen: () => void;
  onMarkCompleted: () => void;
}

const MyDonationCard: React.FC<MyDonationCardProps> = ({
  donation,
  pendingRequestCount,
  acceptedRequest,
  onEdit,
  onReopen,
  onMarkCompleted,
}) => {
  const categoryConfig = DONATION_CATEGORY_CONFIG[donation.category] || DONATION_CATEGORY_CONFIG.Otros;
  const conditionConfig = DONATION_CONDITION_CONFIG[donation.condition];

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <DonationImageBanner donation={donation} emoji={categoryConfig.emoji} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-base">{donation.title}</CardTitle>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${DONATION_STATUS_STYLES[donation.status]}`}>
            {DONATION_STATUS_LABELS[donation.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${categoryConfig.bgColor} ${categoryConfig.textColor}`}>
            {categoryConfig.emoji} {donation.category}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${conditionConfig.bgColor} text-stone-600`}>
            {donation.condition}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2 text-sm">{donation.description}</CardDescription>

        <div className="space-y-1 text-xs text-stone-500">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>
              {donation.location.commune}, {donation.location.city}
            </span>
          </div>
          {pendingRequestCount > 0 && <p>{pendingRequestCount} solicitud(es) pendiente(s)</p>}
          {acceptedRequest && <p>Coordinada con: {acceptedRequest.requesterName}</p>}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {donation.status === 'disponible' && (
            <Button onClick={onEdit} size="sm" variant="outline" className="w-full">
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
          )}

          {donation.status === 'reservado' && (
            <>
              <Button onClick={onMarkCompleted} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Check className="mr-1 h-4 w-4" />
                Marcar entregada
              </Button>
              <Button onClick={onReopen} size="sm" variant="outline" className="w-full">
                Volver a publicar
              </Button>
            </>
          )}

          {donation.status === 'donado' && (
            <Button onClick={onReopen} size="sm" variant="outline" className="w-full">
              Volver a publicar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface IncomingRequestCardProps {
  request: DonationRequest;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingRequestCard: React.FC<IncomingRequestCardProps> = ({ request, onAccept, onReject }) => (
  <Card className="border-amber-200 bg-amber-50/50">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{request.donationTitle}</CardTitle>
          <CardDescription>{request.requesterName}</CardDescription>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${REQUEST_STATUS_STYLES[request.status]}`}>
          {REQUEST_STATUS_LABELS[request.status]}
        </span>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {request.requesterBabyDueDate && (
        <p className="text-xs text-stone-500">Fecha estimada del bebé: {request.requesterBabyDueDate}</p>
      )}
      {request.requesterMessage ? (
        <p className="rounded-xl bg-white/90 p-3 text-sm text-stone-600">{request.requesterMessage}</p>
      ) : (
        <p className="text-sm text-stone-500">Sin mensaje adicional.</p>
      )}

      <div className="flex gap-3">
        <Button onClick={onReject} variant="outline" className="flex-1">
          Rechazar
        </Button>
        <Button onClick={onAccept} className="flex-1 bg-rose-500 hover:bg-rose-600">
          Aceptar
        </Button>
      </div>
    </CardContent>
  </Card>
);

interface OutgoingRequestCardProps {
  request: DonationRequest;
}

const OutgoingRequestCard: React.FC<OutgoingRequestCardProps> = ({ request }) => {
  const contactHref =
    request.donorContactMethod && request.donorContactValue
      ? getContactHref(request.donorContactMethod, request.donorContactValue)
      : null;

  const ContactIcon = request.donorContactMethod ? getContactActionIcon(request.donorContactMethod) : MessageCircle;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{request.donationTitle}</CardTitle>
            <CardDescription>Donante: {request.donorName}</CardDescription>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${REQUEST_STATUS_STYLES[request.status]}`}>
            {REQUEST_STATUS_LABELS[request.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.requesterMessage ? (
          <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{request.requesterMessage}</p>
        ) : (
          <p className="text-sm text-stone-500">Sin mensaje adicional.</p>
        )}

        {(request.status === 'accepted' || request.status === 'completed') && request.donorContactMethod && request.donorContactValue ? (
          <div className="space-y-2 rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-medium text-teal-800">Contacto del donante</p>
            <p className="text-sm text-teal-700">
              {request.donorContactMethod === 'email'
                ? request.donorContactValue
                : request.donorContactMethod === 'phone'
                  ? `Teléfono: ${request.donorContactValue}`
                  : `WhatsApp: ${request.donorContactValue}`}
            </p>
            {contactHref && (
              <a
                href={contactHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                <ContactIcon className="h-4 w-4" />
                {getContactActionLabel(request.donorContactMethod)}
              </a>
            )}
          </div>
        ) : request.status === 'pending' ? (
          <p className="text-sm text-stone-500">Tu solicitud fue enviada. Espera la respuesta del donante.</p>
        ) : request.status === 'rejected' ? (
          <p className="text-sm text-stone-500">Esta solicitud no fue aceptada.</p>
        ) : request.status === 'cancelled' ? (
          <p className="text-sm text-stone-500">La coordinación fue cancelada y la donación volvió a publicarse.</p>
        ) : (
          <p className="text-sm text-emerald-700">La entrega ya fue marcada como completada.</p>
        )}
      </CardContent>
    </Card>
  );
};

interface DonationImageBannerProps {
  donation: Donation;
  emoji: string;
}

const DonationImageBanner: React.FC<DonationImageBannerProps> = ({ donation, emoji }) => (
  <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
    {donation.imageUrls?.[0] ? (
      <img
        src={donation.imageUrls[0]}
        alt={donation.title}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span className="text-5xl">{emoji}</span>
    )}
    {donation.imageUrls?.length > 1 && (
      <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-0.5 text-xs font-medium text-white">
        +{donation.imageUrls.length - 1}
      </span>
    )}
  </div>
);
