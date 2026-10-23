import { useState } from 'react';
import { Checklist } from './Checklist';
import { ChecklistItem } from '../types';

// Dữ liệu mẫu cố tình chưa theo thứ tự để kiểm tra tính năng tự sắp xếp.
const INITIAL_ITEMS: ChecklistItem[] = [
  {
    id: 'review-16-am',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Sáng: Áo sơ mi (tay phồng), gile xám, chân váy đen dài, mary jane, khăn choàng, mũ nồi',
    completed: false,
    wearer: 'baby',
    wearDate: '2026-11-16'
  },
  {
    id: 'review-15-am',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Sáng: Chân váy dài trắng, baby doll caro xanh, mary jane',
    completed: false,
    wearer: 'baby',
    wearDate: '2026-11-15'
  },
  {
    id: 'review-17-pm',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Tối: Áo len be, chân váy dài nâu, giày mary jane',
    completed: false,
    wearer: 'baby',
    wearDate: '2026-11-17'
  },
  {
    id: 'review-15-pm',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Tối: Áo len hồng, chân váy dài trắng, áo cổ lọ, mary jane',
    completed: false,
    wearer: 'baby',
    wearDate: '2026-11-15'
  },
  {
    id: 'review-18-am',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Sáng: Áo thun trắng, quần jean ống suông, cardigan be',
    completed: false,
    wearer: 'husband',
    wearDate: '2026-11-18'
  },
  {
    id: 'review-15-night',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Đồ ngủ: Áo hồng, short',
    completed: false,
    wearer: 'baby',
    wearDate: '2026-11-15'
  },
  {
    id: 'review-16-pm',
    tripId: 'review-trip',
    category: 'Clothes',
    title: 'Tối: Áo sơ mi trắng, quần tây xám, giày loafer',
    completed: false,
    wearer: 'husband',
    wearDate: '2026-11-16'
  }
];

/** Trang dùng riêng cho preview, không đọc hoặc ghi dữ liệu chuyến đi thật. */
export const ChecklistReview = () => {
  const [items, setItems] = useState(INITIAL_ITEMS);

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
      <section className="mb-5 rounded-3xl border border-[#D9CABB] bg-[#5C4033] px-5 py-4 text-white shadow-sm">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#F1DAAB]">
          <span className="rounded-full bg-white/10 px-2.5 py-1">Chế độ review</span>
          <span>Không cần đăng nhập</span>
        </div>
        <h1 className="font-serif text-xl font-bold sm:text-2xl">Màu ngày &amp; thứ tự trang phục</h1>
        <p className="mt-1 text-xs text-[#F4E9DC] sm:text-sm">
          Dữ liệu mẫu · Cùng ngày cùng màu · Tự động sắp xếp theo ngày tăng dần
        </p>
      </section>

      <Checklist
        tripId="review-trip"
        checklist={items}
        tripStartDate="2026-11-15"
        tripEndDate="2026-11-20"
        onSaveChecklist={setItems}
        onRequestDeleteItem={(id) => setItems((current) => current.filter((item) => item.id !== id))}
      />
    </main>
  );
};
