import React, { useState, useEffect } from 'react';
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
  Phone,
  MessageCircle,
  Check,
  X,
} from 'lucide-react';

export const Donations = () => {
  const { user, profile } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'city') {
      setFormData((prev) => ({ ...prev, commune: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!formData.title || !formData.description || !formData.city || !formData.commune) {
      alert('Por favor completa todos los campos');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'donations'), {
        donorId: user.uid,
        donorName: `${profile.parent1Name} y ${profile.parent2Name}`,
        donorBabyDueDate: profile.dueDate,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        quantity: formData.quantity,
        imageUrls: [],
        location: {
          city: formData.city,
          commune: formData.commune,
        },
        status: 'disponible',
        createdAt: serverTimestamp(),
      });

      setShowAddDialog(false);
      setFormData({
        title: '',
        description: '',
        category: 'Ropa',
        condition: 'Bueno',
        quantity: 1,
        city: '',
        commune: '',
      });
    } catch (error) {
      console.error('Error creating donation:', error);
      alert('Error al crear la donación');
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
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
                      onClick={() => setShowAddDialog(false)}
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
      <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
        <span className="text-5xl">{categoryConfig.emoji}</span>
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
