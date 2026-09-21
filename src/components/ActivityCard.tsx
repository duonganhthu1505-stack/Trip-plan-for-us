import React from 'react';
import {
  Clock,
  MapPin,
  ExternalLink,
  DollarSign,
  MoreVertical,
  Copy,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Calendar,
  Utensils,
  Coffee,
  Camera,
  Bed,
  Car,
  ShoppingBag,
  Ticket,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { Activity, ActivityCategory } from '../types';
import { formatCurrency, formatDateVN } from '../utils/dateHelpers';
import { useLanguage } from '../i18n/LanguageContext';

interface ActivityCardProps {
  activity: Activity;
  index: number;
  totalInDay: number;
  availableDays: string[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string, title: string) => void;
  onDuplicate: (activity: Activity) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToDay: (activityId: string, newDate: string) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const CATEGORY_ICONS: Record<ActivityCategory, React.ComponentType<{ className?: string }>> = {
  Food: Utensils,
  Cafe: Coffee,
  Sightseeing: Camera,
  Hotel: Bed,
  Transportation: Car,
  Shopping: ShoppingBag,
  Entertainment: Ticket,
  Other: Bookmark
};

export const CATEGORY_STYLES: Record<ActivityCategory, { bg: string; text: string; border: string }> = {
  Food: { bg: 'bg-[#F9EDE6]', text: 'text-[#8B5E3C]', border: 'border-[#E8D4C8]' },
  Cafe: { bg: 'bg-[#F5ECE5]', text: 'text-[#6F4E37]', border: 'border-[#DECBC0]' },
  Sightseeing: { bg: 'bg-[#EBF2E8]', text: 'text-[#476B38]', border: 'border-[#D0DFCB]' },
  Hotel: { bg: 'bg-[#F2ECE4]', text: 'text-[#5C4033]', border: 'border-[#DBCFC3]' },
  Transportation: { bg: 'bg-[#E9EFF5]', text: 'text-[#3A5C7F]', border: 'border-[#CADAE7]' },
  Shopping: { bg: 'bg-[#F7EBE8]', text: 'text-[#9C5A49]', border: 'border-[#E6CDC7]' },
  Entertainment: { bg: 'bg-[#F5EEF7]', text: 'text-[#7B4E87]', border: 'border-[#DECDE2]' },
  Other: { bg: 'bg-[#F0EFEB]', text: 'text-[#69655F]', border: 'border-[#D9D7D2]' }
};

export const formatMapUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  index,
  totalInDay,
  availableDays,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
  isSelected,
  isSelectionMode,
  onToggleSelect
}) => {
  const { t, lang } = useLanguage();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [moveDropdownOpen, setMoveDropdownOpen] = React.useState(false);

  const Icon = CATEGORY_ICONS[activity.category] || Bookmark;
  const style = CATEGORY_STYLES[activity.category] || CATEGORY_STYLES.Other;

  return (
    <div
      id={`activity-card-${activity.id}`}
      className={`relative overflow-visible border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all group ${
        isSelected ? 'bg-[#F9DCD6]/30 border-[#E9BFB7]' : 'bg-[#FFFDF9] border-[#E8DEC8] hover:shadow-sm'
      } ${menuOpen ? 'z-[60]' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Time & Icon & Title */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {isSelectionMode && (
            <div className="mt-2 shrink-0">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect && onToggleSelect(activity.id)}
                className="w-4 h-4 rounded border-[#D9CABB] text-[#5C4033] focus:ring-[#5C4033] cursor-pointer"
              />
            </div>
          )}
          {/* Category Icon */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} ${style.text} ${style.border}`}
            title={activity.category}
          >
            <Icon className="w-5 h-5 stroke-[1.75]" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Time & Category Pill */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-xs font-bold text-[#5C4033] bg-[#FAF7F2] px-2.5 py-0.5 rounded-md border border-[#E2D4C3]">
                <Clock className="w-3.5 h-3.5 text-[#8C6D58]" />
                <span>{activity.time || '--:--'}</span>
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
                {(t.categories as Record<string, string>)?.[activity.category] || activity.category}
              </span>
            </div>

            {/* Title */}
            <h4 className="font-serif text-base sm:text-lg font-bold text-[#382D24] leading-snug">
              {activity.title}
            </h4>

            {/* Location & Google Map Button */}
            {(activity.location || activity.mapUrl) && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {activity.location && (
                  <div className="flex items-center gap-1.5 text-xs text-[#735D4E]">
                    <MapPin className="w-3.5 h-3.5 text-[#8C6D58] shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{activity.location}</span>
                  </div>
                )}
                {activity.mapUrl && (
                  <a
                    id={`activity-map-btn-${activity.id}`}
                    href={formatMapUrl(activity.mapUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF3FE] hover:bg-[#D7E7FD] text-[#1A73E8] border border-[#C5DCFA] text-xs font-semibold shadow-2xs transition-colors cursor-pointer group/map shrink-0"
                    title={lang === 'vi' ? 'Tra vị trí trên Google Maps (mở tab mới)' : 'Open in Google Maps'}
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1A73E8] group-hover/map:scale-110 transition-transform" />
                    <span>{lang === 'vi' ? 'Tra Google Map' : 'Google Maps'}</span>
                    <ExternalLink className="w-3 h-3 text-[#1A73E8]/80" />
                  </a>
                )}
              </div>
            )}

            {/* Note */}
            {activity.note && (
              <p className="text-xs text-[#8C6D58] mt-2 italic bg-[#FAF7F2] p-2 rounded-lg border-l-2 border-[#8C6D58] leading-relaxed">
                {activity.note}
              </p>
            )}
          </div>
        </div>

        {/* Right: Costs & Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F2ECE1] shrink-0">
          {/* Cost values */}
          <div className="text-right">
            {(activity.plannedCost > 0 || activity.actualCost > 0) && (
              <div className="flex sm:flex-col gap-2 sm:gap-1 text-xs">
                <span className="inline-flex items-center gap-1 text-[10px] text-[#2E6B38] bg-[#EBF5EC] border border-[#CDE5D1] px-1.5 py-0.5 rounded font-medium self-end" title={lang === 'vi' ? 'Tự động đồng bộ với Ngân sách' : 'Auto-synced with Budget'}>
                  <Sparkles className="w-2.5 h-2.5 text-[#2E6B38]" />
                  <span>{lang === 'vi' ? 'Ngân sách' : 'Budget'}</span>
                </span>
                {activity.plannedCost > 0 && (
                  <div className="text-[#8C6D58]">
                    <span className="text-[10px] uppercase font-semibold">{lang === 'vi' ? 'Dự tính:' : 'Planned:'}</span>{' '}
                    <span className="font-medium text-[#5C4033]">{formatCurrency(activity.plannedCost)}</span>
                  </div>
                )}
                {activity.actualCost > 0 && (
                  <div className="text-[#382D24]">
                    <span className="text-[10px] uppercase font-semibold">{lang === 'vi' ? 'Thực tế:' : 'Actual:'}</span>{' '}
                    <span className="font-bold text-[#382D24]">{formatCurrency(activity.actualCost)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons bar */}
          <div className="flex items-center gap-1">
            {/* Reorder Up */}
            {onMoveUp && index > 0 && (
              <button
                onClick={onMoveUp}
                className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#8C6D58] hover:text-[#382D24] transition-colors cursor-pointer"
                title={lang === 'vi' ? 'Di chuyển lên' : 'Move up'}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Reorder Down */}
            {onMoveDown && index < totalInDay - 1 && (
              <button
                onClick={onMoveDown}
                className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#8C6D58] hover:text-[#382D24] transition-colors cursor-pointer"
                title={lang === 'vi' ? 'Di chuyển xuống' : 'Move down'}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Edit */}
            <button
              id={`activity-edit-btn-${activity.id}`}
              onClick={() => onEdit(activity)}
              className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#6E4F36] hover:text-[#382D24] transition-colors cursor-pointer"
              title={lang === 'vi' ? 'Chỉnh sửa hoạt động' : 'Edit Activity'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* More Menu (Duplicate, Move to Day, Delete) */}
            <div className="relative">
              <button
                id={`activity-menu-btn-${activity.id}`}
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#8C6D58] hover:text-[#382D24] transition-colors cursor-pointer"
                title={lang === 'vi' ? 'Thao tác khác' : 'More actions'}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-[#FFFDF9] border border-[#E2D4C3] rounded-xl shadow-lg py-1 z-[60] text-xs animate-in fade-in">
                  {/* Duplicate */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(activity);
                    }}
                    className="w-full text-left px-3 py-2 text-[#6E4F36] hover:bg-[#FAF7F2] flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'vi' ? 'Nhân bản' : 'Duplicate'}</span>
                  </button>

                  {/* Move to another Day */}
                  <div className="relative">
                    <button
                      onClick={() => setMoveDropdownOpen(!moveDropdownOpen)}
                      className="w-full text-left px-3 py-2 text-[#6E4F36] hover:bg-[#FAF7F2] flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Chuyển ngày' : 'Move to Day'}</span>
                      </div>
                    </button>

                    {moveDropdownOpen && (
                      <div className="pl-6 pr-2 py-1 bg-[#FAF7F2] space-y-1">
                        {availableDays.map((d, i) => (
                          <button
                            key={d}
                            onClick={() => {
                              setMoveDropdownOpen(false);
                              setMenuOpen(false);
                              onMoveToDay(activity.id, d);
                            }}
                            className={`w-full text-left py-1 px-2 rounded text-[11px] truncate cursor-pointer ${
                              d === activity.date ? 'font-bold text-[#5C4033]' : 'text-[#735D4E] hover:bg-[#EFE8DE]'
                            }`}
                          >
                            {lang === 'vi' ? `Ngày ${i + 1} (${formatDateVN(d)})` : `Day ${i + 1} (${d})`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="border-t border-[#F0E6D8] mt-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(activity.id, activity.title);
                      }}
                      className="w-full text-left px-3 py-2 text-[#B85340] hover:bg-[#FBEBE8] flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.actions.delete}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
