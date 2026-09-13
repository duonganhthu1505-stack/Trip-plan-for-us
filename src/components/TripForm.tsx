import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  Upload,
  Search,
  Check,
  Trash2,
  Camera,
  Loader2,
  Compass,
  RefreshCw
} from 'lucide-react';
import { TripInfo } from '../types';
import { calculateDurationDays, computeTripStatus, formatDateVN } from '../utils/dateHelpers';
import { fileToBase64 } from '../utils/imageHelpers';
import { getSuggestedPhotosForDestination, SuggestedPhoto } from '../utils/destinationPhotos';
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

  // Cover photo selection state
  const [photoTab, setPhotoTab] = useState<'suggested' | 'upload'>('suggested');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({ ...initialData });
  }, [initialData]);

  // Recalculate duration and auto status
  const duration = calculateDurationDays(formData.startDate, formData.endDate);
  const calculatedStatus = computeTripStatus(formData.startDate, formData.endDate);

  // Compute suggested photos based on current destination and optional search keyword
  const suggestedPhotos = useMemo(() => {
    const activeQuery = searchKeyword.trim() || formData.destination || '';
    return getSuggestedPhotosForDestination(formData.destination, activeQuery);
  }, [formData.destination, searchKeyword]);

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

  const handleSelectImage = (url: string) => {
    setFormData((prev) => ({ ...prev, coverImage: url }));
    setUploadError(null);
  };

  const handleRemoveCover = () => {
    setFormData((prev) => ({ ...prev, coverImage: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle local file upload from device/phone
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError(lang === 'vi' ? 'Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).' : 'Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      // Compress to optimal web dimensions for smooth cloud sync & crisp preview
      const base64Data = await fileToBase64(file, 1400, 900, 0.82);
      setFormData((prev) => ({ ...prev, coverImage: base64Data }));
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(lang === 'vi' ? 'Không thể xử lý hình ảnh này. Hãy thử ảnh khác.' : 'Could not process image. Please try another one.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
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

          {/* Cover Image & Destination Smart Suggestions / Device Upload */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#8C6D58]" />
                <span>{lang === 'vi' ? 'Ảnh bìa chuyến đi' : 'Trip Cover Image'}</span>
              </label>

              {formData.coverImage && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="text-xs text-[#A84B38] hover:text-[#873423] font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#FBEBE8] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'vi' ? 'Xóa ảnh bìa' : 'Remove Cover'}</span>
                </button>
              )}
            </div>

            {/* Current Selected Cover Image Preview Banner */}
            {formData.coverImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#D9CABB] bg-[#1F1712] h-48 sm:h-56 shadow-sm group">
                <img
                  src={formData.coverImage}
                  alt={formData.name || 'Trip Cover'}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      {lang === 'vi' ? 'Ảnh bìa đang chọn' : 'Active Cover Photo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoTab(photoTab === 'suggested' ? 'upload' : 'suggested')}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 hover:bg-white text-[#382D24] text-xs font-medium backdrop-blur-md shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {lang === 'vi' ? 'Đổi ảnh khác' : 'Change Photo'}
                    </button>
                  </div>

                  <div>
                    <p className="text-white font-serif font-bold text-base sm:text-lg drop-shadow-sm truncate">
                      {formData.name || (lang === 'vi' ? 'Hành trình lãng mạn' : 'Our Journey')}
                    </p>
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#FBBF24]" />
                      {formData.destination || (lang === 'vi' ? 'Chưa đặt điểm đến' : 'No destination')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[#D9CABB] bg-[#FAF7F2] p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#EFE6DB] flex items-center justify-center text-[#8C6D58]">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[#382D24] mb-1">
                  {lang === 'vi' ? 'Chưa chọn ảnh bìa cho chuyến đi' : 'No cover photo selected yet'}
                </p>
                <p className="text-xs text-[#8C6D58] max-w-md mx-auto">
                  {lang === 'vi'
                    ? 'Hãy chọn một bức ảnh phong cảnh gợi ý theo điểm đến bên dưới hoặc tải ảnh chụp từ máy của bạn.'
                    : 'Choose a suggested scenic photo based on your destination below or upload one from your device.'}
                </p>
              </div>
            )}

            {/* Photo Selection Tabs: Suggested vs Upload */}
            <div className="bg-[#FAF7F2] border border-[#E8DEC8] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 p-1 bg-[#EFE6DB] rounded-xl">
                <button
                  type="button"
                  onClick={() => setPhotoTab('suggested')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    photoTab === 'suggested'
                      ? 'bg-white text-[#382D24] shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#5C4033]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C27D66]" />
                  <span>
                    {lang === 'vi'
                      ? `Ảnh gợi ý theo điểm đến (${formData.destination || 'Gợi ý'})`
                      : `Suggested Photos (${formData.destination || 'Explore'})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhotoTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    photoTab === 'upload'
                      ? 'bg-white text-[#382D24] shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#5C4033]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-[#8C6D58]" />
                  <span>{lang === 'vi' ? 'Tải ảnh từ máy / điện thoại' : 'Upload from Device'}</span>
                </button>
              </div>

              {/* Tab 1: Suggested Photos based on Destination */}
              {photoTab === 'suggested' && (
                <div className="space-y-3.5">
                  {/* Search and Filter bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#8C6D58] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder={
                          lang === 'vi'
                            ? `Tìm ảnh theo địa danh (VD: ${formData.destination || 'Đà Lạt'}, Sài Gòn, Biển, Hoàng hôn...)`
                            : `Search photos (e.g. ${formData.destination || 'Da Lat'}, Saigon, Beach, Sunset...)`
                        }
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:ring-2 focus:ring-[#8C6D58]/30 focus:border-[#8C6D58] focus:outline-none"
                      />
                      {searchKeyword && (
                        <button
                          type="button"
                          onClick={() => setSearchKeyword('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8C6D58] hover:text-[#382D24] px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {formData.destination && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword(formData.destination)}
                        className="px-3 py-2 rounded-xl bg-white border border-[#D9CABB] hover:border-[#8C6D58] text-[#6E4F36] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#C27D66]" />
                        <span>{lang === 'vi' ? 'Lấy lại theo điểm đến' : 'Reset to destination'}</span>
                      </button>
                    )}
                  </div>

                  {/* Destination Quick Tags */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    <span className="text-[#8C6D58] font-medium shrink-0 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C27D66]" />
                      {lang === 'vi' ? 'Gợi ý nhanh:' : 'Quick Tags:'}
                    </span>
                    {formData.destination && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword(formData.destination)}
                        className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition-colors cursor-pointer ${
                          searchKeyword === formData.destination
                            ? 'bg-[#5C4033] text-white border-[#5C4033]'
                            : 'bg-white text-[#5C4033] border-[#D9CABB] hover:border-[#8C6D58]'
                        }`}
                      >
                        📍 {formData.destination}
                      </button>
                    )}
                    {['Đà Lạt', 'TP. Hồ Chí Minh', 'Hà Nội', 'Phú Quốc', 'Hội An', 'Đà Nẵng', 'Nha Trang', 'Huế', 'Sa Pa', 'Ninh Bình', 'Kyoto', 'Paris'].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setSearchKeyword(loc)}
                        className={`px-2 py-1 rounded-lg border font-medium shrink-0 transition-colors cursor-pointer ${
                          searchKeyword === loc
                            ? 'bg-[#5C4033] text-white border-[#5C4033]'
                            : 'bg-white text-[#735D4E] border-[#E2D4C3] hover:border-[#8C6D58]'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>

                  {/* Suggested Photo Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                    {suggestedPhotos.map((photo: SuggestedPhoto) => {
                      const isSelected = formData.coverImage === photo.url;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => handleSelectImage(photo.url)}
                          className={`group relative rounded-xl overflow-hidden h-24 sm:h-28 border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-3 ring-[#5C4033] ring-offset-2 border-transparent scale-[1.02] shadow-md'
                              : 'border-[#E2D4C3] opacity-85 hover:opacity-100 hover:border-[#8C6D58] hover:shadow-2xs'
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#5C4033] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2 pointer-events-none">
                            <span className="text-[11px] text-white font-semibold leading-tight line-clamp-1">
                              {photo.location}
                            </span>
                            {photo.tag && (
                              <span className="text-[9px] text-white/80 leading-tight truncate">
                                {photo.tag}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Upload from Computer / Phone */}
              {photoTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    id="trip-cover-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#5C4033] bg-[#EFE6DB]'
                        : 'border-[#D9CABB] hover:border-[#8C6D58] bg-white hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {isUploading ? (
                      <div className="py-4 flex flex-col items-center gap-2 text-[#8C6D58]">
                        <Loader2 className="w-8 h-8 animate-spin text-[#C27D66]" />
                        <span className="text-xs font-semibold">
                          {lang === 'vi' ? 'Đang xử lý & tối ưu ảnh bìa...' : 'Processing & optimizing photo...'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] flex items-center justify-center text-[#8C6D58]">
                          <Upload className="w-6 h-6 text-[#6E4F36]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#382D24]">
                            {lang === 'vi'
                              ? 'Bấm vào đây để chọn ảnh từ máy hoặc kéo thả ảnh vào'
                              : 'Click to select photo from device or drag and drop'}
                          </p>
                          <p className="text-xs text-[#8C6D58] mt-1">
                            {lang === 'vi'
                              ? 'Hỗ trợ tệp JPG, PNG, WEBP, HEIC từ điện thoại & máy tính (Tự động nén tối ưu)'
                              : 'Supports JPG, PNG, WEBP, HEIC (Auto-compressed for fast loading)'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DE] border border-[#D9CABB] text-xs font-semibold text-[#6E4F36] transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{lang === 'vi' ? 'Chọn tệp hình ảnh' : 'Choose Image File'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <p className="text-xs text-[#A84B38] font-medium bg-[#FBEBE8] px-3 py-2 rounded-xl border border-[#F2C5BD]">
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
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
