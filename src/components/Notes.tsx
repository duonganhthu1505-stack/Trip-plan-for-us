import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { JournalNote } from '../types';
import { formatDateVN } from '../utils/dateHelpers';

interface NotesProps {
  tripId: string;
  notes: JournalNote[];
  onSaveNotes: (notes: JournalNote[]) => void;
  onRequestDeleteNote: (id: string, title: string) => void;
}

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
  notes,
  onSaveNotes,
  onRequestDeleteNote
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<JournalNote | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Important notes');
  const [content, setContent] = useState('');

  const openAddModal = () => {
    setEditingNote(null);
    setTitle('');
    setCategory('Important notes');
    setContent('');
    setModalOpen(true);
  };

  const openEditModal = (note: JournalNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setCategory(note.category);
    setContent(note.content);
    setModalOpen(true);
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
        updatedAt: new Date().toISOString()
      };
      onSaveNotes([...notes, newNote]);
    }
    setModalOpen(false);
  };

  const filteredNotes = activeCategory === 'ALL'
    ? notes
    : notes.filter((n) => n.category === activeCategory);

  return (
    <div id="notes-page" className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#C27D66]" />
            <span>Travel Journal & Field Notes</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            Notes, Codes & Memories
          </h2>
          <p className="text-xs text-[#735D4E] mt-1">
            Keep booking confirmation codes, flight references, hotel keys, and couple journal entries
          </p>
        </div>

        <button
          id="notes-add-btn"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Journal Note</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
            activeCategory === 'ALL'
              ? 'bg-[#5C4033] text-white'
              : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
          }`}
        >
          All Notes ({notes.length})
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
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Notes Grid (Paper / Vintage journal styling) */}
      {filteredNotes.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
          <FileText className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
          <h4 className="font-serif text-xl font-bold text-[#382D24]">No notes recorded yet</h4>
          <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
            Write down flight tickets, check-in instructions, WiFi passwords, or sweet romantic thoughts from the road.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Write First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              id={`note-card-${note.id}`}
              className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Subtle vintage paper fold accent */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#EFE8DE] to-[#FAF7F2] border-b border-l border-[#E2D4C3] rounded-bl-xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between gap-2 mb-2 pr-6">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#FAF7F2] text-[#6E4F36] border border-[#E2D4C3]">
                    {note.category}
                  </span>
                  {note.updatedAt && (
                    <span className="text-[10px] text-[#8C6D58] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateVN(note.updatedAt.slice(0, 10))}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-lg font-bold text-[#382D24] mb-2 leading-snug">
                  {note.title}
                </h3>

                <div className="text-xs sm:text-sm text-[#5C4033] leading-relaxed whitespace-pre-wrap font-normal">
                  {note.content}
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-3 mt-4 border-t border-[#F2ECE1] flex items-center justify-end gap-1">
                <button
                  onClick={() => openEditModal(note)}
                  className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#6E4F36] border border-[#E2D4C3] transition-colors cursor-pointer"
                  title="Edit Note"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRequestDeleteNote(note.id, note.title)}
                  className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#FBEBE8] text-[#8C6D58] hover:text-[#B85340] border border-[#E2D4C3] hover:border-[#E9BFB7] transition-colors cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
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
                <span>{editingNote ? 'Edit Journal Entry' : 'New Journal Entry'}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingNote ? editingNote.title : 'Record Travel Note'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                >
                  {NOTE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Note Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight Booking Code, Hotel Check-in info..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Content *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write your notes, booking references, check-in instructions, or romantic memories..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none font-normal leading-relaxed"
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
                  <span>{editingNote ? 'Save Note' : 'Add Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
