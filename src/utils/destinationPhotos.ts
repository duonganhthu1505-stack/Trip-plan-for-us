export interface SuggestedPhoto {
  id: string;
  name: string;
  location: string;
  url: string;
  tag?: string;
}

// Comprehensive database of curated high-definition travel photos
export const DESTINATION_PHOTOS_DATABASE: Record<string, SuggestedPhoto[]> = {
  dalat: [
    {
      id: 'dalat-1',
      name: 'Đồi thông & Thung lũng sương mù',
      location: 'Đà Lạt',
      url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
      tag: 'Sương mù & Rừng thông'
    },
    {
      id: 'dalat-2',
      name: 'Hoàng hôn thung lũng tình yêu',
      location: 'Đà Lạt',
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hoàng hôn'
    },
    {
      id: 'dalat-3',
      name: 'Quán cafe ngắm mây trên đồi',
      location: 'Đà Lạt',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      tag: 'Săn mây & Cafe'
    },
    {
      id: 'dalat-4',
      name: 'Hồ Tuyền Lâm sớm mai thơ mộng',
      location: 'Đà Lạt',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hồ & Mặt nước'
    },
    {
      id: 'dalat-5',
      name: 'Vườn hoa cẩm tú cầu & dã quỳ',
      location: 'Đà Lạt',
      url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80',
      tag: 'Vườn hoa'
    },
    {
      id: 'dalat-6',
      name: 'Biệt thự Pháp cổ kính trong rừng',
      location: 'Đà Lạt',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      tag: 'Kiến trúc cổ'
    }
  ],

  saigon: [
    {
      id: 'saigon-1',
      name: 'Góc phố cổ điển & Nắng Sài Gòn',
      location: 'TP. Hồ Chí Minh',
      url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
      tag: 'Phố vintage'
    },
    {
      id: 'saigon-2',
      name: 'Sông Sài Gòn & Skyline Landmark',
      location: 'TP. Hồ Chí Minh',
      url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Skyline hiện đại'
    },
    {
      id: 'saigon-3',
      name: 'Chung cư cafe cổ Nguyễn Huệ',
      location: 'TP. Hồ Chí Minh',
      url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cafe & Cuộc sống'
    },
    {
      id: 'saigon-4',
      name: 'Ánh đèn đêm thành phố lung linh',
      location: 'TP. Hồ Chí Minh',
      url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
      tag: 'Đêm Sài Gòn'
    },
    {
      id: 'saigon-5',
      name: 'Bến Bạch Đằng & Cầu Ba Son hoàng hôn',
      location: 'TP. Hồ Chí Minh',
      url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      tag: 'Ven sông'
    },
    {
      id: 'saigon-6',
      name: 'Nhà thờ & Góc phố di sản',
      location: 'TP. Hồ Chí Minh',
      url: 'https://images.unsplash.com/photo-1565060169194-1b327b8782a6?auto=format&fit=crop&w=1200&q=80',
      tag: 'Di sản'
    }
  ],

  hanoi: [
    {
      id: 'hanoi-1',
      name: 'Hồ Hoàn Kiếm sương sớm & Tháp Rùa',
      location: 'Hà Nội',
      url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hồ Gươm'
    },
    {
      id: 'hanoi-2',
      name: 'Phố cổ 36 phố phường mùa thu',
      location: 'Hà Nội',
      url: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=1200&q=80',
      tag: 'Phố cổ'
    },
    {
      id: 'hanoi-3',
      name: 'Hoàng thành Thăng Long trầm mặc',
      location: 'Hà Nội',
      url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
      tag: 'Di tích cổ'
    },
    {
      id: 'hanoi-4',
      name: 'Cầu Long Biên hoàng hôn hoài niệm',
      location: 'Hà Nội',
      url: 'https://images.unsplash.com/photo-1477959858617-67f30bc54b6d?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hoàng hôn'
    },
    {
      id: 'hanoi-5',
      name: 'Cafe trứng & Không gian xưa',
      location: 'Hà Nội',
      url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cafe'
    },
    {
      id: 'hanoi-6',
      name: 'Đường Phan Đình Phùng lá vàng bay',
      location: 'Hà Nội',
      url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Mùa thu'
    }
  ],

  phuquoc: [
    {
      id: 'phuquoc-1',
      name: 'Bãi Sao cát trắng & Biển ngọc bích',
      location: 'Phú Quốc',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Biển xanh'
    },
    {
      id: 'phuquoc-2',
      name: 'Hoàng hôn Sunset Sanato huyền ảo',
      location: 'Phú Quốc',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hoàng hôn'
    },
    {
      id: 'phuquoc-3',
      name: 'Rặng dừa nhiệt đới đón gió biển',
      location: 'Phú Quốc',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Nghỉ dưỡng'
    },
    {
      id: 'phuquoc-4',
      name: 'Resort hồ bơi vô cực ngắm biển',
      location: 'Phú Quốc',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      tag: 'Resort cao cấp'
    },
    {
      id: 'phuquoc-5',
      name: 'Lặn ngắm san hô & Thuyền buồm',
      location: 'Phú Quốc',
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
      tag: 'Đại dương'
    },
    {
      id: 'phuquoc-6',
      name: 'Làng chài Hàm Ninh mộc mạc',
      location: 'Phú Quốc',
      url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Bình yên'
    }
  ],

  hoian: [
    {
      id: 'hoian-1',
      name: 'Phố cổ đèn lồng lung linh đêm',
      location: 'Hội An',
      url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Đèn lồng'
    },
    {
      id: 'hoian-2',
      name: 'Dãy nhà vàng rực rỡ hoa giấy',
      location: 'Hội An',
      url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
      tag: 'Phố cổ xưa'
    },
    {
      id: 'hoian-3',
      name: 'Thả hoa đăng trên dòng sông Hoài',
      location: 'Hội An',
      url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
      tag: 'Sông Hoài'
    },
    {
      id: 'hoian-4',
      name: 'Đồng lúa Cẩm Thanh & Rừng dừa Bảy Mẫu',
      location: 'Hội An',
      url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Thiên nhiên'
    },
    {
      id: 'hoian-5',
      name: 'Góc quán cafe ngói âm dương',
      location: 'Hội An',
      url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cafe'
    },
    {
      id: 'hoian-6',
      name: 'Biển An Bàng trong xanh',
      location: 'Hội An',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Biển An Bàng'
    }
  ],

  danang: [
    {
      id: 'danang-1',
      name: 'Cầu Vàng Bà Nà Hills bồng bềnh mây',
      location: 'Đà Nẵng',
      url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cầu Vàng'
    },
    {
      id: 'danang-2',
      name: 'Bãi biển Mỹ Khê nắng vàng biển biếc',
      location: 'Đà Nẵng',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      tag: 'Biển Mỹ Khê'
    },
    {
      id: 'danang-3',
      name: 'Đèo Hải Vân & Bán đảo Sơn Trà',
      location: 'Đà Nẵng',
      url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      tag: 'Đèo Hải Vân'
    },
    {
      id: 'danang-4',
      name: 'Cầu Rồng sông Hàn rực rỡ đêm',
      location: 'Đà Nẵng',
      url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cầu Rồng'
    },
    {
      id: 'danang-5',
      name: 'Ngũ Hành Sơn & Chùa Linh Ứng',
      location: 'Đà Nẵng',
      url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
      tag: 'Sơn Trà'
    },
    {
      id: 'danang-6',
      name: 'Resort ven biển lãng mạn',
      location: 'Đà Nẵng',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      tag: 'Resort'
    }
  ],

  nhatrang: [
    {
      id: 'nhatrang-1',
      name: 'Vịnh biển Nha Trang xanh màu ngọc',
      location: 'Nha Trang',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Vịnh biển'
    },
    {
      id: 'nhatrang-2',
      name: 'Đường ven biển Trần Phú rợp bóng dừa',
      location: 'Nha Trang',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Con đường biển'
    },
    {
      id: 'nhatrang-3',
      name: 'Tháp Bà Ponagar cổ kính linh thiêng',
      location: 'Nha Trang',
      url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
      tag: 'Di tích Chăm'
    },
    {
      id: 'nhatrang-4',
      name: 'Du thuyền ngắm hoàng hôn vịnh đảo',
      location: 'Nha Trang',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hoàng hôn'
    }
  ],

  vungtau: [
    {
      id: 'vungtau-1',
      name: 'Hoàng hôn Bãi Trước & Bãi Sau',
      location: 'Vũng Tàu',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hoàng hôn biển'
    },
    {
      id: 'vungtau-2',
      name: 'Ngọn hải đăng Vũng Tàu trên đỉnh núi',
      location: 'Vũng Tàu',
      url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hải đăng'
    },
    {
      id: 'vungtau-3',
      name: 'Mũi Nghinh Phong đón gió đại dương',
      location: 'Vũng Tàu',
      url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
      tag: 'Mũi Nghinh Phong'
    },
    {
      id: 'vungtau-4',
      name: 'Đường bờ biển Hạ Long uốn lượn',
      location: 'Vũng Tàu',
      url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      tag: 'Đường biển'
    }
  ],

  hue: [
    {
      id: 'hue-1',
      name: 'Đại Nội Huế & Cổng Ngọ Môn cổ kính',
      location: 'Huế',
      url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hoàng cung'
    },
    {
      id: 'hue-2',
      name: 'Chùa Thiên Mụ bên dòng sông Hương',
      location: 'Huế',
      url: 'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=1200&q=80',
      tag: 'Sông Hương'
    },
    {
      id: 'hue-3',
      name: 'Lăng Khải Định & Kiến trúc tinh xảo',
      location: 'Huế',
      url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
      tag: 'Lăng tẩm'
    },
    {
      id: 'hue-4',
      name: 'Cầu Trường Tiền tím chiều hoàng hôn',
      location: 'Huế',
      url: 'https://images.unsplash.com/photo-1477959858617-67f30bc54b6d?auto=format&fit=crop&w=1200&q=80',
      tag: 'Trường Tiền'
    }
  ],

  sapa: [
    {
      id: 'sapa-1',
      name: 'Ruộng bậc thang Mường Hoa lúa chín',
      location: 'Sa Pa',
      url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Ruộng bậc thang'
    },
    {
      id: 'sapa-2',
      name: 'Đỉnh Fansipan nóc nhà Đông Dương',
      location: 'Sa Pa',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Đỉnh Fansipan'
    },
    {
      id: 'sapa-3',
      name: 'Bản Cát Cát sương mờ Tây Bắc',
      location: 'Sa Pa',
      url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
      tag: 'Bản làng'
    },
    {
      id: 'sapa-4',
      name: 'Đèo Ô Quy Hồ biển mây cuồn cuộn',
      location: 'Sa Pa',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      tag: 'Săn mây'
    }
  ],

  ninhbinh: [
    {
      id: 'ninhbinh-1',
      name: 'Quần thể Tràng An non nước mây trời',
      location: 'Ninh Bình',
      url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
      tag: 'Tràng An'
    },
    {
      id: 'ninhbinh-2',
      name: 'Hang Múa ngắm toàn cảnh Tam Cốc',
      location: 'Ninh Bình',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hang Múa'
    },
    {
      id: 'ninhbinh-3',
      name: 'Dòng sông Ngô Đồng mùa lúa vàng',
      location: 'Ninh Bình',
      url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Tam Cốc'
    },
    {
      id: 'ninhbinh-4',
      name: 'Chùa Bái Đính cổ tự tráng lệ',
      location: 'Ninh Bình',
      url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
      tag: 'Bái Đính'
    }
  ],

  quynhon: [
    {
      id: 'quynhon-1',
      name: 'Eo Gió Quy Nhơn cung đường vách đá',
      location: 'Quy Nhơn',
      url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
      tag: 'Eo Gió'
    },
    {
      id: 'quynhon-2',
      name: 'Bãi biển Kỳ Co trong vắt đáy',
      location: 'Quy Nhơn',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Kỳ Co'
    },
    {
      id: 'quynhon-3',
      name: 'Ghềnh Đá Đĩa Phú Yên kỳ quan tạo hóa',
      location: 'Phú Yên',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Ghềnh Đá Đĩa'
    },
    {
      id: 'quynhon-4',
      name: 'Mũi Điện nơi đón bình minh đầu tiên',
      location: 'Phú Yên',
      url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Hải đăng Mũi Điện'
    }
  ],

  kyoto: [
    {
      id: 'kyoto-1',
      name: 'Cổng Torii đỏ Fushimi Inari Taisha',
      location: 'Kyoto, Nhật Bản',
      url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Fushimi Inari'
    },
    {
      id: 'kyoto-2',
      name: 'Rừng trúc xanh Arashiyama thanh tịnh',
      location: 'Kyoto, Nhật Bản',
      url: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=1200&q=80',
      tag: 'Arashiyama'
    },
    {
      id: 'kyoto-3',
      name: 'Phố cổ Gion & Cầu mùa lá đỏ',
      location: 'Kyoto, Nhật Bản',
      url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      tag: 'Phố cổ Gion'
    }
  ],

  tokyo: [
    {
      id: 'tokyo-1',
      name: 'Núi Phú Sĩ & Hoa anh đào nở rộ',
      location: 'Tokyo / Núi Phú Sĩ',
      url: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=1200&q=80',
      tag: 'Phú Sĩ & Sakura'
    },
    {
      id: 'tokyo-2',
      name: 'Ngã tư Shibuya & Ánh đèn rực rỡ',
      location: 'Tokyo, Nhật Bản',
      url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      tag: 'Shibuya'
    }
  ],

  paris: [
    {
      id: 'paris-1',
      name: 'Tháp Eiffel bình minh lãng mạn',
      location: 'Paris, Pháp',
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
      tag: 'Eiffel Tower'
    },
    {
      id: 'paris-2',
      name: 'Sông Seine & Cầu cổ kính Paris',
      location: 'Paris, Pháp',
      url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
      tag: 'Sông Seine'
    }
  ],

  thailand: [
    {
      id: 'thailand-1',
      name: 'Cung điện Hoàng Gia Bangkok lộng lẫy',
      location: 'Bangkok, Thái Lan',
      url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
      tag: 'Bangkok'
    },
    {
      id: 'thailand-2',
      name: 'Đảo Phuket & Vịnh Phang Nga biển xanh',
      location: 'Phuket, Thái Lan',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      tag: 'Phuket'
    }
  ],

  bali: [
    {
      id: 'bali-1',
      name: 'Ruộng bậc thang nhiệt đới Ubud',
      location: 'Bali, Indonesia',
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
      tag: 'Ubud'
    },
    {
      id: 'bali-2',
      name: 'Vách đá đền Uluwatu hoàng hôn',
      location: 'Bali, Indonesia',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Uluwatu'
    }
  ],

  generic: [
    {
      id: 'gen-beach',
      name: 'Bờ biển nhiệt đới & Nắng sớm hoàng kim',
      location: 'Biển xanh',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Biển & Nghỉ dưỡng'
    },
    {
      id: 'gen-mountain',
      name: 'Đỉnh núi hùng vĩ & Biển mây phiêu lãng',
      location: 'Núi cao',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Núi non & Phiêu lưu'
    },
    {
      id: 'gen-roadtrip',
      name: 'Chuyến xe rong ruổi những nẻo đường tự do',
      location: 'Road Trip',
      url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      tag: 'Road Trip'
    },
    {
      id: 'gen-resort',
      name: 'Resort nghỉ dưỡng bình yên bên hồ bơi',
      location: 'Resort',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      tag: 'Resort thư giãn'
    },
    {
      id: 'gen-cafe',
      name: 'Buổi chiều cafe ấm cúng & Trò chuyện',
      location: 'Cafe lãng mạn',
      url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cafe hẹn hò'
    },
    {
      id: 'gen-oldtown',
      name: 'Góc phố cổ yên bình & Ngõ vắng',
      location: 'Phố cổ',
      url: 'https://images.unsplash.com/photo-1477959858617-67f30bc54b6d?auto=format&fit=crop&w=1200&q=80',
      tag: 'Dạo phố'
    }
  ]
};

/**
 * Normalizes Vietnamese string to non-accented lowercase keywords for flexible fuzzy matching.
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Retrieves the best matched suggested photos based on the destination input.
 */
export function getSuggestedPhotosForDestination(destination: string, queryOverride?: string): SuggestedPhoto[] {
  const targetText = normalizeText(queryOverride || destination || '');

  if (!targetText) {
    // Return curated default mix
    return [
      ...DESTINATION_PHOTOS_DATABASE.saigon.slice(0, 2),
      ...DESTINATION_PHOTOS_DATABASE.dalat.slice(0, 2),
      ...DESTINATION_PHOTOS_DATABASE.phuquoc.slice(0, 2),
      ...DESTINATION_PHOTOS_DATABASE.hoian.slice(0, 2),
      ...DESTINATION_PHOTOS_DATABASE.danang.slice(0, 2),
      ...DESTINATION_PHOTOS_DATABASE.hanoi.slice(0, 2)
    ];
  }

  // Check direct destination keys
  if (targetText.includes('da lat') || targetText.includes('dalat') || targetText.includes('lam dong')) {
    return [...DESTINATION_PHOTOS_DATABASE.dalat, ...DESTINATION_PHOTOS_DATABASE.generic.slice(0, 2)];
  }
  if (
    targetText.includes('sai gon') ||
    targetText.includes('saigon') ||
    targetText.includes('ho chi minh') ||
    targetText.includes('hcm') ||
    targetText.includes('tphcm')
  ) {
    return [...DESTINATION_PHOTOS_DATABASE.saigon, ...DESTINATION_PHOTOS_DATABASE.generic.slice(0, 2)];
  }
  if (targetText.includes('ha noi') || targetText.includes('hanoi') || targetText.includes('hn')) {
    return [...DESTINATION_PHOTOS_DATABASE.hanoi, ...DESTINATION_PHOTOS_DATABASE.generic.slice(0, 2)];
  }
  if (targetText.includes('phu quoc') || targetText.includes('phuquoc') || targetText.includes('kien giang')) {
    return [...DESTINATION_PHOTOS_DATABASE.phuquoc, ...DESTINATION_PHOTOS_DATABASE.generic.slice(0, 2)];
  }
  if (targetText.includes('hoi an') || targetText.includes('hoian') || targetText.includes('quang nam')) {
    return [...DESTINATION_PHOTOS_DATABASE.hoian, ...DESTINATION_PHOTOS_DATABASE.generic.slice(0, 2)];
  }
  if (targetText.includes('da nang') || targetText.includes('danang')) {
    return [...DESTINATION_PHOTOS_DATABASE.danang, ...DESTINATION_PHOTOS_DATABASE.generic.slice(0, 2)];
  }
  if (targetText.includes('nha trang') || targetText.includes('nhatrang') || targetText.includes('khanh hoa')) {
    return [...DESTINATION_PHOTOS_DATABASE.nhatrang, ...DESTINATION_PHOTOS_DATABASE.phuquoc.slice(0, 2)];
  }
  if (targetText.includes('vung tau') || targetText.includes('vungtau') || targetText.includes('ba ria')) {
    return [...DESTINATION_PHOTOS_DATABASE.vungtau, ...DESTINATION_PHOTOS_DATABASE.saigon.slice(0, 2)];
  }
  if (targetText.includes('hue') || targetText.includes('thua thien')) {
    return [...DESTINATION_PHOTOS_DATABASE.hue, ...DESTINATION_PHOTOS_DATABASE.hoian.slice(0, 2)];
  }
  if (targetText.includes('sapa') || targetText.includes('sa pa') || targetText.includes('lao cai') || targetText.includes('ha giang')) {
    return [...DESTINATION_PHOTOS_DATABASE.sapa, ...DESTINATION_PHOTOS_DATABASE.ninhbinh.slice(0, 2)];
  }
  if (targetText.includes('ninh binh') || targetText.includes('ninhbinh') || targetText.includes('ha long') || targetText.includes('quang ninh')) {
    return [...DESTINATION_PHOTOS_DATABASE.ninhbinh, ...DESTINATION_PHOTOS_DATABASE.sapa.slice(0, 2)];
  }
  if (targetText.includes('quy nhon') || targetText.includes('quynhon') || targetText.includes('phu yen') || targetText.includes('binh dinh')) {
    return [...DESTINATION_PHOTOS_DATABASE.quynhon, ...DESTINATION_PHOTOS_DATABASE.nhatrang.slice(0, 2)];
  }
  if (targetText.includes('kyoto') || targetText.includes('japan') || targetText.includes('nhat ban')) {
    return [...DESTINATION_PHOTOS_DATABASE.kyoto, ...DESTINATION_PHOTOS_DATABASE.tokyo];
  }
  if (targetText.includes('tokyo')) {
    return [...DESTINATION_PHOTOS_DATABASE.tokyo, ...DESTINATION_PHOTOS_DATABASE.kyoto];
  }
  if (targetText.includes('paris') || targetText.includes('phap') || targetText.includes('france') || targetText.includes('chau au') || targetText.includes('europe')) {
    return [...DESTINATION_PHOTOS_DATABASE.paris, ...DESTINATION_PHOTOS_DATABASE.generic];
  }
  if (targetText.includes('thai lan') || targetText.includes('thailand') || targetText.includes('bangkok') || targetText.includes('phuket')) {
    return [...DESTINATION_PHOTOS_DATABASE.thailand, ...DESTINATION_PHOTOS_DATABASE.phuquoc.slice(0, 2)];
  }
  if (targetText.includes('bali') || targetText.includes('indonesia')) {
    return [...DESTINATION_PHOTOS_DATABASE.bali, ...DESTINATION_PHOTOS_DATABASE.phuquoc.slice(0, 2)];
  }
  if (targetText.includes('bien') || targetText.includes('beach') || targetText.includes('dao') || targetText.includes('resort')) {
    return [...DESTINATION_PHOTOS_DATABASE.phuquoc, ...DESTINATION_PHOTOS_DATABASE.nhatrang, ...DESTINATION_PHOTOS_DATABASE.vungtau];
  }
  if (targetText.includes('nui') || targetText.includes('mountain') || targetText.includes('suong') || targetText.includes('doi')) {
    return [...DESTINATION_PHOTOS_DATABASE.dalat, ...DESTINATION_PHOTOS_DATABASE.sapa];
  }
  if (targetText.includes('pho') || targetText.includes('city') || targetText.includes('cafe')) {
    return [...DESTINATION_PHOTOS_DATABASE.saigon, ...DESTINATION_PHOTOS_DATABASE.hanoi, ...DESTINATION_PHOTOS_DATABASE.hoian];
  }

  // Fallback: Return a rich combination of all high-res photos
  return [
    ...DESTINATION_PHOTOS_DATABASE.dalat.slice(0, 2),
    ...DESTINATION_PHOTOS_DATABASE.saigon.slice(0, 2),
    ...DESTINATION_PHOTOS_DATABASE.phuquoc.slice(0, 2),
    ...DESTINATION_PHOTOS_DATABASE.hoian.slice(0, 2),
    ...DESTINATION_PHOTOS_DATABASE.danang.slice(0, 2),
    ...DESTINATION_PHOTOS_DATABASE.hanoi.slice(0, 2),
    ...DESTINATION_PHOTOS_DATABASE.generic
  ];
}
