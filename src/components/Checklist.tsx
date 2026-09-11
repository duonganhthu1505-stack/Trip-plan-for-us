import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  FileCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ChecklistGroup, ChecklistItem } from '../types';
import { CHECKLIST_GROUPS } from '../utils/constants';

interface ChecklistProps {
  tripId: string;
  checklist: ChecklistItem[];
  onSaveChecklist: (items: ChecklistItem[]) => void;
  onRequestDeleteItem: (id: string, title: string) => void;
}

export const Checklist: React.FC<ChecklistProps> = ({
  tripId,
  checklist,
  onSaveChecklist,
  onRequestDeleteItem
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChecklistGroup>('Documents');
  const [notes, setNotes] = useState('');

  const total = checklist.length;
  const completed = checklist.filter((c) => c.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = (item: ChecklistItem) => {
    const updated = checklist.map((c) =>
      c.id === item.id ? { ...c, completed: !c.completed } : c
    );
    onSaveChecklist(updated);
  };

  const openAddModal = (defaultCat?: ChecklistGroup) => {
    setEditingItem(null);
    setTitle('');
    setCategory(defaultCat || (selectedGroup !== 'ALL' ? (selectedGroup as ChecklistGroup) : 'Documents'));
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setNotes(item.notes || '');
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingItem) {
      const updated = checklist.map((c) =>
        c.id === editingItem.id
          ? {
              ...c,
              title: title.trim(),
              category,
              notes: notes.trim()
            }
          : c
      );
      onSaveChecklist(updated);
    } else {
      const newItem: ChecklistItem = {
        id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId,
        title: title.trim(),
        category,
        completed: false,
        notes: notes.trim()
      };
      onSaveChecklist([...checklist, newItem]);
    }
    setModalOpen(false);
  };

  // Group items
  const activeGroups = CHECKLIST_GROUPS.filter((grp) => {
    if (selectedGroup === 'ALL') return true;
    return grp === selectedGroup;
  });

  return (
    <div id="checklist-page" className="space-y-6 pb-16">
      {/* Header & Progress Banner */}
      <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
              <FileCheck className="w-3.5 h-3.5 text-[#C27D66]" />
              <span>Pre-Trip Preparation</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
              Packing & Journey Checklist
            </h2>
            <p className="text-xs text-[#735D4E] mt-1">
              Never forget passport essentials, couple outfits, camera chargers, or bookings
            </p>
          </div>

          <button
            id="checklist-add-btn"
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors self-start sm:self-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Checklist Item</span>
          </button>
        </div>

        {/* Progress Display (Item F Requirement: "Trip preparation: 8 / 12 completed") */}
        <div className="pt-4 border-t border-[#F0E6D8] space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-medium text-[#6E4F36]">
              Trip preparation: <span className="font-bold text-[#382D24]">{completed} / {total} completed</span>
            </span>
            <span className="font-bold text-[#5C4033]">{percentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-[#FAF7F2] border border-[#E2D4C3] overflow-hidden">
            <div
              className="h-full bg-[#5C4033] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedGroup('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
            selectedGroup === 'ALL'
              ? 'bg-[#5C4033] text-white'
              : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
          }`}
        >
          All Items ({checklist.length})
        </button>
        {CHECKLIST_GROUPS.map((grp) => {
          const count = checklist.filter((c) => c.category === grp).length;
          return (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                selectedGroup === grp
                  ? 'bg-[#5C4033] text-white'
                  : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
              }`}
            >
              {grp} ({count})
            </button>
          );
        })}
      </div>

      {/* Groups and Items List */}
      <div className="space-y-6">
        {activeGroups.map((group) => {
          const groupItems = checklist.filter((c) => c.category === group);
          const groupCompleted = groupItems.filter((c) => c.completed).length;

          if (selectedGroup === 'ALL' && groupItems.length === 0) return null;

          return (
            <div
              key={group}
              className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0E6D8]">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-[#382D24]">
                    {group}
                  </h3>
                  <span className="text-xs text-[#8C6D58] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#E2D4C3]">
                    {groupCompleted} / {groupItems.length}
                  </span>
                </div>

                <button
                  onClick={() => openAddModal(group)}
                  className="text-xs text-[#6E4F36] hover:text-[#382D24] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to {group}</span>
                </button>
              </div>

              {/* Items */}
              {groupItems.length === 0 ? (
                <p className="text-xs text-[#8C6D58] italic py-2">
                  No items in {group} yet.
                </p>
              ) : (
                <div className="divide-y divide-[#F6EFE6]">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-start justify-between gap-3 group/item hover:bg-[#FAF7F2]/60 px-2 rounded-xl transition-colors"
                    >
                      <div
                        onClick={() => handleToggle(item)}
                        className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-[#5C4033] hover:text-[#382D24] shrink-0"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-5 h-5 text-[#476B38]" />
                          ) : (
                            <Square className="w-5 h-5 text-[#8C6D58]" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug transition-all ${
                              item.completed
                                ? 'line-through text-[#8C7E72]'
                                : 'text-[#382D24] font-medium'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-[#8C6D58] italic mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover/item:opacity-100">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-[#6E4F36] hover:bg-[#EFE8DE] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRequestDeleteItem(item.id, item.title)}
                          className="p-1.5 rounded-lg text-[#8C6D58] hover:text-[#B85340] hover:bg-[#FBEBE8] transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Checklist Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B1E16]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF7F2] border border-[#E8DEC8] rounded-3xl shadow-xl overflow-hidden p-6 text-[#3D312A] relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8C6D58] hover:text-[#382D24] rounded-full hover:bg-[#EFE8DE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#EAE2D5]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C6D58] font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C27D66]" />
                <span>{editingItem ? 'Edit Item' : 'New Preparation Item'}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingItem ? 'Modify Item' : 'Add to Packing List'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Item Group
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChecklistGroup)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                >
                  {CHECKLIST_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passports, Polaroid camera, Couple linen outfits..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bring 2 extra batteries, pack in carry-on..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs text-[#382D24] focus:outline-none"
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
                  <span>{editingItem ? 'Save Item' : 'Add Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
