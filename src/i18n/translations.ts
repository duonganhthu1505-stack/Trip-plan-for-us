export const translations = {
  en: {
    app: {
      title: 'OurTravelPlanner',
      signIn: 'Sign In',
      signOut: 'Sign Out',
    },
    tabs: {
      myTrips: 'My Trips',
      details: 'Trip Details',
      itinerary: 'Itinerary',
      budget: 'Budget',
      checklist: 'Checklist',
      notes: 'Notes',
    },
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      selectItems: 'Select Items',
      cancelSelection: 'Cancel Selection',
      selectAll: 'Select All',
      deleteSelected: 'Delete Selected',
      addActivity: 'Add Activity',
      addExpense: 'Add Expense Item',
      syncFromItinerary: 'Sync from Itinerary',
    },
    itinerary: {
      title: 'Itinerary',
      desc: 'Plan your daily activities and keep track of your schedule.',
      dayView: 'Day View',
      timeline: 'Timeline',
      allDays: 'All Days',
    },
    budget: {
      title: 'Budget Tracker',
      desc: 'Manage your trip expenses and keep track of your spending.',
      planned: 'Planned',
      actual: 'Actual',
      gap: 'Gap',
      total: 'Total',
      category: 'Category',
      item: 'Item',
      qty: 'Qty',
      autoSync: 'Auto-synced from Itinerary',
    },
    common: {
      confirmDelete: 'Are you sure you want to delete this item?',
      confirmDeleteMulti: 'Are you sure you want to delete the selected items?',
    }
  },
  vi: {
    app: {
      title: 'Nhật Ký Chuyến Đi',
      signIn: 'Đăng Nhập',
      signOut: 'Đăng Xuất',
    },
    tabs: {
      myTrips: 'Chuyến Đi Của Tôi',
      details: 'Chi Tiết',
      itinerary: 'Lịch Trình',
      budget: 'Ngân Sách',
      checklist: 'Hành Trang',
      notes: 'Ghi Chú',
    },
    actions: {
      save: 'Lưu',
      cancel: 'Hủy',
      delete: 'Xóa',
      edit: 'Chỉnh sửa',
      selectItems: 'Chọn nhiều',
      cancelSelection: 'Hủy chọn',
      selectAll: 'Chọn tất cả',
      deleteSelected: 'Xóa mục đã chọn',
      addActivity: 'Thêm Hoạt Động',
      addExpense: 'Thêm Chi Phí',
      syncFromItinerary: 'Đồng bộ từ Lịch Trình',
    },
    itinerary: {
      title: 'Lịch Trình',
      desc: 'Lên kế hoạch chi tiết cho từng ngày trong chuyến đi.',
      dayView: 'Theo ngày',
      timeline: 'Dòng thời gian',
      allDays: 'Tất cả các ngày',
    },
    budget: {
      title: 'Quản Lý Ngân Sách',
      desc: 'Theo dõi và kiểm soát chi phí cho chuyến đi của bạn.',
      planned: 'Dự kiến',
      actual: 'Thực tế',
      gap: 'Chênh lệch',
      total: 'Tổng cộng',
      category: 'Danh mục',
      item: 'Khoản chi',
      qty: 'SL',
      autoSync: 'Đồng bộ tự động từ Lịch Trình',
    },
    common: {
      confirmDelete: 'Bạn có chắc chắn muốn xóa mục này?',
      confirmDeleteMulti: 'Bạn có chắc muốn xóa các mục đã chọn?',
    }
  }
};

export type Language = 'en' | 'vi';
