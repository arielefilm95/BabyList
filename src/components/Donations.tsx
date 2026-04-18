import React, { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { db } from '../lib/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import {
  DONATION_CATEGORIES,
  DONATION_CONDITIONS,
  CHILEAN_REGIONS,
  DONATION_CATEGORY_CONFIG,
  DONATION_CONDITION_CONFIG,
} from '../constants';
import type { Donation, DonationCategory, DonationCondition } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Plus,
  Gift,
  Heart,
  Filter,
  Search,
  Baby,
  Camera,
  ImagePlus,
  Phone,
  MessageCircle,
  Check,
  X,
} from 'lucide-react';

const MAX_DONATION_IMAGES = 5;
const MAX_DONATION_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const DONATION_UPLOAD_ROUTE = '/api/donations/upload';
const VERCEL_BLOB_MULTIPART_THRESHOLD_BYTES = 4_500_000;

type LocalDonationImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const sanitizeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const Donations = () => {
  const { user, profile } = useAuth();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImagesRef = useRef<LocalDonationImage[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<LocalDonationImage[]>([]);

  const [filterCity, setFilterCity] = useState('');
  const [filterCommune, setFilterCommune] = useState('');
  const [filterCategory, setFilterCategory] = useState<DonationCategory | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Ropa' as DonationCategory,
    condition: 'Bueno' as DonationCondition,
    quantity: 1,
    city: '',
    commune: '',
  });

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

    const donationsQuery = query(
      collection(db, 'donations'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      donationsQuery,
      (snapshot) => {
        const donationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Donation[];
        setDonations(donationData);
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

  const availableDonations = donations.filter((d) => d.status === 'disponible');

  const filteredDonations = availableDonations.filter((donation) => {
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

  const cities = CHILEAN_REGIONS.map((r) => r.name.replace(' de Santiago', ''));
  const selectedRegion = CHILEAN_REGIONS.find(
    (r) => r.name.replace(' de Santiago', '') === formData.city
  );
  const communes = selectedRegion?.cities || [];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const nextValue = name === 'quantity' ? Math.max(1, Number(value) || 1) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (name === 'city') {
      setFormData((prev) => ({ ...prev, commune: '' }));
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
    setFormData({
      title: '',
      description: '',
      category: 'Ropa',
      condition: 'Bueno',
      quantity: 1,
      city: '',
      commune: '',
    });
    clearSelectedImages();
  };

  const handleDialogChange = (open: boolean) => {
    setShowAddDialog(open);
    if (!open && !submitting) {
      resetDonationForm();
    }
  };

  const appendSelectedImages = (fileList: FileList | null) => {
    if (!fileList) return;

    const candidateFiles = Array.from(fileList);
    const validFiles = candidateFiles.filter((file) => file.type.startsWith('image/'));
    const validSizedFiles = validFiles.filter((file) => file.size <= MAX_DONATION_IMAGE_SIZE_BYTES);
    const availableSlots = Math.max(0, MAX_DONATION_IMAGES - selectedImagesRef.current.length);

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

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!formData.title || !formData.description || !formData.city || !formData.commune) {
      alert('Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls = await uploadSelectedImages(user.uid);

      await addDoc(collection(db, 'donations'), {
        donorId: user.uid,
        donorName: `${profile.parent1Name} y ${profile.parent2Name}`,
        donorBabyDueDate: profile.dueDate,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        quantity: formData.quantity,
        imageUrls,
        location: {
          city: formData.city,
          commune: formData.commune,
        },
        status: 'disponible',
        createdAt: serverTimestamp(),
      });

      setShowAddDialog(false);
      resetDonationForm();
    } catch (error) {
      console.error('Error creating donation:', error);
      alert(error instanceof Error ? error.message : 'Error al crear la donación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReserve = async (donation: Donation) => {
    if (!user || !profile) return;
    if (!confirm(`¿Quieres reservarr "${donation.title}"? El donante se pondrá en contacto contigo.`)) return;

    try {
      await updateDoc(doc(db, 'donations', donation.id), {
        status: 'reservado',
        reservedBy: user.uid,
        reservedByName: `${profile.parent1Name} y ${profile.parent2Name}`,
      });

      await addDoc(collection(db, 'profiles', donation.donorId, 'notifications'), {
        title: '¡Algo fue reservado!',
        message: `${profile.parent1Name} y ${profile.parent2Name} están interesados en "${donation.title}". Pronto se pondrán en contacto contigo.`,
        type: 'gift',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error reserving donation:', error);
      alert('Error al reservar la donación');
    }
  };

  const clearFilters = () => {
    setFilterCity('');
    setFilterCommune('');
    setFilterCategory('');
    setSearchQuery('');
  };

  const hasActiveFilters = filterCity || filterCommune || filterCategory || searchQuery;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-700">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Gift className="w-6 h-6 text-rose-500" />
            Donaciones
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            {hasBabyOnTheWay
              ? 'Tu bebé está en camino. ¡Aquí puedes encontrar y ofrecer donaciones!'
              : 'Regala lo que ya no necesitas y ayuda a otras familias.'}
          </p>
        </div>

        {profile && (
          <Dialog open={showAddDialog} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="bg-rose-500 hover:bg-rose-600">
                <Plus className="w-4 h-4 mr-2" />
                Donar algo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  Donar artículo
                </DialogTitle>
              </DialogHeader>

              {!hasBabyOnTheWay ? (
                <div className="py-8 text-center space-y-4">
                  <Baby className="w-16 h-16 text-stone-300 mx-auto" />
                  <p className="text-stone-600">
                    Para donating, necesitas tener un perfil con un bebé en camino activo.
                  </p>
                  <p className="text-sm text-stone-500">
                    Completa tu perfil con la fecha de parto para poder participar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Ej: Bodies de recién nacido (talla 0-3M)"
                      value={formData.title}
                      onChange={handleInputChange}
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe el artículo: estado, talla, marca, cantidad..."
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
                        disabled={submitting || selectedImages.length >= MAX_DONATION_IMAGES}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Camara
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={submitting || selectedImages.length >= MAX_DONATION_IMAGES}
                      >
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Galeria
                      </Button>
                    </div>

                    {selectedImages.length > 0 && (
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
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría *</Label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800"
                      >
                        {DONATION_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition">Condición *</Label>
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800"
                      >
                        {DONATION_CONDITIONS.map((cond) => (
                          <option key={cond} value={cond}>
                            {cond}
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
                        className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800"
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
                        className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800 disabled:opacity-50"
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

                  <div className="pt-4 flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleDialogChange(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 bg-rose-500 hover:bg-rose-600"
                    >
                      {submitting ? 'Publicando...' : 'Publicar donación'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="Buscar donaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-stone-100' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <select
                  value={filterCity}
                  onChange={(e) => {
                    setFilterCity(e.target.value);
                    setFilterCommune('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800"
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
                  onChange={(e) => setFilterCommune(e.target.value)}
                  disabled={!filterCity}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800 disabled:opacity-50"
                >
                  <option value="">Todas</option>
                  {CHILEAN_REGIONS.find(
                    (r) => r.name.replace(' de Santiago', '') === filterCity
                  )?.cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as DonationCategory | '')}
                  className="w-full px-3 py-2 border rounded-lg bg-white text-stone-800"
                >
                  <option value="">Todas</option>
                  {DONATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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
            <Gift className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-600 mb-2">
              {hasActiveFilters
                ? 'No hay donaciones con esos filtros'
                : 'No hay donaciones disponibles'}
            </h3>
            <p className="text-stone-500 text-sm mb-4">
              {hasActiveFilters
                ? 'Intenta cambiar los filtros o buscar en otra zona.'
                : '¡Sé el primero en ofrecer algo para la comunidad!'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : profile && hasBabyOnTheWay ? (
              <Button onClick={() => setShowAddDialog(true)} className="bg-rose-500 hover:bg-rose-600">
                <Plus className="w-4 h-4 mr-2" />
                Donar algo
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonations.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              currentUserId={user?.uid}
              onReserve={() => handleReserve(donation)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DonationCardProps {
  donation: Donation;
  currentUserId?: string;
  onReserve: () => void;
}

const DonationCard: React.FC<DonationCardProps> = ({ donation, currentUserId, onReserve }) => {
  const categoryConfig = DONATION_CATEGORY_CONFIG[donation.category] || DONATION_CATEGORY_CONFIG['Otros'];
  const conditionConfig = DONATION_CONDITION_CONFIG[donation.condition];

  const isOwnDonation = currentUserId === donation.donorId;
  const canReserve = currentUserId && !isOwnDonation && donation.status === 'disponible';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-32 bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
        {donation.imageUrls?.[0] ? (
          <img
            src={donation.imageUrls[0]}
            alt={donation.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-5xl">{categoryConfig.emoji}</span>
        )}
        {donation.imageUrls?.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-0.5 text-xs font-medium text-white">
            +{donation.imageUrls.length - 1}
          </span>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-1">{donation.title}</CardTitle>
          {donation.status === 'reservado' && (
            <span className="shrink-0 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              Reservado
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${categoryConfig.bgColor} ${categoryConfig.textColor}`}>
            {categoryConfig.emoji} {donation.category}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${conditionConfig.bgColor} text-stone-600`}>
            {donation.condition}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2 text-sm">
          {donation.description}
        </CardDescription>

        <div className="flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="w-3 h-3" />
          <span>{donation.location.commune}, {donation.location.city}</span>
        </div>

        {donation.donorBabyDueDate && (
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <Baby className="w-3 h-3" />
            <span>Bebé en camino del donante</span>
          </div>
        )}

        <div className="pt-2">
          {isOwnDonation ? (
            <p className="text-xs text-stone-400 text-center">Tu donación</p>
          ) : canReserve ? (
            <Button onClick={onReserve} size="sm" className="w-full bg-rose-500 hover:bg-rose-600">
              <Heart className="w-4 h-4 mr-1" />
              Me interesa
            </Button>
          ) : !currentUserId ? (
            <p className="text-xs text-stone-400 text-center">Inicia sesión para reservar</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
