# Sync v2 — "cloud là chuẩn duy nhất"

Tài liệu này mô tả cơ chế đồng bộ hiện tại giữa 2 thiết bị (Anh & Bé yêu) và các bước
triển khai bắt buộc sau khi merge.

## Vấn đề của bản sync cũ

| Triệu chứng | Nguyên nhân |
|---|---|
| Sửa tên chuyến đi ở máy A, máy B mở lên lại thấy tên cũ | Ghi **cả document** (`set(..., {merge:true})` với toàn bộ field) nên bản cũ của B đè lên bản mới của A |
| A đổi ảnh bìa, B sửa ghi chú → mất một trong hai | Ảnh bìa (base64 ~600 KB) nằm chung document với các field chữ, ghi chung một lần |
| Xoá hết dịch vụ ở máy A, máy B vẫn hiện lại | Khi danh sách trên cloud rỗng, app **fallback** về bản local |
| Máy nào cũng "đúng" | So sánh bằng giờ của thiết bị (`updatedAt` ISO) |

## Cách hoạt động của sync v2

1. **Cloud là sự thật duy nhất.** Mọi dữ liệu đọc về từ Firestore được áp dụng thẳng,
   *kể cả khi rỗng*: danh sách rỗng nghĩa là "máy kia đã xoá", không phải "dùng tạm bản local".
2. **Giờ máy chủ.** Mỗi lần ghi đều đóng dấu `serverUpdatedAt: serverTimestamp()`.
   Bản local giữ giá trị đã resolve dưới dạng số ms. Giờ thiết bị không bao giờ được dùng
   để quyết định bản nào mới hơn.
3. **Ghi theo field.** `TripBaseline` (localStorage) ghi nhớ giá trị cloud đã biết lần cuối;
   khi lưu chỉ những field *thay đổi* được gửi lên (`diffTripInfoFields`). Vì vậy A sửa tên
   và B đổi ảnh bìa cùng lúc thì **cả hai đều còn**.
4. **Ảnh bìa tách document.** Bìa nằm ở `trips/{tripId}/meta/cover`; document trip chỉ còn
   dữ liệu nhỏ. Có listener riêng cho bìa nên máy kia thấy ảnh mới ngay.
5. **Xoá an toàn.** Mỗi thiết bị ghi nhớ id các dòng đã từng thấy trên cloud; khi lưu cả
   danh sách, chỉ những dòng *đã từng thấy và bị xoá tại máy này* mới bị xoá
   (`deletableRemoteIds`). Máy đang giữ bản cũ không thể xoá dòng mà máy kia vừa thêm.
6. **Không mất việc đang dở.** Dòng vừa thêm nhưng chưa up xong được đánh dấu *pending*
   (`markPendingItemUploads`) nên không bị "cloud thắng" xoá mất.

Mã nguồn: `src/utils/syncCore.ts` (thuần logic, không phụ thuộc Firebase) +
`src/utils/firestoreService.ts` (I/O) + `src/App.tsx` (điều phối).

## Kiểm thử

```bash
npm run test        # lint (tsc) + 50 check sync + SSR smoke
npm run test:sync   # chỉ phần sync: npx tsx scripts/sync-selftest.ts
npm run build       # vite production + PWA
```

`scripts/sync-selftest.ts` phủ đúng các kịch bản vận hành: giờ máy chủ, ghi theo field,
A đổi tên + B đổi bìa cùng lúc, danh sách rỗng không fallback, chống xoá nhầm.

## ⚠️ Sau khi deploy — BẮT BUỘC 1 LẦN

```bash
firebase deploy --only firestore:rules
```

Rules mới cho phép thêm:

- subcollection `trips/{tripId}/meta/cover` (ảnh bìa, tối đa 900.000 ký tự),
- trường `serverUpdatedAt` kiểu `timestamp` trên document trip và document meta.

Không deploy rules → các write mới (ảnh bìa, dấu thời gian máy chủ) bị
`permission-denied`; app vẫn chạy nhưng sync chỉ báo cảnh báo trong console.

## Checklist vận hành sau rollout (2 người dùng)

1. Cả 2 thiết bị hard-refresh / cài lại PWA để chạy cùng một bản build mới.
2. Bật ngày-giờ tự động trên cả 2 máy.
3. Export backup JSON từ thiết bị chuẩn trước khi dùng lại dữ liệu thật.
4. Kiểm tra nhanh: A sửa tên chuyến đi + B đổi ảnh bìa cùng lúc → sau ~1 phút cả hai
   thay đổi phải còn trên cả 2 máy.
