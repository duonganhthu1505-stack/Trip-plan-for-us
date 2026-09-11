import { ActivityCategory, BudgetCategory, ChecklistGroup, TripBundle } from '../types';

export const ADMIN_EMAIL = 'duonganhthu1505@gmail.com';

export const ALLOWED_EMAILS = [
  'duonganhthu1505@gmail.com'
];

export const ACTIVITY_CATEGORIES: { label: string; value: ActivityCategory; icon: string; color: string }[] = [
  { label: 'Food', value: 'Food', icon: 'Utensils', color: '#8B5E3C' },
  { label: 'Cafe', value: 'Cafe', icon: 'Coffee', color: '#6F4E37' },
  { label: 'Sightseeing', value: 'Sightseeing', icon: 'Camera', color: '#A06D4D' },
  { label: 'Hotel', value: 'Hotel', icon: 'Bed', color: '#5C4033' },
  { label: 'Transportation', value: 'Transportation', icon: 'Car', color: '#7E685A' },
  { label: 'Shopping', value: 'Shopping', icon: 'ShoppingBag', color: '#9C6644' },
  { label: 'Entertainment', value: 'Entertainment', icon: 'Ticket', color: '#B07D62' },
  { label: 'Other', value: 'Other', icon: 'Bookmark', color: '#8A7968' }
];

export const BUDGET_CATEGORIES: { label: string; value: BudgetCategory; defaultUnit: string; unitSuggestions: string[] }[] = [
  { label: 'Hotel', value: 'Hotel', defaultUnit: 'nights', unitSuggestions: ['nights', 'rooms', 'nights/room'] },
  { label: 'Food', value: 'Food', defaultUnit: 'meals', unitSuggestions: ['meals', 'person', 'portions'] },
  { label: 'Cafe', value: 'Cafe', defaultUnit: 'person', unitSuggestions: ['person', 'cups', 'orders'] },
  { label: 'Transportation', value: 'Transportation', defaultUnit: 'trip', unitSuggestions: ['trip', 'ticket', 'rides'] },
  { label: 'Tickets', value: 'Tickets', defaultUnit: 'ticket', unitSuggestions: ['ticket', 'passes', 'person'] },
  { label: 'Shopping', value: 'Shopping', defaultUnit: 'item', unitSuggestions: ['item', 'packs', 'gifts'] },
  { label: 'Entertainment', value: 'Entertainment', defaultUnit: 'ticket', unitSuggestions: ['ticket', 'person', 'events'] },
  { label: 'Other', value: 'Other', defaultUnit: 'item', unitSuggestions: ['item', 'package', 'service'] }
];

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  'Documents',
  'Clothes',
  'Personal items',
  'Electronics',
  'Medicine',
  'Booking',
  'Other'
];

export const COVER_IMAGE_PRESETS = [
  {
    name: 'Saigon Vintage Street',
    url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
    location: 'Ho Chi Minh City'
  },
  {
    name: 'Da Lat Pine Fog',
    url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    location: 'Da Lat'
  },
  {
    name: 'Hoi An Ancient Lanterns',
    url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    location: 'Hoi An'
  },
  {
    name: 'Phu Quoc Sunset Coast',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    location: 'Phu Quoc'
  },
  {
    name: 'Kyoto Autumn Walk',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    location: 'Kyoto'
  },
  {
    name: 'Paris Seine Sunset',
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    location: 'Paris'
  }
];

export function getUnitForCategory(cat: BudgetCategory): string {
  const found = BUDGET_CATEGORIES.find((b) => b.value === cat);
  return found ? found.defaultUnit : 'item';
}

export function getUnitSuggestions(cat: BudgetCategory): string[] {
  const found = BUDGET_CATEGORIES.find((b) => b.value === cat);
  return found ? found.unitSuggestions : ['item', 'person'];
}

export const SAMPLE_TRIP_ID = 'trip-saigon-couple-2026';

export const SAMPLE_TRIP_BUNDLE: TripBundle = {
  tripInfo: {
    id: SAMPLE_TRIP_ID,
    name: 'Saigon Couple Trip',
    destination: 'Ho Chi Minh City',
    startDate: '2026-09-02',
    endDate: '2026-09-02',
    travelers: 2,
    travelerNames: 'Thu & Minh',
    transport: 'Motorbike & Grab',
    hotel: 'The Myst Dong Khoi (Boutique Heritage)',
    coverImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
    notes: 'A romantic 1-day exploration around vintage Saigon streets, sipping iced drip coffee and enjoying river breeze.',
    plannedBudget: 3500000,
    status: 'Upcoming',
    createdAt: '2026-08-15T08:00:00.000Z',
    updatedAt: '2026-09-01T10:30:00.000Z'
  },
  itinerary: [
    {
      id: 'act-1',
      tripId: SAMPLE_TRIP_ID,
      date: '2026-09-02',
      time: '07:30',
      title: 'Depart from Bien Hoa',
      location: 'Bien Hoa City -> Saigon Highway',
      category: 'Transportation',
      plannedCost: 150000,
      actualCost: 120000,
      note: 'Morning ride when weather is cool, scenic bridge view.',
      mapUrl: 'https://maps.google.com/?q=Bien+Hoa',
      order: 1
    },
    {
      id: 'act-2',
      tripId: SAMPLE_TRIP_ID,
      date: '2026-09-02',
      time: '09:00',
      title: 'Ben Thanh Market',
      location: 'Le Loi, Ben Thanh, District 1',
      category: 'Sightseeing',
      plannedCost: 200000,
      actualCost: 180000,
      note: 'Stroll through historical stalls, taste avocado smoothie and fresh snacks.',
      mapUrl: 'https://maps.google.com/?q=Ben+Thanh+Market',
      order: 2
    },
    {
      id: 'act-3',
      tripId: SAMPLE_TRIP_ID,
      date: '2026-09-02',
      time: '10:30',
      title: 'Saigon Central Post Office',
      location: '02 Cong Xa Paris, Ben Nghe, District 1',
      category: 'Sightseeing',
      plannedCost: 100000,
      actualCost: 80000,
      note: 'Send a romantic handwritten postcard to each other from the century-old post office.',
      mapUrl: 'https://maps.google.com/?q=Saigon+Central+Post+Office',
      order: 3
    },
    {
      id: 'act-4',
      tripId: SAMPLE_TRIP_ID,
      date: '2026-09-02',
      time: '12:00',
      title: 'Lunch - Com Tam Cali & Broken Rice Special',
      location: 'Nguyen Hue Walking Street',
      category: 'Food',
      plannedCost: 400000,
      actualCost: 350000,
      note: 'Signature ribs with fried egg and iced jasmine tea.',
      mapUrl: 'https://maps.google.com/?q=Nguyen+Hue+Ho+Chi+Minh',
      order: 4
    },
    {
      id: 'act-5',
      tripId: SAMPLE_TRIP_ID,
      date: '2026-09-02',
      time: '15:00',
      title: 'Cafe - The Old Apartment Cafe',
      location: '14 Ton That Dam, District 1',
      category: 'Cafe',
      plannedCost: 200000,
      actualCost: 220000,
      note: 'Cozy indie vintage record coffee bar with warm amber lights.',
      mapUrl: 'https://maps.google.com/?q=14+Ton+That+Dam+District+1',
      order: 5
    },
    {
      id: 'act-6',
      tripId: SAMPLE_TRIP_ID,
      date: '2026-09-02',
      time: '18:00',
      title: 'Dinner by Saigon River',
      location: 'Bach Dang Waterbus Wharf Restaurant',
      category: 'Food',
      plannedCost: 1200000,
      actualCost: 1350000,
      note: 'Candlelight couple dinner watching the evening city lights sparkle on the river water.',
      mapUrl: 'https://maps.google.com/?q=Bach+Dang+Wharf',
      order: 6
    }
  ],
  budget: [
    {
      id: 'b-1',
      tripId: SAMPLE_TRIP_ID,
      category: 'Hotel',
      item: 'Hotel ABC / Boutique stay',
      quantity: 1,
      unit: 'night',
      plannedCost: 1200000,
      actualCost: 1300000,
      notes: 'Included couple breakfast'
    },
    {
      id: 'b-2',
      tripId: SAMPLE_TRIP_ID,
      category: 'Food',
      item: 'Lunch com tam & drinks',
      quantity: 2,
      unit: 'meals',
      plannedCost: 400000,
      actualCost: 350000,
      notes: 'Discount voucher applied'
    },
    {
      id: 'b-3',
      tripId: SAMPLE_TRIP_ID,
      category: 'Cafe',
      item: 'Vintage apartment specialty drip coffee',
      quantity: 2,
      unit: 'person',
      plannedCost: 200000,
      actualCost: 220000,
      notes: 'Ordered matcha cheese cake'
    },
    {
      id: 'b-4',
      tripId: SAMPLE_TRIP_ID,
      category: 'Transportation',
      item: 'Gas & parking & Grab rides',
      quantity: 1,
      unit: 'trip',
      plannedCost: 300000,
      actualCost: 250000,
      notes: 'Convenient transport'
    },
    {
      id: 'b-5',
      tripId: SAMPLE_TRIP_ID,
      category: 'Tickets',
      item: 'Postcards & museum passes',
      quantity: 2,
      unit: 'ticket',
      plannedCost: 150000,
      actualCost: 120000,
      notes: 'Souvenir mail'
    },
    {
      id: 'b-6',
      tripId: SAMPLE_TRIP_ID,
      category: 'Food',
      item: 'Romantic river sunset dinner',
      quantity: 2,
      unit: 'person',
      plannedCost: 1200000,
      actualCost: 1350000,
      notes: 'Celebration wine'
    }
  ],
  places: [
    {
      id: 'p-1',
      tripId: SAMPLE_TRIP_ID,
      name: 'Saigon Central Post Office',
      category: 'Architecture & Heritage',
      address: '02 Cong Xa Paris, Ben Nghe, District 1',
      mapUrl: 'https://maps.google.com/?q=Saigon+Central+Post+Office',
      estimatedCost: 80000,
      openingHours: '07:30 - 18:00',
      notes: 'Stunning French colonial architecture designed by Gustave Eiffel studio.',
      status: 'Planned',
      imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'p-2',
      tripId: SAMPLE_TRIP_ID,
      name: '14 Ton That Dam Vintage Apartment',
      category: 'Indie Cafe',
      address: '14 Ton That Dam, Nguyen Thai Binh, District 1',
      mapUrl: 'https://maps.google.com/?q=14+Ton+That+Dam',
      estimatedCost: 150000,
      openingHours: '08:00 - 22:30',
      notes: 'Classic mid-century tiled hallways with vinyl record cafes.',
      status: 'Planned',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'p-3',
      tripId: SAMPLE_TRIP_ID,
      name: 'The Book Street Nguyen Van Binh',
      category: 'Culture & Leisure',
      address: 'Nguyen Van Binh, Ben Nghe, District 1',
      mapUrl: 'https://maps.google.com/?q=Nguyen+Van+Binh+Book+Street',
      estimatedCost: 0,
      openingHours: '08:00 - 21:00',
      notes: 'Shaded book street with warm cafes and souvenir journals.',
      status: 'Want to go',
      imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'p-4',
      tripId: SAMPLE_TRIP_ID,
      name: 'Bach Dang Waterbus Pier',
      category: 'Sightseeing & Ferry',
      address: 'Bach Dang Wharf, Ton Duc Thang',
      mapUrl: 'https://maps.google.com/?q=Bach+Dang+Wharf',
      estimatedCost: 30000,
      openingHours: '07:00 - 20:00',
      notes: 'Breezy river sunset boat trip for lovers.',
      status: 'Planned',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    }
  ],
  checklist: [
    {
      id: 'c-1',
      tripId: SAMPLE_TRIP_ID,
      category: 'Documents',
      title: 'Identity cards & driver licenses',
      completed: true
    },
    {
      id: 'c-2',
      tripId: SAMPLE_TRIP_ID,
      category: 'Documents',
      title: 'Hotel reservation confirmation voucher',
      completed: true
    },
    {
      id: 'c-3',
      tripId: SAMPLE_TRIP_ID,
      category: 'Personal items',
      title: 'Sunscreen SPF 50+ & lip balm',
      completed: true
    },
    {
      id: 'c-4',
      tripId: SAMPLE_TRIP_ID,
      category: 'Clothes',
      title: 'Matching couple beige linen outfits',
      completed: true
    },
    {
      id: 'c-5',
      tripId: SAMPLE_TRIP_ID,
      category: 'Electronics',
      title: 'Polaroid camera & extra film packs',
      completed: false,
      notes: 'Pick up 2 packs from store'
    },
    {
      id: 'c-6',
      tripId: SAMPLE_TRIP_ID,
      category: 'Electronics',
      title: 'Power bank 20,000mAh & charging cables',
      completed: true
    },
    {
      id: 'c-7',
      tripId: SAMPLE_TRIP_ID,
      category: 'Medicine',
      title: 'Motion sickness pills & bandages',
      completed: true
    },
    {
      id: 'c-8',
      tripId: SAMPLE_TRIP_ID,
      category: 'Booking',
      title: 'Reserve riverside dinner table at 18:00',
      completed: true,
      notes: 'Window table requested'
    },
    {
      id: 'c-9',
      tripId: SAMPLE_TRIP_ID,
      category: 'Clothes',
      title: 'Light evening cardigan / jacket',
      completed: false
    }
  ],
  notes: [
    {
      id: 'n-1',
      tripId: SAMPLE_TRIP_ID,
      title: 'Hotel Info & Check-in Details',
      category: 'Hotel info',
      content: 'Hotel: The Myst Dong Khoi\nAddress: 6-8 Ho Huan Nghiep, Ben Nghe, District 1\nCheck-in: 14:00 | Check-out: 12:00\nBooking Ref: MYST-2026-SAIGON-779\nNote: Includes afternoon high tea and rooftop plunge pool access.',
      updatedAt: '2026-09-01T11:00:00.000Z'
    },
    {
      id: 'n-2',
      tripId: SAMPLE_TRIP_ID,
      title: 'Romantic Playlist & Couple Memories',
      category: 'Important notes',
      content: 'Remember to play our favorite acoustic indie acoustic playlist on the road!\nBring the vintage leather journal to press flower petals from Ben Thanh flower stalls.\nTake a sunset photo on Bach Dang wharf.',
      updatedAt: '2026-09-01T14:20:00.000Z'
    }
  ]
};

// Also prepare a second preset trip for Da Lat so user can instantly test trip switching
export const SECOND_TRIP_ID = 'trip-dalat-2026';

export const SECOND_TRIP_BUNDLE: TripBundle = {
  tripInfo: {
    id: SECOND_TRIP_ID,
    name: 'Da Lat Misty Mountain Escape',
    destination: 'Da Lat, Lam Dong',
    startDate: '2026-11-20',
    endDate: '2026-11-23',
    travelers: 2,
    travelerNames: 'Thu & Minh',
    transport: 'Sleeper Bus & Vintage Vespa Rental',
    hotel: 'Zen Valley Da Lat Wooden Bungalow',
    coverImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    notes: 'Cozy wool sweaters, warm artichoke tea, pine forest strolls and hot soy milk by Da Lat market.',
    plannedBudget: 8500000,
    status: 'Upcoming',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-09-02T16:00:00.000Z'
  },
  itinerary: [
    {
      id: 'dl-act-1',
      tripId: SECOND_TRIP_ID,
      date: '2026-11-20',
      time: '06:00',
      title: 'Arrive at Da Lat & Check in bungalow',
      location: 'Zen Valley Da Lat, Khe Sanh',
      category: 'Hotel',
      plannedCost: 2400000,
      actualCost: 2400000,
      note: 'Early luggage drop and warm herbal welcome tea.',
      mapUrl: 'https://maps.google.com/?q=Zen+Valley+Dalat',
      order: 1
    },
    {
      id: 'dl-act-2',
      tripId: SECOND_TRIP_ID,
      date: '2026-11-20',
      time: '08:30',
      title: 'Breakfast Banh Mi Xiu Mai',
      location: 'Hoang Dieu Street',
      category: 'Food',
      plannedCost: 120000,
      actualCost: 110000,
      note: 'Hot meatball stew with crispy fresh bread.',
      mapUrl: 'https://maps.google.com/?q=Banh+Mi+Xiu+Mai+Hoang+Dieu',
      order: 2
    },
    {
      id: 'dl-act-3',
      tripId: SECOND_TRIP_ID,
      date: '2026-11-20',
      time: '14:00',
      title: 'Tuyen Lam Lake & Pine Hill Walk',
      location: 'Tuyen Lam Lake',
      category: 'Sightseeing',
      plannedCost: 200000,
      actualCost: 200000,
      note: 'Quiet scenic walk among old pine trees.',
      mapUrl: 'https://maps.google.com/?q=Tuyen+Lam+Lake',
      order: 3
    }
  ],
  budget: [
    {
      id: 'dl-b-1',
      tripId: SECOND_TRIP_ID,
      category: 'Hotel',
      item: 'Wooden valley bungalow',
      quantity: 3,
      unit: 'nights',
      plannedCost: 3600000,
      actualCost: 3600000,
      notes: 'Breakfast included'
    },
    {
      id: 'dl-b-2',
      tripId: SECOND_TRIP_ID,
      category: 'Transportation',
      item: 'Round-trip sleeper bus',
      quantity: 2,
      unit: 'ticket',
      plannedCost: 1200000,
      actualCost: 1200000,
      notes: 'Limousine cabin bus'
    },
    {
      id: 'dl-b-3',
      tripId: SECOND_TRIP_ID,
      category: 'Food',
      item: 'Hot pot & mountain specialties',
      quantity: 6,
      unit: 'meals',
      plannedCost: 2000000,
      actualCost: 1850000,
      notes: 'Chicken leaf hotpot & grilled pork'
    }
  ],
  places: [
    {
      id: 'dl-p-1',
      name: 'Tuyen Lam Lake',
      tripId: SECOND_TRIP_ID,
      category: 'Nature',
      address: 'Tuyen Lam, Ward 4, Da Lat',
      mapUrl: 'https://maps.google.com/?q=Tuyen+Lam+Lake',
      estimatedCost: 0,
      openingHours: 'Open 24/7',
      notes: 'Peaceful misty lake',
      status: 'Planned'
    }
  ],
  checklist: [
    {
      id: 'dl-c-1',
      tripId: SECOND_TRIP_ID,
      category: 'Clothes',
      title: 'Warm wool coats & knitted scarves',
      completed: true
    },
    {
      id: 'dl-c-2',
      tripId: SECOND_TRIP_ID,
      category: 'Electronics',
      title: 'Camera tripod for couple photos',
      completed: false
    }
  ],
  notes: [
    {
      id: 'dl-n-1',
      tripId: SECOND_TRIP_ID,
      title: 'Cafe recommendations from friends',
      category: 'Food wishlist',
      content: '1. Cheo Veooo (hillside sunset)\n2. Tung Cafe (classic 1960s cafe with French music)\n3. Thong Oi (cozy pine woods)',
      updatedAt: '2026-08-25T10:00:00.000Z'
    }
  ]
};
