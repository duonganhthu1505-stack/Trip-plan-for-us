import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { TripOverview } from '../src/components/TripOverview';

const makeBundle: any = (id: string, name: string, dest: string, status: string, start: string, end: string) => ({
  tripInfo: {
    id, name, destination: dest, startDate: start, endDate: end,
    travelers: 2, travelerNames: 'Anh & Em', transport: 'Máy bay', hotel: 'Homestay',
    coverImage: '', notes: 'mong chờ!', status,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  },
  itinerary: [{ id: 'a1' }],
  budget: [{ id: 'b1', category: 'Food', plannedCost: 1000000, actualCost: 300000, quantity: 1 }],
  places: [{ id: 'p1', status: 'Wishlist' }],
  checklist: [{ id: 'c1', completed: true }, { id: 'c2', completed: false }],
  notes: []
});

const b1 = makeBundle('t1', 'Dalat Escape', 'Da Lat', 'Upcoming', '2026-11-20', '2026-11-23');
const b2 = makeBundle('t2', 'Saigon Couple Trip', 'TP. Ho Chi Minh', 'Completed', '2026-02-12', '2026-02-14');

const html = renderToString(
  <LanguageProvider>
    <TripOverview
      currentTripBundle={b1}
      allTrips={{ t1: b1, t2: b2 }}
      onSelectTrip={() => {}}
      onEditTrip={() => {}}
      onDuplicateTrip={() => {}}
      onRequestDeleteTrip={() => {}}
      onNewTrip={() => {}}
      onNavigateTab={() => {}}
    />
  </LanguageProvider>
);

const checks = {
  'ticket card t1': html.includes('trip-card-t1'),
  'ticket card t2': html.includes('trip-card-t2'),
  'featured boarding pass': html.includes('CHUYẾN ĐI TIẾP THEO'),
  'dest code DAL': html.includes('DAL'),
  'perforation dashed': html.includes('border-dashed'),
  'stamp Sắp tới (uppercase via CSS)': html.includes('Sắp tới'),
  'progress bar': html.includes('bg-[#C4685A]'),
  'kebab menu btn': html.includes('trip-card-menu-t1'),
  'journal header': html.includes('trips-journal-header')
};
let fail = 0;
for (const [k, v] of Object.entries(checks)) {
  console.log(v ? 'PASS' : 'FAIL', '-', k);
  if (!v) fail++;
}
console.log('html length:', html.length);
process.exit(fail ? 1 : 0);
