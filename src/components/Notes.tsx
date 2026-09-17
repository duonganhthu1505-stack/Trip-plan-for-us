import React, { useState, useRef } from 'react';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Clock,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Download,
  Loader2,
  MapPin,
  Camera
} from 'lucide-react';
import { JournalNote } from '../types';
import { formatDateVN } from '../utils/dateHelpers';
import { useLanguage } from '../i18n/LanguageContext';
import { fileToBase64, getBase64SizeKB } from '../utils/imageHelpers';

interface NotesProps {
  tripId: string;
  tripName?: string;
  notes: JournalNote[];
  onSaveNotes: (notes: JournalNote[]) => void;
  onRequestDeleteNote: (id: string, title: string) => void;
}

export const getNoteCategoryLabel = (cat: string, lang: string) => {
  if (lang !== 'vi') return cat;
  switch (cat) {
    case 'ALL': return 'Tất cả';
    case 'PHOTOS': return 'Bộ sưu tập ảnh';
    case 'Hotel info': return 'Thông tin khách sạn';
    case 'Booking code': return 'Mã đặt chỗ';
    case 'Flight information': return 'Thông tin chuyến bay';
    case 'Food wishlist': return 'Món ngon muốn thử';
    case 'Important notes': return 'Ghi chú quan trọng';
    case 'Romantic diary': return 'Nhật ký kỷ niệm';
    case 'Other': return 'Khác';
    default: return cat;
  }
};

const NOTE_CATEGORIES = [
  'Hotel info',
  'Booking code',
  'Flight information',
  'Food wishlist',
  'Important notes',
  'Romantic diary',
  'Other'
];

export const Notes: React.FC<NotesProps> = ({
  tripId,
  tripName,
  notes,
  onSaveNotes,
  onRequestDeleteNote
}) => {
  const { t, lang } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<JournalNote | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Important notes');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox State for full-screen photo viewing
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    noteTitle: string;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    noteTitle: '',
    images: [],
    currentIndex: 0
  });

  // Collect all photos from all notes of this trip
  const allTripPhotos = notes.flatMap((note) =>
    (note.images || []).map((img, idx) => ({
      img,
      noteId: note.id,
      noteTitle: note.title,
      category: note.category,
      updatedAt: note.updatedAt,
      index: idx
    }))
  );

  const openAddModal = (defaultCat?: string) => {
    setEditingNote(null);
    setTitle('');
    setCategory(defaultCat || (activeCategory !== 'ALL' && activeCategory !== 'PHOTOS' ? activeCategory : 'Romantic diary'));
    setContent('');
    setImages([]);
    setUploadError(null);
    setModalOpen(true);
  };

  const openEditModal = (note: JournalNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setCategory(note.category);
    setContent(note.content);
    setImages(Array.isArray(note.images) ? [...note.images] : []);
    setUploadError(null);
    setModalOpen(true);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsProcessingImage(true);

    const maxAllowed = 8;
    if (images.length + files.length > maxAllowed) {
      setUploadError(
        lang === 'vi'
          ? `Chỉ được đính kèm tối đa ${maxAllowed} ảnh cho mỗi ghi chú.`
          : `You can attach up to ${maxAllowed} photos per note.`
      );
      setIsProcessingImage(false);
      return;
    }

    try {
      const convertedBase64List: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const base64 = await fileToBase64(file, 1100, 1100, 0.75);
        convertedBase64List.push(base64);
      }

      setImages((prev) => [...prev, ...convertedBase64List]);
    } catch (err: any) {
      console.error('Lỗi nén ảnh Base64:', err);
      setUploadError(
        lang === 'vi'
          ? 'Không thể xử lý một số tệp ảnh. Vui lòng thử lại với ảnh dung lượng nhỏ hơn.'
          : 'Could not process some image files. Please try again.'
      );
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingNote) {
      const updated = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: title.trim(),
              category,
              content: content.trim(),
              images,
              updatedAt: new Date().toISOString()
            }
          : n
      );
      onSaveNotes(updated);
    } else {
      const newNote: JournalNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId,
        title: title.trim(),
        category,
        content: content.trim(),
        images,
        updatedAt: new Date().toISOString()
      };
      onSaveNotes([...notes, newNote]);
    }
    setModalOpen(false);
  };

  const openLightbox = (noteTitle: string, imagesList: string[], startIndex: number = 0) => {
    if (!imagesList || imagesList.length === 0) return;
    setLightbox({
      isOpen: true,
      noteTitle,
      images: imagesList,
      currentIndex: startIndex
    });
  };

  const closeLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  const nextLightboxImage = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevLightboxImage = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  const filteredNotes = activeCategory === 'ALL' || activeCategory === 'PHOTOS'
    ? notes
    : notes.filter((n) => n.category === activeCategory);

  return (
    <div id="notes-page" className="space-y-6 pb-16">
      {/* Header Banner with Trip context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#C27D66]" />
            <span>
              {lang === 'vi' ? 'Nhật ký & Kỷ niệm hành trình' : 'Travel Journal & Memories'}
            </span>
            {tripName && (
              <>
                <span>•</span>
                <span className="text-[#382D24] font-bold font-serif">{tripName}</span>
              </>
            )}
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            {lang === 'vi' ? 'Ghi chú & Ảnh chụp chuyến đi' : 'Trip Notes & Photo Journal'}
          </h2>
          <p className="text-xs sm:text-sm text-[#735D4E] mt-1 max-w-2xl">
            {lang === 'vi'
              ? `Tải ảnh và ghi chép dành riêng cho chuyến đi "${tripName || 'này'}". Toàn bộ ảnh được mã hóa Base64 và lưu đồng bộ trực tiếp lên Firebase Cloud.`
              : `Upload memories and notes for "${tripName || 'this trip'}". All photos are Base64 encoded and synced seamlessly to Firebase Cloud.`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            id="notes-add-photo-btn"
            onClick={() => openAddModal('Romantic diary')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE2] border border-[#D9CABB] text-[#5C4033] text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <Camera className="w-4 h-4 text-[#B07D62]" />
            <span>{lang === 'vi' ? 'Đăng ảnh kỷ niệm' : 'Upload Photo'}</span>
          </button>

          <button
            id="notes-add-btn"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Thêm ghi chép' : 'New Note'}</span>
          </button>
        </div>
      </div>

      {/* Category & Gallery Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
            activeCategory === 'ALL'
              ? 'bg-[#5C4033] text-white'
              : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
          }`}
        >
          {lang === 'vi' ? 'Tất cả bài viết' : 'All Notes'} ({notes.length})
        </button>

        {/* Dedicated Photos Album Pill */}
        <button
          onClick={() => setActiveCategory('PHOTOS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'PHOTOS'
              ? 'bg-[#5C4033] text-white'
              : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#C27D66]" />
          <span>{lang === 'vi' ? 'Kho ảnh chuyến đi' : 'Trip Photos'}</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full">
            {allTripPhotos.length}
          </span>
        </button>

        {NOTE_CATEGORIES.map((cat) => {
          const count = notes.filter((n) => n.category === cat).length;
          if (count === 0 && activeCategory !== cat) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#5C4033] text-white'
                  : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
              }`}
            >
              {getNoteCategoryLabel(cat, lang)} ({count})
            </button>
          );
        })}
      </div>

      {/* If "PHOTOS" view is selected, render the dedicated trip Photo Album */}
      {activeCategory === 'PHOTOS' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#382D24] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#C27D66]" />
              <span>{lang === 'vi' ? 'Bộ sưu tập ảnh chuyến đi' : 'Trip Photo Album'}</span>
              <span className="text-xs text-[#8C6D58] font-normal font-sans">
                ({allTripPhotos.length} {lang === 'vi' ? 'ảnh đã tải lên' : 'photos uploaded'})
              </span>
            </h3>
            <button
              onClick={() => openAddModal('Romantic diary')}
              className="text-xs font-semibold text-[#5C4033] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? 'Thêm ảnh mới' : 'Add photo'}</span>
            </button>
          </div>

          {allTripPhotos.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-3">
              <ImageIcon className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
              <h4 className="font-serif text-lg font-bold text-[#382D24]">
                {lang === 'vi' ? 'Chưa có ảnh nào cho chuyến đi này' : 'No photos uploaded for this trip yet'}
              </h4>
              <p className="text-xs text-[#735D4E] max-w-md mx-auto">
                {lang === 'vi'
                  ? 'Tải lên hình ảnh vé máy bay, phòng khách sạn, các món ăn ngon hoặc khoảnh khắc tình yêu đẹp nhất trong hành trình.'
                  : 'Upload tickets, room views, delicious foods, or memorable romantic moments from your journey.'}
              </p>
              <button
                onClick={() => openAddModal('Romantic diary')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{lang === 'vi' ? 'Tải ảnh đầu tiên lên' : 'Upload First Photo'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {allTripPhotos.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => openLightbox(item.noteTitle, allTripPhotos.map(p => p.img), idx)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E2D4C3] cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300"
                >
                  <img
                    src={item.img}
                    alt={item.noteTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B1E16]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                    <div className="self-end p-1 rounded-lg bg-black/40 backdrop-blur-2xs">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate drop-shadow-sm">{item.noteTitle}</p>
                      <p className="text-[10px] text-stone-300">
                        {getNoteCategoryLabel(item.category, lang)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Notes Cards Grid */
        filteredNotes.length === 0 ? (
          <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
            <FileText className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
            <h4 className="font-serif text-xl font-bold text-[#382D24]">
              {lang === 'vi' ? 'Chưa có ghi chú nào' : 'No notes recorded yet'}
            </h4>
            <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
              {lang === 'vi'
                ? 'Lưu lại mã vé máy bay, ảnh chụp vé, hướng dẫn nhận phòng khách sạn, mật khẩu Wi-Fi hay những suy nghĩ ngọt ngào trên đường đi.'
                : 'Write down flight tickets, photo vouchers, check-in instructions, WiFi passwords, or sweet romantic thoughts from the road.'}
            </p>
            <button
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Viết ghi chú đầu tiên' : 'Write First Note'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNotes.map((note) => {
              const hasImages = Array.isArray(note.images) && note.images.length > 0;
              return (
                <div
                  key={note.id}
                  id={`note-card-${note.id}`}
                  className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle vintage paper fold accent */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#EFE8DE] to-[#FAF7F2] border-b border-l border-[#E2D4C3] rounded-bl-xl pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#FAF7F2] text-[#6E4F36] border border-[#E2D4C3]">
                          {getNoteCategoryLabel(note.category, lang)}
                        </span>
                        {hasImages && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F4EDE2] text-[#8C6D58] border border-[#E5D7C5] flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-[#B07D62]" />
                            <span>{note.images!.length} {lang === 'vi' ? 'ảnh' : 'photos'}</span>
                          </span>
                        )}
                      </div>

                      {note.updatedAt && (
                        <span className="text-[10px] text-[#8C6D58] flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDateVN(note.updatedAt.slice(0, 10))}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#382D24] mb-2 leading-snug">
                      {note.title}
                    </h3>

                    <div className="text-xs sm:text-sm text-[#5C4033] leading-relaxed whitespace-pre-wrap font-normal mb-3">
                      {note.content}
                    </div>

                    {/* Attached Images Gallery (Base64) */}
                    {hasImages && (
                      <div className="mt-3 pt-3 border-t border-[#F2ECE1]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-[#8C6D58] uppercase tracking-wider flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-[#C27D66]" />
                            <span>{lang === 'vi' ? 'Hình ảnh đính kèm' : 'Attached Photos'}</span>
                          </span>
                          <span className="text-[10px] text-[#A68A75]">
                            {lang === 'vi' ? 'Nhấn ảnh để phóng to' : 'Click to enlarge'}
                          </span>
                        </div>

                        <div className={`grid gap-2 ${
                          note.images!.length === 1 
                            ? 'grid-cols-1' 
                            : note.images!.length === 2 
                            ? 'grid-cols-2' 
                            : 'grid-cols-3'
                        }`}>
                          {note.images!.slice(0, 3).map((imgBase64, idx) => (
                            <div
                              key={idx}
                              onClick={() => openLightbox(note.title, note.images!, idx)}
                              className="relative group/img aspect-4/3 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#E2D4C3] cursor-pointer shadow-2xs hover:opacity-95 transition-all"
                            >
                              <img
                                src={imgBase64}
                                alt={`Note attachment ${idx + 1}`}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                              </div>

                              {/* Show remaining count if more than 3 */}
                              {idx === 2 && note.images!.length > 3 && (
                                <div className="absolute inset-0 bg-[#2B1E16]/70 backdrop-blur-2xs flex items-center justify-center text-white font-bold text-sm">
                                  +{note.images!.length - 3}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 mt-4 border-t border-[#F2ECE1] flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditModal(note)}
                      className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors cursor-pointer"
                      title={t.actions.edit}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRequestDeleteNote(note.id, note.title)}
                      className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#FBEBE8] text-[#8C6D58] hover:text-[#B85340] border border-[#E2D4C3] hover:border-[#E9BFB7] transition-colors cursor-pointer"
                      title={t.actions.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add / Edit Note Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B1E16]/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-[#FAF7F2] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden p-6 text-[#3D312A] relative max-h-[92vh] overflow-y-auto">
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
                  {editingNote
                    ? lang === 'vi'
                      ? 'Chỉnh sửa ghi chú chuyến đi'
                      : 'Edit Trip Note'
                    : lang === 'vi'
                    ? `Thêm kỷ niệm / ghi chú cho chuyến đi "${tripName || ''}"`
                    : `New note for trip "${tripName || ''}"`}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingNote
                  ? editingNote.title
                  : lang === 'vi'
                  ? 'Lưu nhật ký & Ảnh'
                  : 'Record Note & Photos'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Chuyên mục' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {getNoteCategoryLabel(cat, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Tiêu đề ghi chú *' : 'Note Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    lang === 'vi'
                      ? 'VD: Mã vé máy bay, Check-in khách sạn, Kỷ niệm hoàng hôn...'
                      : 'e.g. Flight Code, Hotel Voucher, Sunset Memories...'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Nội dung chi tiết *' : 'Content *'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    lang === 'vi'
                      ? 'Ghi lại chi tiết mã đặt chỗ, hướng dẫn, mật khẩu hoặc dòng tâm sự lãng mạn...'
                      : 'Write your notes, booking references, check-in instructions, or romantic memories...'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none font-normal leading-relaxed"
                />
              </div>

              {/* Photo Upload Section (Base64 for Firebase) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36]">
                    {lang === 'vi' ? 'Hình ảnh đính kèm (Lưu Firebase dạng Base64)' : 'Attach Photos (Base64 Firebase)'}
                  </label>
                  <span className="text-[11px] text-[#8C6D58]">
                    {images.length}/8 {lang === 'vi' ? 'ảnh' : 'photos'}
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />

                {/* Upload Trigger Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFilesSelected(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-[#5C4033] bg-[#F2ECE1]'
                      : 'border-[#D9CABB] hover:border-[#B07D62] bg-[#FFFDF9]'
                  }`}
                >
                  {isProcessingImage ? (
                    <div className="py-3 flex flex-col items-center gap-2 text-[#6E4F36]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#B07D62]" />
                      <span className="text-xs font-medium">
                        {lang === 'vi' ? 'Đang nén & chuyển đổi mã Base64...' : 'Converting images to Base64...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-full bg-[#FAF7F2] border border-[#E2D4C3] text-[#8C6D58]">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#5C4033] block">
                          {lang === 'vi' ? 'Chọn ảnh từ thiết bị hoặc kéo thả vào đây' : 'Upload photo or drag & drop'}
                        </span>
                        <span className="text-[11px] text-[#8C6D58]">
                          {lang === 'vi'
                            ? 'Hỗ trợ JPG, PNG, WebP (Tự động nén tối ưu Base64)'
                            : 'Supports JPG, PNG, WebP (Auto-optimized Base64)'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs text-[#B85340] mt-1.5 font-medium">{uploadError}</p>
                )}

                {/* Uploaded Base64 Images Preview Grid */}
                {images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {images.map((imgBase64, idx) => {
                      const sizeKB = getBase64SizeKB(imgBase64);
                      return (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#E2D4C3] group shadow-2xs"
                        >
                          <img
                            src={imgBase64}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
                            {sizeKB} KB
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-[#B85340] text-white transition-colors cursor-pointer"
                            title={lang === 'vi' ? 'Xóa ảnh này' : 'Remove photo'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  disabled={isProcessingImage}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] disabled:opacity-50 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {editingNote
                      ? lang === 'vi'
                        ? 'Lưu ghi chú'
                        : 'Save Note'
                      : lang === 'vi'
                      ? 'Thêm ghi chú'
                      : 'Add Note'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Fullscreen Photo Viewing */}
      {lightbox.isOpen && lightbox.images.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={closeLightbox}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <div className="truncate pr-4">
                <span className="text-xs text-stone-400 block">{lightbox.noteTitle}</span>
                <span className="text-sm font-semibold">
                  {lang === 'vi' ? 'Ảnh' : 'Photo'} {lightbox.currentIndex + 1} / {lightbox.images.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightbox.images[lightbox.currentIndex]}
                  download={`trip-photo-${lightbox.currentIndex + 1}.jpg`}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={lang === 'vi' ? 'Tải ảnh xuống' : 'Download photo'}
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={closeLightbox}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Image */}
            <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-white/10">
              <img
                src={lightbox.images[lightbox.currentIndex]}
                alt="Full size attachment"
                className="max-h-[75vh] max-w-full object-contain select-none"
                referrerPolicy="no-referrer"
              />

              {/* Prev / Next controls */}
              {lightbox.images.length > 1 && (
                <>
                  <button
                    onClick={prevLightboxImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextLightboxImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
