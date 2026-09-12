import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Edit3,
  Trash2,
  X,
  Save,
  Tag,
  CheckCircle2,
  Sparkles,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { Activity, BudgetCategory, BudgetItem } from '../types';
import { BUDGET_CATEGORIES, getUnitForCategory, getUnitSuggestions } from '../utils/constants';
import { formatCurrency, formatGap } from '../utils/dateHelpers';
import { useLanguage } from '../i18n/LanguageContext';

interface BudgetProps {
  tripId: string;
  items: BudgetItem[];
  itinerary?: Activity[];
  onSaveItems: (items: BudgetItem[]) => void;
  onRequestDeleteItem: (id: string, title: string) => void;
  onRequestDeleteMultipleItems?: (ids: string[]) => void;
  onSyncFromItinerary?: () => void;
}

export const Budget: React.FC<BudgetProps> = ({
  tripId,
  items,
  itinerary = [],
  onSaveItems,
  onRequestDeleteItem,
  onRequestDeleteMultipleItems,
  onSyncFromItinerary
}) => {
  const { t, lang } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState<BudgetCategory>('Food');
  const [formItem, setFormItem] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnit, setFormUnit] = useState('meal');
  const [formPlanned, setFormPlanned] = useState(0);
  const [formActual, setFormActual] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  // Handle category change with auto-suggested unit
  const handleCategoryChange = (newCat: BudgetCategory) => {
    setFormCategory(newCat);
    setFormUnit(getUnitForCategory(newCat));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormCategory('Food');
    setFormItem('');
    setFormQuantity(1);
    setFormUnit(getUnitForCategory('Food'));
    setFormPlanned(0);
    setFormActual(0);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEditModal = (item: BudgetItem) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormItem(item.item);
    setFormQuantity(item.quantity || 1);
    setFormUnit(item.unit || 'item');
    setFormPlanned(item.plannedCost || 0);
    setFormActual(item.actualCost || 0);
    setFormNotes(item.notes || '');
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.trim()) return;

    if (editingItem) {
      const updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              category: formCategory,
              item: formItem.trim(),
              quantity: Number(formQuantity) || 1,
              unit: formUnit.trim() || 'item',
              plannedCost: Number(formPlanned) || 0,
              actualCost: Number(formActual) || 0,
              notes: formNotes.trim()
            }
          : i
      );
      onSaveItems(updated);
    } else {
      const newItem: BudgetItem = {
        id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tripId,
        category: formCategory,
        item: formItem.trim(),
        quantity: Number(formQuantity) || 1,
        unit: formUnit.trim() || 'item',
        plannedCost: Number(formPlanned) || 0,
        actualCost: Number(formActual) || 0,
        notes: formNotes.trim()
      };
      onSaveItems([...items, newItem]);
    }
    setModalOpen(false);
  };

  // Calculations
  const totalPlanned = items.reduce((acc, i) => acc + (i.plannedCost || 0) * (i.quantity || 1), 0);
  const totalActual = items.reduce((acc, i) => acc + (i.actualCost || 0) * (i.quantity || 1), 0);
  const totalGap = totalActual - totalPlanned;
  const budgetRemaining = totalPlanned - totalActual;
  const isBudgetExceeded = totalActual > totalPlanned && totalPlanned > 0;

  // Count items auto-synced from Itinerary
  const itineraryItemsCount = items.filter((i) => Boolean(i.activityId)).length;

  // Filtered items
  const filteredItems =
    categoryFilter === 'ALL'
      ? items
      : categoryFilter === 'ITINERARY'
      ? items.filter((i) => Boolean(i.activityId))
      : items.filter((i) => i.category === categoryFilter);

  // Group by category summary
  const categoryTotals = BUDGET_CATEGORIES.map((cat) => {
    const catItems = items.filter((i) => i.category === cat.value);
    const p = catItems.reduce((acc, i) => acc + (i.plannedCost || 0) * (i.quantity || 1), 0);
    const a = catItems.reduce((acc, i) => acc + (i.actualCost || 0) * (i.quantity || 1), 0);
    return { category: cat.value, planned: p, actual: a, count: catItems.length };
  }).filter((c) => c.count > 0);

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleToggleItemSelection = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (filteredItems.length === 0) return;
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length > 0 && onRequestDeleteMultipleItems) {
      onRequestDeleteMultipleItems(selectedIds);
      setIsSelectionMode(false);
      setSelectedIds([]);
    }
  };

  return (
    <div id="budget-page" className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#C27D66]" />
            <span>Budget & Financial Balance</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#382D24]">
            Trip Finances & Cost Tracker
          </h2>
          <p className="text-xs text-[#735D4E] mt-1">
            Compare Planned vs. Actual costs with real-time variance and GAP alerts
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            id="budget-add-item-btn"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Auto-Sync with Itinerary Banner */}
      <div className="bg-[#FAF7F2] border border-[#E8DEC8] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5C4033] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#FAF7F2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-[#382D24]">
                Tự động đồng bộ chi phí từ Lịch trình
              </h4>
              <span className="text-[11px] bg-[#EBF5EC] text-[#2E6B38] border border-[#CDE5D1] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{itineraryItemsCount} khoản đã liên kết</span>
              </span>
            </div>
            <p className="text-xs text-[#735D4E] mt-1 leading-relaxed">
              Mọi chi phí bạn nhập tại các điểm dừng ở tab <strong>Lịch trình</strong> sẽ tự động cập nhật vào đây mà không cần phải nhập tay lại.
            </p>
          </div>
        </div>

        {onSyncFromItinerary && (
          <button
            type="button"
            onClick={onSyncFromItinerary}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#5C4033] border border-[#D9CABB] text-xs font-semibold shrink-0 transition-colors cursor-pointer shadow-2xs"
            title="Đồng bộ lại toàn bộ chi phí từ Lịch trình"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.actions.syncFromItinerary}</span>
          </button>
        )}
      </div>

      {/* Warning Banner when Actual > Planned */}
      {isBudgetExceeded && (
        <div id="budget-exceeded-warning" className="p-4 rounded-2xl bg-[#FBEBE8] border border-[#E9BFB7] text-[#B85340] flex items-start gap-3 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-[#9E3E2D]">
              {lang === 'vi'
                ? 'Chú ý: Chi tiêu thực tế đã vượt ngân sách dự tính!'
                : 'Notice: Actual spending has exceeded the planned budget!'}
            </p>
            <p className="mt-0.5 text-[#B85340]">
              {lang === 'vi' ? (
                <>
                  Tổng chi phí thực tế cao hơn dự tính{' '}
                  <span className="font-bold">{formatCurrency(totalGap)}</span>. Hãy cân nhắc điều chỉnh các hoạt động tiếp theo.
                </>
              ) : (
                <>
                  Total actual expenses are higher than planned by{' '}
                  <span className="font-bold">{formatCurrency(totalGap)}</span>. Consider adjusting upcoming activities or wishlist items.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Two Clear Financial Areas: Planned vs Actual + Remaining & Variance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planned Cost Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C6D58] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>{lang === 'vi' ? 'Tổng dự tính' : 'Total Planned'}</span>
            <TrendingDown className="w-4 h-4 text-[#8C6D58]" />
          </div>
          <p className="font-serif text-xl sm:text-2xl font-bold text-[#382D24]">
            {formatCurrency(totalPlanned)}
          </p>
          <p className="text-[11px] text-[#8C6D58] mt-1">
            {lang === 'vi' ? 'Ngân sách phân bổ mục tiêu' : 'Target budget allocation'}
          </p>
        </div>

        {/* Actual Cost Card */}
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C6D58] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>{lang === 'vi' ? 'Tổng thực tế' : 'Total Actual'}</span>
            <TrendingUp className="w-4 h-4 text-[#8C6D58]" />
          </div>
          <p className={`font-serif text-xl sm:text-2xl font-bold ${isBudgetExceeded ? 'text-[#B85340]' : 'text-[#382D24]'}`}>
            {formatCurrency(totalActual)}
          </p>
          <p className="text-[11px] text-[#8C6D58] mt-1">
            {lang === 'vi' ? 'Tổng chi phí đã ghi nhận' : 'Total recorded spending'}
          </p>
        </div>

        {/* Budget Remaining */}
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C6D58] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>{lang === 'vi' ? 'Ngân sách còn lại' : 'Budget Remaining'}</span>
            <DollarSign className="w-4 h-4 text-[#8C6D58]" />
          </div>
          <p className={`font-serif text-xl sm:text-2xl font-bold ${budgetRemaining < 0 ? 'text-[#B85340]' : 'text-[#382D24]'}`}>
            {formatCurrency(budgetRemaining)}
          </p>
          <p className="text-[11px] text-[#8C6D58] mt-1">
            {budgetRemaining >= 0
              ? lang === 'vi'
                ? 'Dư dả ngân sách'
                : 'Surplus available'
              : lang === 'vi'
              ? 'Đã vượt ngân sách'
              : 'Deficit exceeded'}
          </p>
        </div>

        {/* Total Variance / GAP */}
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C6D58] text-xs font-semibold uppercase tracking-wider mb-2">
            <span>{lang === 'vi' ? 'Chênh lệch (Thực tế - Dự tính)' : 'Total GAP (Act - Plan)'}</span>
            <PieChart className="w-4 h-4 text-[#8C6D58]" />
          </div>
          {(() => {
            const gapObj = formatGap(totalGap);
            return (
              <>
                <p className={`font-serif text-xl sm:text-2xl font-bold ${gapObj.isOver ? 'text-[#B85340]' : gapObj.isUnder ? 'text-[#2E6B38]' : 'text-[#382D24]'}`}>
                  {gapObj.text}
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  {gapObj.isOver
                    ? lang === 'vi'
                      ? 'Chi tiêu vượt dự tính'
                      : 'Spent more than planned'
                    : gapObj.isUnder
                    ? lang === 'vi'
                      ? 'Tiết kiệm so với dự tính'
                      : 'Saved under budget'
                    : lang === 'vi'
                    ? 'Khớp đúng ngân sách'
                    : 'Exact match'}
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-[#5C4033] text-white'
              : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
          }`}
        >
          All Categories ({items.length})
        </button>
        {itineraryItemsCount > 0 && (
          <button
            onClick={() => setCategoryFilter('ITINERARY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'ITINERARY'
                ? 'bg-[#2E6B38] text-white'
                : 'bg-[#FFFDF9] text-[#2E6B38] hover:bg-[#EBF5EC] border border-[#CDE5D1]'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Từ Lịch trình ({itineraryItemsCount})</span>
          </button>
        )}
        {categoryTotals.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setCategoryFilter(cat.category)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              categoryFilter === cat.category
                ? 'bg-[#5C4033] text-white'
                : 'bg-[#FFFDF9] text-[#6E4F36] hover:bg-[#FAF7F2] border border-[#E8DEC8]'
            }`}
          >
            {cat.category} ({cat.count})
          </button>
        ))}
      </div>

      {/* Selection Toolbar */}
      <div className="flex items-center justify-between bg-[#FFFDF9] border border-[#E8DEC8] p-2.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSelectionMode}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer border ${
              isSelectionMode
                ? 'bg-[#EFE8DE] border-[#D9CABB] text-[#5C4033] hover:bg-[#E2D4C3]'
                : 'bg-[#FFFDF9] border-[#D9CABB] text-[#5C4033] hover:bg-[#EFE8DE]'
            }`}
          >
            {isSelectionMode ? t.actions.cancelSelection : t.actions.selectItems}
          </button>
          
          {isSelectionMode && (
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-[#D9CABB] text-[#5C4033] hover:bg-[#EFE8DE]"
            >
              {t.actions.selectAll}
            </button>
          )}
        </div>
        
        {isSelectionMode && selectedIds.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B85340] hover:bg-[#9E3E2D] text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t.actions.deleteSelected} ({selectedIds.length})</span>
            <span className="sm:hidden">({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* Main Budget Items Display */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl p-10 text-center space-y-4">
          <DollarSign className="w-12 h-12 text-[#8C6D58] mx-auto stroke-[1.5]" />
          <h4 className="font-serif text-xl font-bold text-[#382D24]">
            {t.budget.noExpenses}
          </h4>
          <p className="text-xs sm:text-sm text-[#735D4E] max-w-sm mx-auto">
            {lang === 'vi'
              ? 'Thêm các khoản chi như phòng khách sạn, ẩm thực, vé tham quan, quà lưu niệm...'
              : 'Add hotel reservations, romantic dining, transportation, tickets, and souvenir shopping.'}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#483226] text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.addExpense}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b border-[#E8DEC8] text-[#8C6D58] uppercase font-semibold tracking-wider text-[11px]">
                    {isSelectionMode && (
                      <th className="py-3.5 px-4 w-12 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th className="py-3.5 px-4">{lang === 'vi' ? 'Phân loại' : 'Category'}</th>
                    <th className="py-3.5 px-4">{lang === 'vi' ? 'Khoản chi' : 'Item'}</th>
                    <th className="py-3.5 px-3 text-center">{lang === 'vi' ? 'SL' : 'Qty'}</th>
                    <th className="py-3.5 px-3">{lang === 'vi' ? 'Đơn vị' : 'Unit'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'vi' ? 'Dự tính (VND)' : 'Planned (VND)'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'vi' ? 'Thực tế (VND)' : 'Actual (VND)'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'vi' ? 'Chênh lệch' : 'GAP (Act - Plan)'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'vi' ? 'Thao tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1] text-[#382D24]">
                  {filteredItems.map((item) => {
                    const itemPlannedTotal = (item.plannedCost || 0) * (item.quantity || 1);
                    const itemActualTotal = (item.actualCost || 0) * (item.quantity || 1);
                    const gap = itemActualTotal - itemPlannedTotal;
                    const gapObj = formatGap(gap);
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${isSelected ? 'bg-[#F9DCD6]/30' : 'hover:bg-[#FAF7F2]/60'}`}
                      >
                        {isSelectionMode && (
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItemSelection(item.id)}
                              className="w-4 h-4 rounded border-[#D9CABB] text-[#5C4033] focus:ring-[#5C4033] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-[#FAF7F2] text-[#6E4F36] border border-[#E2D4C3] font-medium text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-[#382D24]">{item.item}</p>
                            {item.activityId && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-[#2E6B38] bg-[#EBF5EC] border border-[#CDE5D1] px-2 py-0.5 rounded-full font-medium"
                                title="Khoản chi được tự động đồng bộ từ Lịch trình"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-[#2E6B38]" />
                                <span>Lịch trình</span>
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-[#8C6D58] italic mt-0.5">{item.notes}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-3 text-[#8C6D58]">
                          {item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#5C4033]">
                          {formatCurrency(itemPlannedTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#382D24]">
                          {formatCurrency(itemActualTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                              gapObj.isOver
                                ? 'bg-[#FBEBE8] text-[#B85340]'
                                : gapObj.isUnder
                                ? 'bg-[#EBF5EC] text-[#2E6B38]'
                                : 'bg-[#FAF7F2] text-[#8C6D58]'
                            }`}
                          >
                            {gapObj.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`budget-edit-${item.id}`}
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE8DE] text-[#6E4F36] transition-colors cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`budget-delete-${item.id}`}
                              onClick={() => onRequestDeleteItem(item.id, item.item)}
                              className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#FBEBE8] text-[#8C6D58] hover:text-[#B85340] transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Prevents Table Overflow on small screens - Item 8 Requirement) */}
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => {
              const itemPlannedTotal = (item.plannedCost || 0) * (item.quantity || 1);
              const itemActualTotal = (item.actualCost || 0) * (item.quantity || 1);
              const gap = itemActualTotal - itemPlannedTotal;
              const gapObj = formatGap(gap);
              const isSelected = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  id={`budget-mobile-card-${item.id}`}
                  className={`border rounded-2xl p-4 shadow-2xs space-y-3 transition-colors ${
                    isSelected ? 'bg-[#F9DCD6]/30 border-[#E9BFB7]' : 'bg-[#FFFDF9] border-[#E8DEC8]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      {isSelectionMode && (
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleItemSelection(item.id)}
                            className="w-4 h-4 rounded border-[#D9CABB] text-[#5C4033] focus:ring-[#5C4033] cursor-pointer"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] text-[#6E4F36] border border-[#E2D4C3] text-[10px] font-semibold">
                          {item.category}
                        </span>
                        {item.activityId && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#2E6B38] bg-[#EBF5EC] border border-[#CDE5D1] px-1.5 py-0.5 rounded-full font-medium">
                            <Sparkles className="w-2.5 h-2.5 text-[#2E6B38]" />
                            <span>Lịch trình</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif text-base font-bold text-[#382D24] mt-1">
                        {item.item}
                      </h4>
                      <p className="text-xs text-[#8C6D58]">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    </div> {/* Closes flex items-start gap-3 */}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-[#FAF7F2] text-[#6E4F36]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRequestDeleteItem(item.id, item.item)}
                        className="p-1.5 rounded-lg bg-[#FAF7F2] text-[#8C6D58] hover:text-[#B85340]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-[#8C6D58] italic bg-[#FAF7F2] p-2 rounded-lg">
                      {item.notes}
                    </p>
                  )}

                  {/* Planned vs Actual grid in card */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F2ECE1] text-xs">
                    <div>
                      <p className="text-[10px] text-[#8C6D58] uppercase">{lang === 'vi' ? 'Dự tính' : 'Planned'}</p>
                      <p className="font-medium text-[#5C4033]">{formatCurrency(itemPlannedTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8C6D58] uppercase">{lang === 'vi' ? 'Thực tế' : 'Actual'}</p>
                      <p className="font-bold text-[#382D24]">{formatCurrency(itemActualTotal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8C6D58] uppercase">{lang === 'vi' ? 'Chênh lệch' : 'GAP'}</p>
                      <p className={`font-semibold ${gapObj.isOver ? 'text-[#B85340]' : gapObj.isUnder ? 'text-[#2E6B38]' : 'text-[#382D24]'}`}>
                        {gapObj.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Expense Modal */}
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
                  {editingItem
                    ? lang === 'vi'
                      ? 'Chỉnh sửa khoản chi'
                      : 'Edit Expense Record'
                    : lang === 'vi'
                    ? 'Ghi nhận chi phí mới'
                    : 'Record Expense'}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#382D24]">
                {editingItem
                  ? editingItem.item
                  : lang === 'vi'
                  ? 'Thêm mục chi tiêu du lịch'
                  : 'Log Travel Budget Item'}
              </h3>
              {editingItem?.activityId && (
                <div className="mt-3 p-3 bg-[#EBF5EC] border border-[#CDE5D1] rounded-xl flex items-start gap-2 text-xs text-[#2E6B38]">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    {lang === 'vi'
                      ? 'Khoản chi này được liên kết trực tiếp với hoạt động trong Lịch trình. Khi bạn chỉnh sửa chi phí ở đây, hoạt động trong Lịch trình cũng sẽ được tự động cập nhật đồng bộ!'
                      : 'This expense is linked directly to an activity in Itinerary. Updating costs here will keep your Itinerary in sync!'}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Phân loại *' : 'Category *'}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as BudgetCategory)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                >
                  {BUDGET_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label} ({lang === 'vi' ? 'đơn vị gợi ý' : 'auto unit'}: {cat.defaultUnit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Tên khoản chi *' : 'Expense Item *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    lang === 'vi'
                      ? 'VD: Khách sạn boutique, Cơm tấm trưa, Cà phê trứng...'
                      : 'e.g. Hotel ABC, Lunch broken rice, Drip cafe...'
                  }
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-sm text-[#382D24] focus:outline-none"
                />
              </div>

              {/* Quantity & Unit (Auto Suggested - Item 3 Requirement) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Số lượng' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                    {lang === 'vi' ? 'Đơn vị (Gợi ý tự động)' : 'Unit (Auto-suggested)'}
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder={lang === 'vi' ? 'VD: đêm, bữa, người, vé...' : 'e.g. night, meal, person...'}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getUnitSuggestions(formCategory).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormUnit(sug)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          formUnit === sug ? 'bg-[#5C4033] text-white border-transparent' : 'bg-[#FAF7F2] text-[#8C6D58] border-[#E2D4C3]'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SEPARATE PLANNED COST AND ACTUAL COST (Section D Requirement) */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#5C4033]">
                  {lang === 'vi' ? 'Chi tiết chi phí (Mỗi đơn vị)' : 'Cost Breakdown (Per Unit)'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'CHI PHÍ DỰ TÍNH (VND)' : 'PLANNED COST (VND)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formPlanned}
                      onChange={(e) => setFormPlanned(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none font-medium"
                    />
                    <p className="text-[10px] text-[#8C6D58] mt-0.5">
                      {lang === 'vi' ? 'Thành tiền:' : 'Subtotal:'} {formatCurrency(formPlanned * formQuantity)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6E4F36] mb-1">
                      {lang === 'vi' ? 'CHI PHÍ THỰC TẾ (VND)' : 'ACTUAL COST (VND)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formActual}
                      onChange={(e) => setFormActual(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none font-medium"
                    />
                    <p className="text-[10px] text-[#8C6D58] mt-0.5">
                      {lang === 'vi' ? 'Thành tiền:' : 'Subtotal:'} {formatCurrency(formActual * formQuantity)}
                    </p>
                  </div>
                </div>

                {/* Real-time GAP preview */}
                <div className="pt-2 border-t border-[#EAE2D5] flex items-center justify-between text-xs">
                  <span className="text-[#8C6D58]">{lang === 'vi' ? 'Chênh lệch khoản này:' : 'Item GAP (Act - Plan):'}</span>
                  {(() => {
                    const diff = (formActual - formPlanned) * formQuantity;
                    const diffObj = formatGap(diff);
                    return (
                      <span className={`font-bold ${diffObj.isOver ? 'text-[#B85340]' : diffObj.isUnder ? 'text-[#2E6B38]' : 'text-[#382D24]'}`}>
                        {diffObj.text}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6E4F36] mb-1">
                  {lang === 'vi' ? 'Ghi chú' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={
                    lang === 'vi'
                      ? 'VD: Đã áp dụng mã giảm giá, bao gồm ăn sáng...'
                      : 'e.g. Voucher applied, includes breakfast...'
                  }
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDF9] border border-[#D9CABB] text-xs sm:text-sm text-[#382D24] focus:outline-none"
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
                    {editingItem
                      ? lang === 'vi'
                        ? 'Lưu thay đổi'
                        : 'Save Item'
                      : lang === 'vi'
                      ? 'Thêm khoản chi'
                      : 'Add Item'}
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
