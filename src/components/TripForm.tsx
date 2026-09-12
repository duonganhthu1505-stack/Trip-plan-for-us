import React, { useState, useEffect } from 'react';
import {
  Save,
  Calendar,
  MapPin,
  Users,
  Car,
  Bed,
  Image as ImageIcon,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { TripInfo } from '../types';
import { COVER_IMAGE_PRESETS } from '../utils/constants';
import { calculateDurationDays, computeTripStatus, formatDateVN } from '../utils/dateHelpers';
import { useLanguage } from '../i18n/LanguageContext';

interface TripFormProps {
  initialData: TripInfo;
  isNewTrip?: boolean;
  onSave: (updatedInfo: TripInfo) => void;
  onCancel?: () => void;
}

export const TripForm: React.FC<TripFormProps> = ({
  initialData,
  isNewTrip = false,
  onSave,
  onCancel
}) => {
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState<TripInfo>({ ...initialData });

  useEffect(() => {
    setFormData({ ...initialData });
  }, [initialData]);

  // Recalculate duration and auto status
  const duration = calculateDurationDays(formData.startDate, formData.endDate);
  const calculatedStatus = computeTripStatus(formData.startDate, formData.endDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalInfo: TripInfo = {
      ...formData,
      name: formData.name.trim() || 'Untitled Journey',
      destination: formData.destination.trim() || 'Undisclosed Destination',
      status: calculatedStatus,
      updatedAt: new Date().toISOString()
    };
    onSave(finalInfo);
  };

  const handlePresetImage = (url: string) => {
    setFormData((prev) => ({ ...prev, coverImage: url }));
  };

  return (
    <div id="trip-form-container" className="max-w-4xl mx-auto pb-16">
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#F0E6D8]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8C6D58] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C27D66]" />
              <span>
                {isNewTrip
                  ? lang === 'vi'
                    ? 'Bắt đầu một chuyến đi mới'
                    : 'Start a New Chapter'
                  : lang === 'vi'
                  ? 'Chỉnh sửa thông tin chuyến đi'
                  : 'Edit Journey Details'}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
              {formData.name || (lang === 'vi' ? 'Hành trình của chúng mình' : 'Our Travel Story')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl border border-[#E2D4C3] bg-[#FAF7F2] hover:bg-[#EFE8DE] text-xs sm:text-sm font-medium text-[#735D4E] transition-colors cursor-pointer"
              >
                {t.common.cancel}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trip Name */}
            <div>
              <label htmlFor="trip-name-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2">
                {lang === 'vi' ? 'Tên chuyến đi *' : 'Trip Name *'}
              </label>
              <input
                id="trip-name-input"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  lang === 'vi'
                    ? 'VD: Chuyến đi Sài Gòn, Kỷ niệm Đà Lạt...'
                    : 'e.g. Saigon Couple Trip, Da Lat Escape...'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
            </div>

            {/* Destination */}
            <div>
              <label htmlFor="trip-dest-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Điểm đến *' : 'Destination *'}</span>
              </label>
              <input
                id="trip-dest-input"
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder={
                  lang === 'vi'
                    ? 'VD: TP. Hồ Chí Minh, Đà Lạt, Phú Quốc...'
                    : 'e.g. Ho Chi Minh City, Da Lat, Kyoto...'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="trip-start-date-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Ngày bắt đầu (DD/MM/YYYY)' : 'Start Date (DD/MM/YYYY)'}</span>
              </label>
              <input
                id="trip-start-date-input"
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
              <p className="text-[11px] text-[#8C6D58] mt-1">
                {lang === 'vi' ? 'Hiển thị:' : 'Display:'} {formatDateVN(formData.startDate)}
              </p>
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="trip-end-date-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Ngày kết thúc (DD/MM/YYYY)' : 'End Date (DD/MM/YYYY)'}</span>
              </label>
              <input
                id="trip-end-date-input"
                type="date"
                value={formData.endDate || ''}
                min={formData.startDate || undefined}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
              <p className="text-[11px] text-[#8C6D58] mt-1">
                {lang === 'vi' ? 'Hiển thị:' : 'Display:'} {formatDateVN(formData.endDate)}
              </p>
            </div>
          </div>

          {/* Auto calculated status & duration preview banner */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8C6D58]" />
              <span className="text-[#8C6D58]">{lang === 'vi' ? 'Thời gian:' : 'Duration:'}</span>
              <span className="font-semibold text-[#382D24] bg-[#FFFDF9] px-2.5 py-1 rounded-lg border border-[#E2D4C3]">
                {duration} {lang === 'vi' ? 'ngày' : duration === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#8C6D58]">{lang === 'vi' ? 'Trạng thái (Tự động):' : 'Status (Auto-detected):'}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                calculatedStatus === 'Ongoing' ? 'bg-[#E3EFE5] text-[#2F6636]' :
                calculatedStatus === 'Upcoming' ? 'bg-[#EBF2F8] text-[#2A527A]' :
                calculatedStatus === 'Completed' ? 'bg-[#EFE8DE] text-[#6E4F36]' :
                'bg-[#F6EBE1] text-[#915B35]'
              }`}>
                {lang === 'vi'
                  ? calculatedStatus === 'Ongoing'
                    ? 'Đang diễn ra'
                    : calculatedStatus === 'Upcoming'
                    ? 'Sắp tới'
                    : calculatedStatus === 'Completed'
                    ? 'Đã hoàn thành'
                    : calculatedStatus
                  : calculatedStatus}
              </span>
            </div>
          </div>

          {/* Travelers & Transport Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="trip-travelers-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Số người tham gia' : 'Travelers Count'}</span>
              </label>
              <input
                id="trip-travelers-input"
                type="number"
                min="1"
                max="50"
                value={formData.travelers}
                onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="trip-names-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2">
                {lang === 'vi' ? 'Tên cặp đôi / Bạn đồng hành' : 'Couple / Companion Names'}
              </label>
              <input
                id="trip-names-input"
                type="text"
                value={formData.travelerNames || ''}
                onChange={(e) => setFormData({ ...formData, travelerNames: e.target.value })}
                placeholder={lang === 'vi' ? 'VD: Thư & Minh' : 'e.g. Thu & Minh'}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="trip-transport-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Phương tiện di chuyển' : 'Transportation'}</span>
              </label>
              <input
                id="trip-transport-input"
                type="text"
                value={formData.transport || ''}
                onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                placeholder={
                  lang === 'vi'
                    ? 'VD: Máy bay VJ123, Xe máy, Xe Limousine...'
                    : 'e.g. Flight VN123, Motorbike, Sleeper Bus...'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
              />
            </div>
          </div>

          {/* Hotel & Accommodation */}
          <div>
            <label htmlFor="trip-hotel-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-[#8C6D58]" />
              <span>{lang === 'vi' ? 'Khách sạn / Nơi lưu trú' : 'Hotel / Accommodation'}</span>
            </label>
            <input
              id="trip-hotel-input"
              type="text"
              value={formData.hotel || ''}
              onChange={(e) => setFormData({ ...formData, hotel: e.target.value })}
              placeholder={
                lang === 'vi'
                  ? 'VD: Khách sạn The Myst, Homestay Đà Lạt...'
                  : 'e.g. The Myst Dong Khoi, boutique villa, Airbnb...'
              }
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
            />
          </div>

          {/* Cover Image & Presets */}
          <div>
            <label htmlFor="trip-cover-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-[#8C6D58]" />
              <span>{lang === 'vi' ? 'Đường dẫn ảnh bìa (URL)' : 'Cover Image URL'}</span>
            </label>
            <input
              id="trip-cover-input"
              type="url"
              value={formData.coverImage || ''}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none mb-3"
            />

            {/* Aesthetic presets */}
            <div>
              <span className="text-xs text-[#8C6D58] font-medium block mb-2">
                {lang === 'vi' ? 'Hoặc chọn ảnh bìa lãng mạn có sẵn:' : 'Or choose a romantic cover photo:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {COVER_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetImage(preset.url)}
                    className={`relative rounded-xl overflow-hidden h-16 border text-left group cursor-pointer transition-all ${
                      formData.coverImage === preset.url ? 'ring-2 ring-[#5C4033] border-transparent scale-102' : 'border-[#E2D4C3] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-1.5">
                      <span className="text-[10px] text-white font-medium leading-tight truncate">
                        {preset.location}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Journal Notes / Quotes */}
          <div>
            <label htmlFor="trip-notes-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#8C6D58]" />
              <span>{lang === 'vi' ? 'Ghi chú chuyến đi & Cảm xúc kỷ niệm' : 'Trip Notes & Memory Thoughts'}</span>
            </label>
            <textarea
              id="trip-notes-input"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={
                lang === 'vi'
                  ? 'Đôi dòng cảm xúc, kỷ niệm đáng nhớ hoặc lời nhắn gửi ngọt ngào của chuyến đi...'
                  : 'A few words capturing the mood, highlights, or sweet promises of this trip...'
              }
              className="w-full px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#D9CABB] text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[#F0E6D8] flex justify-end">
            <button
              id="trip-form-save-btn"
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Lưu thông tin chuyến đi' : 'Save Trip Information'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
