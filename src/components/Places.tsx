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
import { formatCurrency, formatNumberWithDots, parseNumberFromDots } from '../utils/dateHelpers';
import { useLanguage } from '../i18n/LanguageContext';

const getStatusLabel = (st: string, lang: string) => {
  if (lang !== 'vi') return st;
  switch (st) {
    case 'ALL': return 'Tất cả';
    case 'Want to go': return 'Muốn đi';
    case 'Planned': return 'Đã lên lịch';
    case 'Visited': return 'Đã ghé';
    case 'Skipped': return 'Bỏ qua';
    default: return st;
  }
};

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
  const { t, lang } = useLanguage();
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
            <span>{lang === 'vi' ? 'Địa điểm yêu thích & Muốn đến' : 'Wishlist & Dream Spots'}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            {lang === 'vi' ? 'Địa điểm & Điểm ngắm đã lưu' : 'Saved Places & Sights'}
          </h2>
          <p className="text-xs text-[#735D4E] mt-1">
            {lang === 'vi'
              ? `${places.length} địa điểm đã lưu • ${visitedCount} nơi đã cùng ghé thăm`
              : `${places.length} spots bookmarked • ${visitedCount} visited together`}
          </p>
        </div>

        <button
          id="places-add-btn"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Thêm địa điểm yêu thích' : 'Add Wishlist Place'}</span>
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
              {getStatusLabel(st, lang)} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filteredPlaces.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
          <Compass className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
          <h4 className="font-serif text-xl font-bold text-[#382D24]">
            {lang === 'vi' ? 'Chưa có địa điểm nào' : 'No spots found'}
          </h4>
          <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
            {lang === 'vi'
              ? 'Lưu lại những góc ngắm hoàng hôn, kiến trúc cổ kính, quán cà phê nhỏ hay tiệm ăn ngon.'
              : 'Add dreamy viewpoints, historic architecture, hidden indie coffee shops, or sweet dessert bars.'}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Thêm địa điểm đầu tiên' : 'Add First Spot'}</span>
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
                          {getStatusLabel(place.status, lang)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FAF7F2] text-[#8C6D58] border border-[#E2D4C3]">
                        {place.category || (lang === 'vi' ? 'Điểm tham quan' : 'Sightseeing')}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stColor.bg} ${stColor.text} ${stColor.border}`}>
                        {getStatusLabel(place.status, lang)}
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
                        <span>{lang === 'vi' ? 'Dự tính:' : 'Est:'} {formatCurrency(place.estimatedCost)}</span>
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
                    title={lang === 'vi' ? 'Đổi trạng thái đã ghé' : 'Toggle Visited Status'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {place.status === 'Visited'
                        ? lang === 'vi'
                          ? 'Đã ghé'
                          : 'Visited'
                        : lang === 'vi'
                        ? 'Đánh dấu đã ghé'
                        : 'Mark Visited'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Google Map Link */}
                    {place.mapUrl && (
                      <a
                        href={place.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors"
                        title={lang === 'vi' ? 'Mở bản đồ' : 'Open Map'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(place)}
                      className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors cursor-pointer"
                      title={t.actions.edit}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onRequestDeletePlace(place.id, place.name)}
                      className="p-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#FBEBE8] text-[#8C6D58] hover:text-[#B85340] border border-[#E2D4C3] hover:border-[#E9BFB7] transition-colors cursor-pointer"
                      title={t.actions.delete}
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
                <span>
                  {editingPlace
                    ? lang === 'vi'
                      ? 'Cập nhật địa điểm'
                      : 'Update Wishlist Spot'
                    : lang === 'vi'
                    ? 'Lưu địa điểm mới'
                    : 'Bookmark a New Spot'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingPlace
                  ? editingPlace.name
                  : lang === 'vi'
                  ? 'Thêm vào danh sách muốn đi'
                  : 'Add to Travel Wishlist'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Tên địa điểm *' : 'Place Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    lang === 'vi'
                      ? 'VD: Chợ Bến Thành, Chung cư Cà phê Tôn Thất Đạm...'
                      : 'e.g. Ben Thanh Market, The Old Apartment Cafe...'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Phân loại' : 'Category'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      lang === 'vi'
                        ? 'VD: Kiến trúc, Cà phê, Ngắm cảnh...'
                        : 'e.g. Architecture, Cafe, Viewpoint...'
                    }
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Trạng thái' : 'Status'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PlaceStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  >
                    <option value="Want to go">{getStatusLabel('Want to go', lang)}</option>
                    <option value="Planned">{getStatusLabel('Planned', lang)}</option>
                    <option value="Visited">{getStatusLabel('Visited', lang)}</option>
                    <option value="Skipped">{getStatusLabel('Skipped', lang)}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Địa chỉ' : 'Address'}
                </label>
                <input
                  type="text"
                  placeholder={
                    lang === 'vi'
                      ? 'VD: 14 Tôn Thất Đạm, Phường Nguyễn Thái Bình, Quận 1...'
                      : 'e.g. 14 Ton That Dam, District 1'
                  }
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Chi phí dự tính (VND)' : 'Estimated Cost (VND)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={lang === 'vi' ? 'VD: 1.000.000' : 'e.g. 1,000,000'}
                    value={formatNumberWithDots(estimatedCost)}
                    onChange={(e) => setEstimatedCost(parseNumberFromDots(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Giờ mở cửa' : 'Opening Hours'}
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
                  {lang === 'vi' ? 'Liên kết Google Maps' : 'Google Maps Link'}
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
                  {lang === 'vi' ? 'Link ảnh (Tùy chọn)' : 'Photo URL (Optional)'}
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
                  {lang === 'vi' ? 'Ghi chú' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    lang === 'vi'
                      ? 'Mẹo tham quan, góc check-in đẹp, món ngon đặc sắc...'
                      : 'Tips, best time to visit, favorite dish...'
                  }
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
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {editingPlace
                      ? lang === 'vi'
                        ? 'Lưu địa điểm'
                        : 'Save Spot'
                      : lang === 'vi'
                      ? 'Thêm địa điểm'
                      : 'Add Spot'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
