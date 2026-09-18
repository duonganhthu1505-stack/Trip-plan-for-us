import React, { useRef, useState } from 'react';
import {
  BedDouble,
  Bike,
  Bus,
  Plus,
  Heart,
  MapPin,
  DollarSign,
  Check,
  Star,
  Trash2,
  Edit3,
  X,
  Phone,
  ExternalLink,
  Sparkles,
  Camera,
  Layers,
  Award,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { ServiceCategory, ServiceOption, TripInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { fileToBase64 } from '../utils/imageHelpers';

interface ServicesProps {
  tripInfo: TripInfo;
  // Optional: undefined = services were never saved for this trip (show defaults);
  // an empty array means the couple deliberately deleted every option and must
  // stay empty instead of falling back to the default list.
  services?: ServiceOption[];
  onSaveServices: (services: ServiceOption[]) => void;
  onChooseHotelForItinerary?: (hotel: ServiceOption) => void;
}

export const DEFAULT_SERVICES: ServiceOption[] = [
  {
    id: 'srv-1',
    tripId: '',
    category: 'Hotel',
    name: 'Hoàng Hôn Xanh Homestay Đà Lạt',
    address: 'Khởi Nghĩa Bắc Sơn, Phường 10, TP. Đà Lạt',
    distanceToCenter: '1,8 km tới Chợ Đà Lạt · 1,2 km tới Hồ Xuân Hương (5 phút xe máy)',
    pricePerUnit: 650000,
    unitLabel: 'đêm',
    weekendSurcharge: 0,
    deposit: 500000,
    totalEstimate: 1300000,
    amenities: ['Bồn tắm gỗ view đồi', 'Thung lũng đèn đêm', 'Bữa sáng miễn phí', 'Máy sưởi ấm đêm', 'Chỗ đỗ xe máy', 'Wifi mạnh'],
    pros: ['View thung lũng đèn siêu chill', 'Bồn tắm gỗ ngắm hoàng hôn', 'Free bữa sáng 2 người', 'Không phụ thu cuối tuần'],
    cons: ['Dốc vào ngắn 20m hơi đứng'],
    photos: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80'
    ],
    hisNote: 'Gần chợ 1,8km chạy xe máy xíu là tới, lại có view bồn tắm gỗ chụp ảnh bao đẹp cho em!',
    herNote: 'Dạ em ưng chỗ này nhất luôn á anh, phòng decor gỗ ấm cúng lại không phụ thu cuối tuần ♥',
    votes: 2,
    isChosen: true,
    contactPhone: '0912.345.678',
    linkUrl: 'https://facebook.com',
    createdAt: '2026-09-18T08:00:00.000Z'
  },
  {
    id: 'srv-2',
    tripId: '',
    category: 'Hotel',
    name: 'The Kupid Hill Da Lat',
    address: 'Đặng Thái Thân, Phường 3, TP. Đà Lạt',
    distanceToCenter: '3,8 km tới Chợ Đà Lạt · Gần đồi thông và cáp treo (10 phút lái xe)',
    pricePerUnit: 720000,
    unitLabel: 'đêm',
    weekendSurcharge: 50000,
    deposit: 500000,
    totalEstimate: 1490000,
    amenities: ['View rừng thông', 'Quán cà phê sân vườn', 'Nước nóng năng lượng', 'Bãi đỗ xe rộng'],
    pros: ['Sân vườn rộng rãi, nhiều góc sống ảo', 'Có tiệm cà phê chill tại chỗ'],
    cons: ['Hơi xa trung tâm (3,8 km)', 'Đường đèo dốc về đêm khá vắng'],
    photos: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=600&q=80'
    ],
    hisNote: 'Đẹp nhưng hơi xa chợ đêm, để làm phương án dự phòng 1 nha em.',
    herNote: 'Phòng kính ngắm thông thơ mộng nhưng tối đi ăn đêm hơi ngại đi xa.',
    votes: 1,
    isChosen: false,
    contactPhone: '0988.765.432',
    createdAt: '2026-09-18T08:30:00.000Z'
  },
  {
    id: 'srv-3',
    tripId: '',
    category: 'Hotel',
    name: 'Nhà Của Tre Homestay (Tre\'s House)',
    address: 'Võ Trường Toản, Phường 8, TP. Đà Lạt',
    distanceToCenter: '2,9 km tới Chợ Đà Lạt · Gần ĐH Đà Lạt (7 phút lái xe)',
    pricePerUnit: 520000,
    unitLabel: 'đêm',
    weekendSurcharge: 0,
    deposit: 300000,
    totalEstimate: 1040000,
    amenities: ['Sân vườn vintage', 'Bếp nấu tự do', 'Có cho thuê xe máy'],
    pros: ['Giá mềm tiết kiệm nhất', 'Phong cách mộc mạc cổ điển'],
    cons: ['Phòng ngủ hơi nhỏ', 'Không phục vụ bữa sáng'],
    photos: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80'
    ],
    hisNote: 'Tiết kiệm được 260k để dành đi ăn lẩu bò ba toa!',
    herNote: 'Em thích bồn tắm gỗ của Hoàng Hôn Xanh hơn nè.',
    votes: 1,
    isChosen: false,
    contactPhone: '0903.111.222',
    createdAt: '2026-09-18T09:00:00.000Z'
  },
  {
    id: 'srv-4',
    tripId: '',
    category: 'Motorbike',
    name: 'Tiệm Thuê Xe Máy Chị Hoa',
    address: 'Bến xe Liên tỉnh & Giao tận nơi khách sạn',
    distanceToCenter: 'Giao nhận xe miễn phí tận bến xe hoặc homestay',
    pricePerUnit: 130000,
    unitLabel: 'ngày',
    weekendSurcharge: 0,
    deposit: 0,
    totalEstimate: 390000,
    amenities: ['Xe Honda Vision 2024 mới tinh', '2 Nón bảo hiểm kính xịn', '2 Áo mưa sẵn trong cốp', 'Sẵn 1 lít xăng', 'Cứu hộ 24/7'],
    pros: ['Xe máy mới leo dốc êm', 'Giao xe tận nơi miễn phí', 'Không cần cọc tiền mặt (chỉ giữ CCCD)'],
    cons: ['Cần gọi trước 30 phút'],
    photos: [],
    hisNote: 'Xe Vision đời mới máy khỏe leo dốc Đà Lạt an toàn, 2 nón xịn nữa.',
    herNote: 'Chị chủ nhiệt tình, giao xe tận nơi cho mình luôn anh ơi ♥',
    votes: 2,
    isChosen: true,
    contactPhone: '0933.222.111',
    createdAt: '2026-09-18T09:30:00.000Z'
  },
  {
    id: 'srv-5',
    tripId: '',
    category: 'Transportation',
    name: 'Nhà Xe An Anh Limousine — Phòng Đôi VIP',
    address: 'Bến xe Miền Đông mới / Lê Hồng Phong ➔ Đà Lạt',
    distanceToCenter: 'Trung chuyển miễn phí tận homestay',
    pricePerUnit: 750000,
    unitLabel: 'vé đôi',
    weekendSurcharge: 0,
    deposit: 750000,
    totalEstimate: 750000,
    amenities: ['Giường đôi có rèm riêng tư', 'Massage toàn thân', 'Cổng sạc điện thoại & Wifi', 'Xe trung chuyển tận nơi'],
    pros: ['Phòng đôi riêng tư cho cặp đôi', 'Xe chạy êm không say', 'Đưa đón tận cửa homestay'],
    cons: ['Cần đặt trước 1 tuần vì hay hết vé tầng trên'],
    photos: [],
    hisNote: 'Đi phòng đôi nằm ôm nhau ngủ một giấc 5 tiếng là tới Đà Lạt.',
    herNote: 'Ghế có massage thích lắm anh, chốt xe này nhé ♥',
    votes: 2,
    isChosen: true,
    contactPhone: '1900.5678',
    createdAt: '2026-09-18T10:00:00.000Z'
  }
];

export const Services: React.FC<ServicesProps> = ({
  tripInfo,
  services,
  onSaveServices,
  onChooseHotelForItinerary
}) => {
  const { lang } = useLanguage();
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingServicePhotos, setIsProcessingServicePhotos] = useState(false);
  const [servicePhotoError, setServicePhotoError] = useState<string | null>(null);

  const handleServicePhotosSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingItem || editingItem.category !== 'Hotel') return;
    const current = Array.isArray(editingItem.photos) ? editingItem.photos : [];
    if (current.length + files.length > 8) {
      setServicePhotoError('Tối đa 8 ảnh tham khảo cho mỗi chỗ ở.');
      return;
    }
    setServicePhotoError(null);
    setIsProcessingServicePhotos(true);
    try {
      const converted: string[] = [];
      for (let i = 0; i < files.length; i += 1) {
        if (!files[i].type.startsWith('image/')) continue;
        converted.push(await fileToBase64(files[i], 1000, 1000, 0.68, 220));
      }
      setEditingItem((prev) => prev ? { ...prev, photos: [...(prev.photos || []), ...converted] } : prev);
    } catch (err) {
      console.warn('Service photo processing failed:', err);
      setServicePhotoError('Không thể xử lý ảnh. Vui lòng thử ảnh khác hoặc ảnh dung lượng nhỏ hơn.');
    } finally {
      setIsProcessingServicePhotos(false);
      if (servicePhotoInputRef.current) servicePhotoInputRef.current.value = '';
    }
  };

  // Fall back to sample services only when services were never saved (undefined).
  // An intentionally emptied list (user deleted all options) must stay empty,
  // otherwise deleted services would resurrect on every render/refresh.
  const currentServices = !services ? DEFAULT_SERVICES.map(s => ({ ...s, tripId: tripInfo.id })) : services;

  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'All'>('Hotel');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceOption | null>(null);

  // Filtered services
  const filteredServices = activeCategory === 'All'
    ? currentServices
    : currentServices.filter(s => s.category === activeCategory);

  // Status counters
  const hotelChosen = currentServices.find(s => s.category === 'Hotel' && s.isChosen);
  const bikeChosen = currentServices.find(s => s.category === 'Motorbike' && s.isChosen);
  const busChosen = currentServices.find(s => s.category === 'Transportation' && s.isChosen);

  const handleChoose = (id: string, category: ServiceCategory) => {
    const updated = currentServices.map(s => {
      if (s.category === category) {
        return { ...s, isChosen: s.id === id };
      }
      return s;
    });
    onSaveServices(updated);

    const chosen = updated.find(s => s.id === id);
    if (chosen && chosen.category === 'Hotel' && onChooseHotelForItinerary) {
      onChooseHotelForItinerary(chosen);
    }
  };

  const handleVote = (id: string) => {
    const updated = currentServices.map(s => {
      if (s.id === id) {
        return { ...s, votes: (s.votes || 0) + 1 };
      }
      return s;
    });
    onSaveServices(updated);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'vi' ? 'Bạn có chắc muốn xóa phương án này?' : 'Delete this option?')) {
      const updated = currentServices.filter(s => s.id !== id);
      onSaveServices(updated);
    }
  };

  const handleOpenAdd = (category: ServiceCategory = 'Hotel') => {
    setEditingItem({
      id: 'srv-' + Date.now(),
      tripId: tripInfo.id,
      category: category,
      name: '',
      address: '',
      distanceToCenter: '',
      pricePerUnit: 600000,
      unitLabel: category === 'Hotel' ? 'đêm' : category === 'Motorbike' ? 'ngày' : 'vé',
      weekendSurcharge: 0,
      deposit: 0,
      totalEstimate: 0,
      amenities: [],
      pros: [],
      cons: [],
      photos: [],
      hisNote: '',
      herNote: '',
      votes: 1,
      isChosen: false
    });
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    // Couple-note fields are retired from this screen; clear legacy values on save.
    const cleanedItem: ServiceOption = { ...editingItem, hisNote: '', herNote: '' };

    const exists = currentServices.some(s => s.id === editingItem.id);
    let updated: ServiceOption[];
    if (exists) {
      updated = currentServices.map(s => s.id === editingItem.id ? cleanedItem : s);
    } else {
      updated = [cleanedItem, ...currentServices];
    }
    onSaveServices(updated);
    setModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Title & Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] p-5 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏨</span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#382D24]">
              {lang === 'vi' ? 'Khảo sát & Lựa chọn Dịch vụ ♥' : 'Service Options & Stays'}
            </h2>
            <span className="bg-[#FAF4EC] text-[#B45309] border border-[#F1DAAB] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {lang === 'vi' ? 'Dành cho 2 đứa' : 'Couple Shortlist'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#735D4E] mt-1 max-w-2xl">
            {lang === 'vi' 
              ? 'Lưu lại các homestay, nhà xe, tiệm thuê xe máy để so sánh khoảng cách tới chợ Đà Lạt, tiện nghi bồn tắm/view và các loại chi phí trước khi chốt.'
              : 'Shortlist hotels, motorbikes, and buses to compare distance, amenities, and costs before booking.'}
          </p>
        </div>

        {/* Quick status pill list */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
            hotelChosen ? 'bg-[#EBF5EC] text-[#2E6B38] border-[#CDE5D1]' : 'bg-[#FFFDF9] text-[#8C6D58] border-[#E8DEC8]'
          }`}>
            <span>🏨 Khách sạn:</span>
            <span>{hotelChosen ? '✓ Đã chốt' : 'Chưa chọn'}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
            bikeChosen ? 'bg-[#EBF5EC] text-[#2E6B38] border-[#CDE5D1]' : 'bg-[#FFFDF9] text-[#8C6D58] border-[#E8DEC8]'
          }`}>
            <span>🛵 Xe máy:</span>
            <span>{bikeChosen ? '✓ Đã chốt' : 'Chưa chọn'}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
            busChosen ? 'bg-[#EBF5EC] text-[#2E6B38] border-[#CDE5D1]' : 'bg-[#FFFDF9] text-[#8C6D58] border-[#E8DEC8]'
          }`}>
            <span>🚌 Xe khách:</span>
            <span>{busChosen ? '✓ Đã chốt' : 'Chưa chọn'}</span>
          </div>
        </div>
      </div>

      {/* Category Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveCategory('Hotel')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border ${
              activeCategory === 'Hotel'
                ? 'bg-[#55423A] text-white border-[#55423A] shadow-sm'
                : 'bg-[#FFFDF9] text-[#6E4F36] border-[#E8DEC8] hover:bg-[#FAF7F2]'
            }`}
          >
            <span>🏨</span>
            <span>{lang === 'vi' ? 'Chỗ ở / Homestay' : 'Hotels & Stays'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {currentServices.filter(s => s.category === 'Hotel').length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('Motorbike')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border ${
              activeCategory === 'Motorbike'
                ? 'bg-[#55423A] text-white border-[#55423A] shadow-sm'
                : 'bg-[#FFFDF9] text-[#6E4F36] border-[#E8DEC8] hover:bg-[#FAF7F2]'
            }`}
          >
            <span>🛵</span>
            <span>{lang === 'vi' ? 'Thuê xe máy' : 'Motorbike Rental'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {currentServices.filter(s => s.category === 'Motorbike').length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('Transportation')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border ${
              activeCategory === 'Transportation'
                ? 'bg-[#55423A] text-white border-[#55423A] shadow-sm'
                : 'bg-[#FFFDF9] text-[#6E4F36] border-[#E8DEC8] hover:bg-[#FAF7F2]'
            }`}
          >
            <span>🚌</span>
            <span>{lang === 'vi' ? 'Xe khách / Di chuyển' : 'Bus & Transit'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {currentServices.filter(s => s.category === 'Transportation').length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer border ${
              activeCategory === 'All'
                ? 'bg-[#55423A] text-white border-[#55423A] shadow-sm'
                : 'bg-[#FFFDF9] text-[#6E4F36] border-[#E8DEC8] hover:bg-[#FAF7F2]'
            }`}
          >
            <span>Tất cả</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {currentServices.length}
            </span>
          </button>
        </div>

        {/* View mode toggle & Add Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#EFE6DB] p-1 rounded-xl flex items-center gap-1 border border-[#E2D4C3]">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#FFFDF9] text-[#382D24] shadow-xs' : 'text-[#8C6D58] hover:text-[#382D24]'
              }`}
            >
              <span>🗂️ Danh sách thẻ</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'matrix' ? 'bg-[#FFFDF9] text-[#382D24] shadow-xs' : 'text-[#8C6D58] hover:text-[#382D24]'
              }`}
            >
              <span>📊 Báo cáo so sánh</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenAdd(activeCategory === 'All' ? 'Hotel' : activeCategory)}
            className="px-4 py-2.5 rounded-xl bg-[#C4685A] hover:bg-[#b0584b] text-white text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Thêm phương án' : 'Add Option'}</span>
          </button>
        </div>
      </div>

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const isWinner = service.isChosen;
            return (
              <div
                key={service.id}
                className={`bg-[#FFFDF9] rounded-3xl overflow-hidden border transition-all duration-200 flex flex-col relative ${
                  isWinner
                    ? 'border-2 border-[#D97706] shadow-md ring-2 ring-[#FDE68A]/50'
                    : 'border-[#E8DEC8] hover:border-[#6E4F36] shadow-xs hover:shadow-md'
                }`}
              >
                {/* Winner Ribbon Badge */}
                {isWinner && (
                  <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-[#D97706] to-[#B45309] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{lang === 'vi' ? 'ĐÃ CHỐT CHỖ NÀY ♥' : 'SELECTED WINNER'}</span>
                  </div>
                )}
                {!isWinner && (
                  <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md text-[#735D4E] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#E8DEC8]">
                    {lang === 'vi' ? 'Đang cân nhắc' : 'Candidate'}
                  </div>
                )}

                {/* Cover Photo / Gallery Preview */}
                <div className="h-44 relative bg-[#EFE8DE] overflow-hidden">
                  {service.photos && service.photos.length > 0 ? (
                    <img
                      src={service.photos[0]}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#8C6D58] bg-[#FAF7F2]">
                      <BedDouble className="w-10 h-10 stroke-[1.2]" />
                      <span className="text-xs font-medium mt-1">{service.category}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-2.5 left-3 text-white">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-serif text-lg font-bold text-[#FDE68A]">
                        {service.pricePerUnit ? service.pricePerUnit.toLocaleString('vi-VN') + ' ₫' : 'Chưa có giá'}
                      </span>
                      <span className="text-[11px] opacity-90">/ {service.unitLabel || 'đêm'}</span>
                    </div>
                    {service.totalEstimate ? (
                      <div className="text-[10px] text-white/90 font-medium">
                        Tổng dự kiến: {service.totalEstimate.toLocaleString('vi-VN')} ₫
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#382D24] leading-snug">
                      {service.name}
                    </h3>
                    
                    {/* Distance to Center */}
                    {service.distanceToCenter && (
                      <div className="mt-2 bg-[#FAF7F2] border border-[#E2D4C3] rounded-xl px-2.5 py-1.5 text-xs flex items-start gap-1.5 text-[#55423A]">
                        <MapPin className="w-3.5 h-3.5 text-[#1A73E8] shrink-0 mt-0.5" />
                        <span className="font-medium">{service.distanceToCenter}</span>
                      </div>
                    )}

                    {/* Cost Breakdown Details */}
                    <div className="mt-2.5 bg-white border border-[#E8DEC8] rounded-xl p-2.5 space-y-1 text-xs">
                      <div className="flex justify-between text-[#55423A]">
                        <span>Giá cơ bản:</span>
                        <span className="font-bold">{service.pricePerUnit?.toLocaleString('vi-VN')} ₫</span>
                      </div>
                      <div className="flex justify-between text-[#735D4E]">
                        <span>Phụ thu cuối tuần:</span>
                        <span className={service.weekendSurcharge ? 'font-bold text-[#C4685A]' : 'font-bold text-[#2E6B38]'}>
                          {service.weekendSurcharge ? `+${service.weekendSurcharge.toLocaleString('vi-VN')} ₫` : '0 ₫ (Free)'}
                        </span>
                      </div>
                      {service.deposit ? (
                        <div className="flex justify-between text-[#735D4E]">
                          <span>Tiền cọc phòng:</span>
                          <span className="font-medium">{service.deposit.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      ) : null}
                      {service.totalEstimate ? (
                        <div className="flex justify-between font-bold pt-1 border-t border-[#E8DEC8] text-[#B45309]">
                          <span>Tổng chuyến đi:</span>
                          <span>{service.totalEstimate.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Amenities Checklist */}
                    {service.amenities && service.amenities.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {service.amenities.map((amenity, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-[#EBF5EC] text-[#2E6B38] border border-[#CDE5D1] px-2 py-0.5 rounded-md"
                          >
                            ✓ {amenity}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Actions & Choose Button */}
                  <div className="pt-3 border-t border-[#E8DEC8] space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleVote(service.id)}
                        className="flex items-center gap-1 text-xs font-bold text-[#C4685A] hover:bg-[#FDF0EE] px-2.5 py-1 rounded-lg transition cursor-pointer"
                        title="Thả tim bình chọn"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#C4685A]" />
                        <span>{service.votes || 1} tim</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingItem(service); setModalOpen(true); }}
                          className="p-1.5 text-[#8C6D58] hover:text-[#382D24] hover:bg-[#FAF7F2] rounded-lg transition"
                          title="Sửa phương án"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-1.5 text-[#8C6D58] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition"
                          title="Xóa phương án"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Main Pick Button */}
                    <button
                      onClick={() => handleChoose(service.id, service.category)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        isWinner
                          ? 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-white shadow-sm'
                          : 'bg-[#FFFDF9] border border-[#D9CABB] text-[#5C4033] hover:bg-[#FDF0EE] hover:border-[#C4685A] hover:text-[#C4685A]'
                      }`}
                    >
                      {isWinner ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>{lang === 'vi' ? '✓ ĐÃ CHỐT DỊCH VỤ NÀY' : '✓ SELECTED OPTION'}</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4" />
                          <span>{lang === 'vi' ? '❤️ Chốt chọn chỗ này' : 'Choose this option'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MATRIX COMPARISON REPORT VIEW */}
      {(viewMode === 'matrix' || filteredServices.length >= 2) && (
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#382D24] flex items-center gap-2">
                <span>📊 Báo cáo Phân tích So sánh Đối đầu</span>
                <span className="text-xs font-normal text-[#8C6D58]">
                  ({filteredServices.length} {lang === 'vi' ? 'phương án' : 'options'})
                </span>
              </h3>
              <p className="text-xs text-[#735D4E] mt-0.5">
                {lang === 'vi'
                  ? 'So sánh trực quan các loại chi phí, khoảng cách chợ và tiện nghi để hai bạn dễ dàng đưa ra quyết định.'
                  : 'Direct comparison across cost breakdown, distance, and amenities.'}
              </p>
            </div>
            <span className="hidden sm:inline-flex text-xs font-bold text-[#2E6B38] bg-[#EBF5EC] border border-[#CDE5D1] px-3 py-1 rounded-full">
              ✓ Cập nhật mới nhất
            </span>
          </div>

          <div className="overflow-x-auto border border-[#E2D4C3] rounded-2xl bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E2D4C3]">
                  <th className="p-3 font-bold text-[#55423A] w-1/4 uppercase tracking-wider text-[10px]">Tiêu chí so sánh</th>
                  {filteredServices.map(s => (
                    <th
                      key={s.id}
                      className={`p-3 font-bold text-center ${
                        s.isChosen ? 'bg-[#FFF8EC] text-[#B45309] border-x-2 border-[#D97706]' : 'text-[#382D24]'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-serif">{s.name}</div>
                      {s.isChosen && (
                        <span className="inline-block mt-0.5 text-[9px] font-extrabold bg-[#D97706] text-white px-2 py-0.2 rounded-full">
                          ★ ĐÃ CHỐT
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D4C3]">
                
                {/* Cost Section */}
                <tr className="bg-[#FAF7F2]/60 font-bold text-[#8C6D58] text-[10px]">
                  <td colSpan={filteredServices.length + 1} className="p-2 pl-3">💰 1. PHÂN TÍCH CÁC LOẠI CHI PHÍ</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#55423A]">Giá cơ bản (đêm/ngày/vé)</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center font-bold font-mono ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      {s.pricePerUnit?.toLocaleString('vi-VN')} ₫
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#55423A]">Phụ thu cuối tuần</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      {s.weekendSurcharge ? (
                        <span className="text-[#C4685A] font-semibold">+{s.weekendSurcharge.toLocaleString('vi-VN')} ₫</span>
                      ) : (
                        <span className="text-[#2E6B38] font-semibold">0 ₫ (Không phụ thu)</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#55423A]">Tiền cọc giữ chỗ</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      {s.deposit ? `${s.deposit.toLocaleString('vi-VN')} ₫` : 'Không cần cọc'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-bold text-[#382D24]">Tổng chi phí dự kiến</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center font-bold text-sm text-[#B45309] font-mono ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      {s.totalEstimate ? `${s.totalEstimate.toLocaleString('vi-VN')} ₫` : '—'}
                    </td>
                  ))}
                </tr>

                {/* Distance Section */}
                <tr className="bg-[#FAF7F2]/60 font-bold text-[#8C6D58] text-[10px]">
                  <td colSpan={filteredServices.length + 1} className="p-2 pl-3">📍 2. KHOẢNG CÁCH TỚI CHỢ ĐÀ LẠT & TRUNG TÂM</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#55423A]">Vị trí & Khoảng cách</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center text-xs ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      <div className="font-semibold text-[#1A73E8]">{s.distanceToCenter || s.address}</div>
                    </td>
                  ))}
                </tr>

                {/* Amenities Section */}
                <tr className="bg-[#FAF7F2]/60 font-bold text-[#8C6D58] text-[10px]">
                  <td colSpan={filteredServices.length + 1} className="p-2 pl-3">🛁 3. BẢNG TIỆN NGHI CHI TIẾT</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#55423A]">Tiện nghi nổi bật</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {s.amenities && s.amenities.length > 0 ? (
                          s.amenities.map((a, i) => (
                            <span key={i} className="text-[10px] bg-[#FAF7F2] text-[#55423A] border border-[#E2D4C3] px-1.5 py-0.5 rounded">
                              {a}
                            </span>
                          ))
                        ) : '—'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Decision Section */}
                <tr className="bg-[#FAF7F2]/60 font-bold text-[#8C6D58] text-[10px]">
                  <td colSpan={filteredServices.length + 1} className="p-2 pl-3">🎯 4. BÌNH CHỌN & QUYẾT ĐỊNH CỦA 2 BẠN</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#55423A]">Lượt tim & Đánh giá</td>
                  {filteredServices.map(s => (
                    <td key={s.id} className={`p-3 text-center ${s.isChosen ? 'bg-[#FFFDF7] border-x-2 border-[#D97706]' : ''}`}>
                      <div className="font-bold text-[#C4685A] flex items-center justify-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        <span>{s.votes || 1} tim</span>
                      </div>
                      <div className="text-[11px] text-[#735D4E] mt-1 italic">
                        {s.isChosen ? '🏆 Đã chốt lựa chọn này ♥' : 'Phương án dự phòng'}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE OPTION */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-[#8C6D58] hover:text-[#382D24] p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#382D24] mb-1">
              {editingItem.id && currentServices.some(s => s.id === editingItem.id)
                ? (lang === 'vi' ? 'Chỉnh sửa phương án' : 'Edit Option')
                : (lang === 'vi' ? 'Thêm phương án dịch vụ mới' : 'Add New Option')}
            </h3>
            <p className="text-xs text-[#735D4E] mb-4">
              Lưu lại homestay, nhà xe hoặc tiệm thuê xe máy bạn và người yêu đang ngắm nghía
            </p>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-[#55423A] mb-1">Danh mục dịch vụ *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, category: 'Hotel', unitLabel: 'đêm' })}
                    className={`py-2 rounded-xl font-bold border transition ${
                      editingItem.category === 'Hotel' ? 'bg-[#55423A] text-white border-[#55423A]' : 'bg-white border-[#E8DEC8] text-[#55423A]'
                    }`}
                  >
                    🏨 Chỗ ở
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, category: 'Motorbike', unitLabel: 'ngày' })}
                    className={`py-2 rounded-xl font-bold border transition ${
                      editingItem.category === 'Motorbike' ? 'bg-[#55423A] text-white border-[#55423A]' : 'bg-white border-[#E8DEC8] text-[#55423A]'
                    }`}
                  >
                    🛵 Thuê xe máy
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, category: 'Transportation', unitLabel: 'vé' })}
                    className={`py-2 rounded-xl font-bold border transition ${
                      editingItem.category === 'Transportation' ? 'bg-[#55423A] text-white border-[#55423A]' : 'bg-white border-[#E8DEC8] text-[#55423A]'
                    }`}
                  >
                    🚌 Xe khách
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-[#55423A] mb-1">Tên dịch vụ / Khách sạn *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="Ví dụ: Hoàng Hôn Xanh Homestay, Tiệm xe máy Chị Hoa..."
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C4685A] outline-hidden"
                />
              </div>

              {/* Distance to Center */}
              <div>
                <label className="block font-bold text-[#55423A] mb-1">Khoảng cách tới Chợ Đà Lạt / Trung tâm</label>
                <input
                  type="text"
                  value={editingItem.distanceToCenter || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, distanceToCenter: e.target.value })}
                  placeholder="Ví dụ: Cách chợ 1,8 km (5 phút xe máy), gần bờ hồ..."
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C4685A] outline-hidden"
                />
              </div>

              {/* Cost breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#55423A] mb-1">Giá mỗi đơn vị (₫)</label>
                  <input
                    type="number"
                    value={editingItem.pricePerUnit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, pricePerUnit: Number(e.target.value) || 0 })}
                    placeholder="650000"
                    className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C4685A] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#55423A] mb-1">Tổng tiền dự kiến (₫)</label>
                  <input
                    type="number"
                    value={editingItem.totalEstimate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, totalEstimate: Number(e.target.value) || 0 })}
                    placeholder="1300000"
                    className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C4685A] outline-hidden"
                  />
                </div>
              </div>

              {/* Contact info — available for every service category */}
              <div>
                <label className="block font-bold text-[#55423A] mb-1">Thông tin liên hệ</label>
                <input
                  type="text"
                  value={editingItem.contactPhone || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, contactPhone: e.target.value })}
                  placeholder="Ví dụ: 0909 123 456 – Chị Lan / Zalo / Lễ tân"
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C4685A] outline-hidden"
                />
              </div>

              {/* Reference link — separate from uploaded hotel photos */}
              <div>
                <label className="block font-bold text-[#55423A] mb-1">Link tham khảo</label>
                <input
                  type="url"
                  value={editingItem.linkUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, linkUrl: e.target.value })}
                  placeholder="https://maps.app.goo.gl/... hoặc website / Facebook"
                  className="w-full bg-white border border-[#D9CABB] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C4685A] outline-hidden"
                />
              </div>

              {/* Hotel-only reference photo gallery */}
              {editingItem.category === 'Hotel' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-[#55423A]">Ảnh tham khảo</label>
                    <span className="text-[11px] text-[#8C6D58]">{editingItem.photos?.length || 0}/8 ảnh</span>
                  </div>
                  <input
                    ref={servicePhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleServicePhotosSelected(e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => servicePhotoInputRef.current?.click()}
                    disabled={isProcessingServicePhotos}
                    className="w-full border-2 border-dashed border-[#D9CABB] hover:border-[#B07D62] bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition disabled:opacity-60"
                  >
                    {isProcessingServicePhotos ? (
                      <><Loader2 className="w-5 h-5 animate-spin text-[#B07D62]" /><span className="text-xs font-medium text-[#6E4F36]">Đang tối ưu ảnh...</span></>
                    ) : (
                      <><UploadCloud className="w-5 h-5 text-[#8C6D58]" /><span className="text-xs font-bold text-[#5C4033]">Thêm ảnh phòng tham khảo</span><span className="text-[10px] text-[#8C6D58]">Chọn nhiều ảnh từ điện thoại hoặc máy tính</span></>
                    )}
                  </button>
                  {servicePhotoError && <p className="text-xs text-[#B85340] mt-1.5">{servicePhotoError}</p>}
                  {(editingItem.photos?.length || 0) > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {editingItem.photos!.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#E2D4C3] bg-[#FAF7F2]">
                          <img src={photo} alt={`Ảnh tham khảo ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, photos: editingItem.photos!.filter((_, i) => i !== idx) })}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center"
                            aria-label="Xóa ảnh"
                          ><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D9CABB] font-bold text-[#735D4E] hover:bg-[#FAF7F2] transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4685A] hover:bg-[#b0584b] text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Lưu phương án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
