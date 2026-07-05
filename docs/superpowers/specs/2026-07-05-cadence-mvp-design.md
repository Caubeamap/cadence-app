# Cadence MVP — Design Spec

**Ngày:** 2026-07-05
**Trạng thái:** Đã duyệt (2026-07-05)
**Repo:** github.com/Caubeamap/cadence-app

## 1. Sản phẩm

Cadence là app lên kế hoạch trong ngày, offline-first, chạy hoàn toàn trên thiết bị:

- Người dùng nhập việc cần làm (gõ hoặc nói).
- App **tự xếp** các việc linh hoạt vào khoảng trống quanh các việc cố định giờ.
- Tới giờ, app nhắc bằng **giọng nói** (TTS) với nội dung có ngữ cảnh.
- Khi một việc bị trễ hoặc bỏ qua, app **tự dồn lại lịch** phần còn lại của ngày.

**Ràng buộc cứng:** chi phí vận hành = 0. Không backend, không API key, không LLM API.
"Bộ não" sắp lịch là thuật toán constraint-based viết bằng TypeScript thuần.

**Người dùng mục tiêu:** sinh viên và người đi làm trẻ tại Việt Nam, dùng một mình
(single-user, single-device).

## 2. Phạm vi MVP

### Trong phạm vi
1. Nhập việc bằng bàn phím hoặc giọng nói (STT của hệ điều hành).
2. Parser tiếng Việt cơ bản: nhận diện thời lượng ("1 tiếng", "30 phút"),
   giờ cố định ("3h chiều", "15h"), deadline ("trước 5h", "trong hôm nay").
3. Scheduler tự xếp lịch trong ngày + tự dồn lịch khi trễ/bỏ.
4. Nhắc nhở: local notification + TTS đọc to khi app đang mở/foreground.
5. Ba màn hình: Today (timeline), Add Task (sheet), Settings (tối giản).
6. Dark mode, tiếng Việt là ngôn ngữ UI chính.

### Ngoài phạm vi (có chủ đích — YAGNI)
- Backend, tài khoản, đồng bộ đa thiết bị.
- On-device LLM (nâng cấp tương lai cho parser).
- Đồng bộ Google Calendar / lịch hệ thống (phase 2).
- Lặp lại việc theo tuần (recurring tasks), thống kê, gamification, widget.
- Kế hoạch nhiều ngày — MVP chỉ quản lý **hôm nay** (có thể thêm việc cho ngày mai,
  nhưng view chỉ có Today).

## 3. Kiến trúc

**Stack:** Expo (dev build) + React Native + TypeScript strict, Expo Router,
Zustand, expo-sqlite, expo-notifications, expo-speech (TTS),
expo-speech-recognition (STT — chọn vì được maintain chủ động và tích hợp
chuẩn config plugin của Expo), react-native-reanimated, NativeWind.

```
src/
  core/                 # Pure TypeScript — KHÔNG import React. Unit-test 100%.
    parser/             # Tiếng Việt NL → ParsedTask
    scheduler/          # Thuật toán xếp lịch constraint-based
    reminder/           # Sinh nội dung nhắc nhở có ngữ cảnh (string builder)
  data/                 # SQLite repository + migrations
  services/             # Wrapper quanh expo-notifications, expo-speech, STT
  stores/               # Zustand stores (nối core + data + services vào UI)
  components/           # UI components thuần hiển thị
  app/                  # Expo Router screens (today, settings + add-task sheet)
```

**Nguyên tắc phân lớp:** `core/` không biết gì về React/Expo — nhận input thuần,
trả output thuần. `services/` là lớp mỏng bọc API nền tảng. UI chỉ render state
từ store. Lý do: toàn bộ logic quan trọng test được bằng Jest không cần thiết bị.

## 4. Data model

```typescript
type Task = {
  id: string;               // uuid
  title: string;
  date: string;             // 'YYYY-MM-DD' — ngày việc thuộc về
  durationMin: number;      // mặc định 30 nếu parser không nhận diện được
  kind: 'fixed' | 'flexible';
  fixedStart?: string;      // 'HH:mm' — bắt buộc khi kind = 'fixed'
  deadline?: string;        // 'HH:mm' — chỉ có nghĩa với 'flexible'
  priority: 'normal' | 'high';
  status: 'pending' | 'done' | 'skipped';
  createdAt: number;        // epoch ms
};

// Output của scheduler — không lưu DB, tính lại mỗi lần chạy
type ScheduledBlock = {
  taskId: string;
  start: string;            // 'HH:mm'
  end: string;              // 'HH:mm'
  overflowed: boolean;      // true nếu không nhét vừa trước deadline/cuối ngày
};

type Settings = {
  dayStart: string;         // 'HH:mm', mặc định '07:00'
  dayEnd: string;           // 'HH:mm', mặc định '22:00'
  voiceEnabled: boolean;    // mặc định true
  speechRate: number;       // 0.5–2.0, mặc định 1.0
};
```

SQLite: bảng `tasks` + bảng `settings` (key-value). Schema có version để migrate sau.

## 5. Scheduler (lõi giá trị)

**Input:** danh sách Task của ngày + thời điểm hiện tại + Settings.
**Output:** danh sách ScheduledBlock.

Thuật toán (deterministic, chạy < 10ms cho ≤ 50 việc):

1. Ghim các việc `fixed` còn `pending` vào đúng `fixedStart` của chúng.
2. Tính các khoảng trống (gaps) từ `max(now, dayStart)` đến `dayEnd`,
   trừ đi các block đã ghim.
3. Sắp các việc `flexible` còn `pending` theo khóa:
   deadline sớm hơn trước → priority `high` trước → tạo trước trước.
4. Với từng việc, đặt vào gap sớm nhất đủ chứa `durationMin`;
   nếu có `deadline`, block phải kết thúc trước deadline — không tìm được gap
   thỏa mãn thì đánh dấu `overflowed: true` và xếp vào gap sớm nhất còn lại.
5. Việc `fixed` chồng giờ nhau: giữ nguyên cả hai, UI hiển thị cảnh báo chồng lịch.

**Trigger chạy lại scheduler:** thêm/sửa/xóa việc; đánh dấu done/skipped;
app trở về foreground; qua `fixedStart` của một việc fixed mà chưa done
(coi như trễ → dồn lịch). Mỗi lần chạy lại → hủy toàn bộ notification đã đặt
và đặt lại theo lịch mới (cancel-all-and-reschedule, đơn giản và không bị lệch).

**Edge cases phải có test:** ngày trống; toàn việc fixed; gap nhỏ hơn mọi việc;
deadline đã qua ngay lúc nhập; việc dài hơn cả ngày còn lại; now > dayEnd.

## 6. Nhắc nhở (notification + TTS)

- Mỗi ScheduledBlock (của việc chưa done) đặt một local notification tại `start`.
- **App đang mở:** phát TTS bằng expo-speech, nội dung sinh từ `core/reminder/` —
  có ngữ cảnh, ví dụ: "3 giờ rồi — tới giờ họp nhóm. Sau việc này bạn còn 2 việc
  nữa trước 6 giờ tối." Văn phong tự nhiên như người thật nói, không robotic.
- **App ở background/killed:** notification hệ thống hiển thị text + âm thanh mặc
  định. TTS ở background là giới hạn của nền tảng — chấp nhận trong MVP.
- Android: xin quyền POST_NOTIFICATIONS (API 33+) và exact alarm (API 31+);
  hiển thị hướng dẫn tắt battery optimization cho máy Xiaomi/Oppo/Samsung.

**PoC bắt buộc trước khi build UI** (đây là 2 rủi ro giết dự án nếu fail):
1. Scheduled notification nổ đúng giờ khi app bị kill (test trên Android thật).
2. TTS tiếng Việt của expo-speech đọc được và nghe ổn.

## 7. UI/UX

**Ba màn hình:**

1. **Today** — màn hình chính. Timeline dọc của ngày: block hiện tại nổi bật,
   đường kẻ "bây giờ" di chuyển theo thời gian thực, việc xong mờ đi và gạch.
   Vuốt phải trên block = done, vuốt trái = skip (kèm haptic). Nút thêm việc
   nằm vùng ngón cái với được (bottom). Khi skip/trễ → các block dưới trượt
   lên vị trí mới bằng animation spring (reanimated) — đây là "khoảnh khắc
   nhìn thấy được" của tính năng tự dồn lịch, cần làm mượt nhất có thể.
2. **Add Task** — bottom sheet: một ô text + nút mic. Gõ/nói xong, parser chạy
   ngay và hiện preview dạng chips (thời lượng, giờ, deadline) — user chạm vào
   chip để sửa nếu parser sai. Không form dài dòng.
3. **Settings** — giờ bắt đầu/kết thúc ngày, bật/tắt giọng nói, tốc độ đọc.

**Hướng thẩm mỹ:** ấm, tự nhiên, typography-forward — như sổ tay giấy được số hóa
chứ không phải "AI productivity dashboard". Light mode làm chuẩn trước, dark mode
đầy đủ. Tuân thủ mục Design Principles trong CLAUDE.md (danh sách BANNED patterns).
Copy tiếng Việt do người viết — thân thiện, cụ thể, không văn mẫu marketing.

**Accessibility:** touch target ≥ 44pt/48dp; accessibilityLabel cho mọi nút không
chữ; tôn trọng Reduce Motion (thay spring bằng fade); Dynamic Type không khóa cỡ chữ.

**Bổ sung UI v2 (user duyệt 2026-07-05, sau phản hồi "đơn giản quá"):**
1. Font serif display (Lora) cho tiêu đề — chất editorial sổ tay.
2. Timeline có xương sống: rail dọc + chấm trạng thái (rỗng/đầy-pulse/tick),
   khoảng trống ≥15 phút giữa các việc hiện "trống X phút".
3. Header kể chuyện: "Xong 2/5 việc · còn rảnh 1 tiếng rưỡi" (logic trong core, có test).
4. Block thành card giấy nổi nhẹ trên nền; việc xong co gọn; hiện thời lượng.
5. Micro-interactions: press lún nhẹ, item mới trượt vào, tick khi xong (tôn trọng Reduce Motion).
6. Empty state có chip ví dụ bấm được (thêm việc mẫu ngay).

## 7b. Phase 3 — "Planner Pro" (user duyệt 2026-07-05, gói 5 mục)

1. **Timeline tỷ lệ thật:** thay FlatList bằng canvas cuộn (ScrollView) — block đặt
   absolute, `top = start × pxPerMin`, `height = duration × pxPerMin` (~1.6 px/phút),
   vạch giờ nền, đường "bây giờ" đặt đúng tọa độ thời gian. Toán layout (tọa độ +
   xếp lane khi các việc fixed chồng giờ + minHeight bảo đảm tap target) là hàm
   thuần `layoutDay()` trong core, TDD đầy đủ. Việc xong giữ nguyên vị trí, mờ đi.
   ScrollView hợp lệ ở đây vì canvas ngày là bounded (~≤50 block), không phải long list.
2. **Đếm ngược deadline:** `deadlineStatus(deadline, nowMin)` (core, TDD) →
   {text "còn 1 tiếng 40", level ok/soon/late}; ngưỡng soon = còn ≤2 tiếng,
   late = quá hạn. Chip trên card: muted → accent → danger.
3. **Week strip:** dải 7 ngày đầu màn Today; store thêm `selectedDate`; ngày tương
   lai chạy scheduler với nowMin = dayStart; thêm việc rơi vào ngày đang xem;
   parser hiểu "mai / ngày mai" → tự nhắm ngày +1 (TDD). Chấm mật độ việc mỗi ngày.
4. **Dồn sang hôm nay:** khi mở app có việc pending thuộc ngày cũ → banner
   "Còn X việc chưa xong từ hôm trước" + nút chuyển tất cả sang hôm nay (đổi date).
5. **Nhãn màu:** cú pháp `#nhãn` trong input (parser tách, TDD); cột `tag` thêm vào
   SQLite qua migration v2 (PRAGMA user_version); màu gán từ palette ấm 6 màu cố
   định theo hash tên nhãn (core `tagColor()`, TDD); UI: vạch màu trái card + tên
   nhãn trong meta. Lọc theo nhãn để Phase 4.

**Notification đa ngày:** kế hoạch notification mở rộng cửa sổ hôm nay + ngày mai;
tôn trọng giới hạn 64 notification chờ của iOS (ưu tiên các việc sớm nhất).

## 8. Error handling

- Parser không hiểu input → không chặn: tạo việc flexible 30 phút với title là
  nguyên văn, user sửa bằng chips. Parser sai không bao giờ làm mất dữ liệu nhập.
- Quyền notification bị từ chối → app vẫn hoạt động đầy đủ như planner câm,
  banner nhẹ giải thích cách bật lại. Quyền mic bị từ chối → chỉ còn nhập gõ.
- STT lỗi/không khả dụng → fallback về bàn phím, không crash.
- SQLite lỗi ghi → hiển thị lỗi rõ ràng, không nuốt lỗi im lặng.

## 8b. Nền tảng & chiến lược kiểm thử thiết bị

Bối cảnh: máy dev là Windows, thiết bị cá nhân của user là **iPhone XS (iOS 18.2,
không lên được nữa)** — Expo Go trên máy này chỉ hỗ trợ tối đa SDK 54, nên dự án
**ghim Expo SDK 54** trong quá trình phát triển (quyết định 2026-07-05, user duyệt);
sẽ nâng SDK mới nhất một lần trước khi deploy store. App build chính thức vẫn chạy
tốt trên iOS 18.2 — giới hạn chỉ nằm ở công cụ Expo Go.

- **Vòng lặp dev chính:** Expo Go trên iPhone (qua QR/LAN — không cần Mac)
  + Android emulator trên Windows. Code luôn viết platform-neutral bằng API
  Expo cross-platform; khác biệt nền tảng xử lý bằng `Platform.select` từ đầu.
- **iOS là nền tảng thuận lợi** cho app này: local notification do hệ thống quản
  lý nên đúng giờ gần như tuyệt đối. Rủi ro notification (mục 11) chủ yếu ở Android.
- **STT là native module** — dự kiến không chạy được trong Expo Go, cần development
  build. Thiết kế: service STT nằm sau interface + capability check khi runtime
  không có module thì nút mic ẩn đi, nhập gõ vẫn đầy đủ. Verify chính xác trong PoC.
- **Giới hạn của Expo Go với notification** (nếu PoC phát hiện) → chuyển sang
  development build qua EAS: build Android cài emulator/máy thật thoải mái;
  build iOS lên iPhone thật cần Apple Developer Program ($99/năm) — chấp nhận
  test iOS qua Expo Go trong MVP nếu chưa có tài khoản.
- **Publish sau này:** Google Play $25 một lần; App Store $99/năm.

## 9. Testing

- **TDD bắt buộc cho `src/core/`** (parser, scheduler, reminder): Jest, coverage
  các edge case ở mục 5. Đây là nơi chứa gần như toàn bộ độ phức tạp.
- `data/` test bằng SQLite in-memory.
- `services/` (notification, TTS, STT) là wrapper mỏng — xác minh bằng PoC thủ công
  trên thiết bị, không unit-test API của Expo.
- UI: kiểm tra thủ công theo checklist mobile-uiux-promax trong MVP;
  component test bổ sung sau khi UI ổn định.

## 10. Tiêu chí thành công của MVP

1. Nhập "họp nhóm 3h chiều 1 tiếng, tập gym 45 phút, nộp báo cáo trước 6h" (gõ
   hoặc nói) → lịch ngày hợp lệ xuất hiện, đúng ràng buộc, không cần sửa tay.
2. Đánh skip một việc → các block còn lại tự dồn trong < 1 giây, có animation mượt.
3. App bị kill, tới giờ việc → notification vẫn nổ đúng giờ (±1 phút) trên
   Android thật.
4. App đang mở, tới giờ việc → TTS đọc câu nhắc tiếng Việt tự nhiên.
5. `src/core/` đạt 100% test pass, không dùng `any`, không dead code.

## 11. Rủi ro còn mở

| Rủi ro | Mức | Ứng phó |
|---|---|---|
| OEM Android giết scheduled notification | Cao | PoC tuần đầu; hướng dẫn whitelist; chấp nhận giới hạn nếu OEM chặn triệt để |
| TTS tiếng Việt chất lượng kém trên một số máy | Trung | PoC sớm; fallback: notification text vẫn đầy đủ thông tin |
| Parser tiếng Việt sai nhiều | Trung | Chips sửa nhanh ngay trong Add Task; mở rộng test case theo lỗi thật |
| STT tiếng Việt độ chính xác thấp | Thấp | Chỉ là 1 trong 2 cách nhập; gõ luôn khả dụng |
