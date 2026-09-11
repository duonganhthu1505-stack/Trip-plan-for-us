import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  ExternalLink,
  Clock,
  DollarSign,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Sparkles,
  Navigation,
  Compass
} from 'lucide-react';
import { Place, PlaceStatus } from '../types';
import { formatCurrency } from '../utils/dateHelpers';

interface PlacesProps {
  tripId: string;
  places: Place[];
  onSavePlaces: (places: Place[]) => void;
  onRequestDeletePlace: (id: string, name: string) => void;
}

const STATUS_COLORS: Record<PlaceStatus, { bg: string; text: string; border: string }> = {
  'Want to go': { bg: 'bg-[#FAF7F2]', text: 'text-[#8C6D58]', border: 'border-[#E2D4C3]' },
  Planned: { bg: 'bg-[#EBF2F8]', text: 'text-[#2A527A]', border: 'border-[#CADAE7]' },
  Visited: { bg: 'bg-[#E3EFE5]', text: 'text-[#2F6636]', border: 'border-[#CCE2CF]' },
  Skipped: { bg: 'bg-[#F2ECE4]', text: 'text-[#8C7E72]', border: 'border-[#D9CFBF]' }
};

export const Places: React.FC<PlacesProps> = ({
  tripId,
  places,
  onSavePlaces,
  onRequestDeletePlace
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [openingHours, setOpeningHours] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PlaceStatus>('Want to go');
  const [imageUrl, setImageUrl] = useState('');

  const openAddModal = () => {
    setEditingPlace(null);
    setName('');
    setCategory('Sightseeing');
    setAddress('');
    setMapUrl('');
    setEstimatedCost(0);
    setOpeningHours('');
    setNotes('');
    setStatus('Want to go');
    setImageUrl('');
    setModalOpen(true);
  };

  const openEditModal = (p: Place) => {
    setEditingPlace(p);
    setName(p.name);
    setCategory(p.category || 'Sightseeing');
    setAddress(p.address || '');
    setMapUrl(p.mapUrl || '');
    setEstimatedCost(p.estimatedCost || 0);
    setOpeningHours(p.openingHours || '');
    setNotes(p.notes || '');
    setStatus(p.status || 'Want to go');
    setImageUrl(p.imageUrl || '');
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingPlace) {
      const updated = places.map((p) =>
        p.id === editingPlace.id
          ? {
              ...p,
              name: name.trim(),
              category: category.trim() || 'General',
              address: address.trim(),
              mapUrl: mapUrl.trim(),
              estimatedCost: Number(estimatedCost) || 0,
              openingHours: openingHours.trim(),
              notes: notes.trim(),
              status,
              imageUrl: imageUrl.trim()
            }
          : p
      );
      onSavePlaces(updated);
    } else {
      const newPlace: Place = {
        id: `place-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId,
        name: name.trim(),
        category: category.trim() || 'General',
        address: address.trim(),
        mapUrl: mapUrl.trim(),
        estimatedCost: Number(estimatedCost) || 0,
        openingHours: openingHours.trim(),
        notes: notes.trim(),
        status,
        imageUrl: imageUrl.trim()
      };
      onSavePlaces([...places, newPlace]);
    }
    setModalOpen(false);
  };

  const handleToggleVisited = (p: Place) => {
    const nextStatus: PlaceStatus = p.status === 'Visited' ? 'Planned' : 'Visited';
    const updated = places.map((item) => (item.id === p.id ? { ...item, status: nextStatus } : item));
    onSavePlaces(updated);
  };

  const filteredPlaces = statusFilter === 'ALL'
    ? places
    : places.filter((p) => p.status === statusFilter);

  const visitedCount = places.filter((p) => p.status === 'Visited').length;

  return (
    <div id="places-page" className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5 text-[#C27D66]" />
            <span>Wishlist & Dream Spots</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            Saved Places & Sights
          </h2>
          <p className="text-xs text-[#735D4E] mt-1">
            {places.length} spots bookmarked • {visitedCount} visited together
          </p>
        </div>

        <button
          id="places-add-btn"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Wishlist Place</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'Want to go', 'Planned', 'Visited', 'Skipped'] as const).map((st) => {
          const count = st === 'ALL' ? places.length : places.filter((p) => p.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#5C4033] text-white'
                  : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
              }`}
            >
              {st === 'ALL' ? 'All Places' : st} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filteredPlaces.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
          <Compass className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
          <h4 className="font-serif text-xl font-bold text-[#382D24]">No spots found</h4>
          <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
            Add dreamy viewpoints, historic architecture, hidden indie coffee shops, or sweet dessert bars.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Spot</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlaces.map((place) => {
            const stColor = STATUS_COLORS[place.status] || STATUS_COLORS['Want to go'];
            return (
              <div
                key={place.id}
                id={`place-card-${place.id}`}
                className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Photo or Header */}
                  {place.imageUrl ? (
                    <div className="h-36 relative overflow-hidden bg-[#EFE8DE]">
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stColor.bg} ${stColor.text} ${stColor.border} backdrop-blur-md`}>
                          {place.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FAF7F2] text-[#8C6D58] border border-[#E2D4C3]">
                        {place.category || 'Sightseeing'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stColor.bg} ${stColor.text} ${stColor.border}`}>
                        {place.status}
                      </span>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-serif text-lg font-bold text-[#382D24] leading-snug">
                      {place.name}
                    </h3>

                    {place.address && (
                      <div className="flex items-start gap-1.5 text-xs text-[#735D4E]">
                        <MapPin className="w-3.5 h-3.5 text-[#8C6D58] shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{place.address}</span>
                      </div>
                    )}

                    {place.openingHours && (
                      <div className="flex items-center gap-1.5 text-xs text-[#8C6D58]">
                        <Clock className="w-3.5 h-3.5 text-[#8C6D58] shrink-0" />
                        <span>{place.openingHours}</span>
                      </div>
                    )}

                    {place.estimatedCost > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-[#5C4033] font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-[#8C6D58] shrink-0" />
                        <span>Est: {formatCurrency(place.estimatedCost)}</span>
                      </div>
                    )}

                    {place.notes && (
                      <p className="text-xs text-[#8C6D58] italic bg-[#FAF7F2] p-2.5 rounded-xl border-l-2 border-[#8C6D58] mt-2 leading-relaxed">
                        {place.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-[#FAF7F2] border-t border-[#EAE2D5] flex items-center justify-between gap-1">
                  {/* Toggle Visited Button */}
                  <button
                    onClick={() => handleToggleVisited(place)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      place.status === 'Visited'
                        ? 'bg-[#E3EFE5] text-[#2F6636] hover:bg-[#D4E8D7]'
                        : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#EFE8DE] border border-[#E2D4C3]'
                    }`}
                    title="Toggle Visited Status"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{place.status === 'Visited' ? 'Visited' : 'Mark Visited'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Google Map Link */}
                    {place.mapUrl && (
                      <a
                        href={place.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors"
                        title="Open Map"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(place)}
                      className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors cursor-pointer"
                      title="Edit Place"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onRequestDeletePlace(place.id, place.name)}
                      className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#FBEBE8] text-[#8C6D58] hover:text-[#B85340] border border-[#E2D4C3] hover:border-[#E9BFB7] transition-colors cursor-pointer"
                      title="Delete Place"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Place Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B1E16]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[#FAF7F2] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden p-6 text-[#3D312A] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8C6D58] hover:text-[#382D24] rounded-full hover:bg-[#EFE8DE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#EAE2D5]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C6D58] font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>{editingPlace ? 'Update Wishlist Spot' : 'Bookmark a New Spot'}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingPlace ? editingPlace.name : 'Add to Travel Wishlist'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ben Thanh Market, The Old Apartment Cafe..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Architecture, Cafe, Viewpoint..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PlaceStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  >
                    <option value="Want to go">Want to go</option>
                    <option value="Planned">Planned</option>
                    <option value="Visited">Visited</option>
                    <option value="Skipped">Skipped</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14 Ton That Dam, District 1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Estimated Cost (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    Opening Hours
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 - 22:00"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Tips, best time to visit, favorite dish..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE2D5]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#735D4E] hover:bg-[#EFE8DE] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingPlace ? 'Save Spot' : 'Add Spot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
