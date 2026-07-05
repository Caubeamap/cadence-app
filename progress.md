# Progress Log — Cadence

Nhật ký tiến trình dự án. Mỗi phiên làm việc thêm một mục mới ở dưới cùng.

---

## 2026-07-04 → 2026-07-05 — Nghiên cứu & chốt ý tưởng

**Đã làm:**
- Nghiên cứu xu hướng thị trường mobile app 2026 (AI on-device, retention-first,
  subscription; thị trường VN: ~79 triệu người dùng mobile internet, PDPA 2026).
- Đề xuất và sàng lọc 4 ý tưởng → chốt hướng **day planner tự sắp lịch + nhắc bằng giọng nói**.
- Phân tích trade-off "voice reminder đơn thuần" vs "AI planner": chốt AI planner
  với ràng buộc **$0 chi phí vận hành** — engine sắp lịch là thuật toán constraint-based
  (không phải LLM), nhập liệu bằng parser tiếng Việt tự viết + STT của OS,
  nhắc nhở bằng TTS (expo-speech). Toàn bộ local, không backend.
- Chốt tên sản phẩm **Cadence**, tạo repo `cadence-app` (github.com/Caubeamap/cadence-app).

**Phạm vi MVP đã thống nhất:**
Nhập việc (gõ + nói) → thuật toán tự xếp lịch trong ngày → tới giờ, TTS đọc nhắc
nhở có ngữ cảnh → nếu bỏ/trễ một việc, tự dồn lịch còn lại. Tất cả chạy local, free.

**Rủi ro kỹ thuật đã xác định (cần PoC sớm):**
1. Độ tin cậy notification trên Android (Xiaomi/Oppo/Samsung giết background task).
2. TTS khi app ở background — giới hạn nền tảng, cần xác nhận bằng PoC.
3. Độ chính xác parser tiếng Việt ("mai", "chiều", "trước 5h"...).

## 2026-07-05 — Thiết lập nền tảng dự án

**Đã làm:**
- Đọc và nắm toàn bộ `.agent/`: rules (git-policy với `auto_commit: false`,
  debug-confirmation, language-matching, file-length, scratch-scripts),
  skills (mobile-developer, mobile-uiux-promax, brainstorming, writing-plans,
  test-driven-development, verification-before-completion), workflows.
- Tạo `CLAUDE.md` tổng hợp rules bắt buộc: không tự commit, không kill process,
  workflow superpowers, chuẩn code sạch, nguyên tắc thiết kế tự nhiên không AI hóa.
- Tạo `progress.md` (file này).
- Viết design spec MVP: `docs/superpowers/specs/2026-07-05-cadence-mvp-design.md`.

**Bước tiếp theo:**
- User review design spec → viết implementation plan (`docs/superpowers/plans/`)
  → scaffold Expo project → PoC 2 rủi ro lớn nhất (notification + TTS, scheduler).

## 2026-07-05 — Spec được duyệt, nghiên cứu kỹ thuật, viết plan Phase 1

**Đã làm:**
- User duyệt spec. Thông tin mới: user dùng iPhone (máy dev Windows) → cập nhật
  spec mục 8b: vòng lặp dev chính là Expo Go trên iPhone + Android emulator.
- Subagent kiểm chứng ecosystem (07/2026): Expo SDK 57 (RN 0.86, New Arch bắt buộc);
  local notification, expo-speech (vi-VN), expo-sqlite, Reanimated 4 đều chạy trong
  Expo Go cả iOS/Android; chỉ STT (expo-speech-recognition) cần development build
  → STT lùi sang Phase 3, thiết kế sau interface như spec.
- Viết implementation plan Phase 1:
  `docs/superpowers/plans/2026-07-05-cadence-mvp-phase1.md` — 10 task:
  scaffold SDK 57 → Jest/TS strict → TDD core (time, gaps, scheduler, parser
  tiếng Việt, reminder builder) → service wrappers → PoC screen (notification
  + TTS trên iPhone) → wrap-up. Phase 2: SQLite + stores + UI. Phase 3: STT + polish.

**Bước tiếp theo:** thực thi plan Phase 1 theo subagent-driven-development.

## 2026-07-05 — Thực thi Phase 1 (Task 0 → 8)

**Đã làm:**
- Task 0+1 (subagent): scaffold Expo SDK 57 (RN 0.86, New Arch) merge vào repo
  không rỗng; Jest (jest-expo) + TS strict; dọn template. expo-doctor 20/20.
- Review Task 0+1 (subagent): spec pass; sửa 7 finding — README ghi lại UTF-8
  (trước đó UTF-16 hỏng trên GitHub), xóa LICENSE copy nhầm của Expo, xóa 9+ ảnh
  template thừa, bỏ dòng `example` trong .gitignore, bỏ script lint chưa có
  config, thêm @types/node devDep. AGENTS.md giữ (file chủ đích của template).
- Task 2+3 (subagent, TDD): `core/time.ts`, `core/types.ts`, `core/scheduler/gaps.ts`.
- Task 4 (subagent bị ngắt do hết token giữa chừng nhưng đã hoàn thành file;
  verify độc lập khớp plan): `core/scheduler/schedule.ts` — thuật toán xếp lịch.
- Task 5+6 (inline, TDD): `core/parser/parseTask.ts` (tiếng Việt: tiếng/phút/
  rưỡi, giờ + buổi, "trước X" = deadline, từ khóa ưu tiên — thêm test case
  "ưu tiên" vì `\b` regex không hoạt động cạnh ký tự có dấu), `core/reminder/buildReminder.ts`.
- Task 7+8 (inline): `services/notifications.ts`, `services/tts.ts`,
  PoC screen `app/index.tsx` (thử notification 15s + TTS vi-VN).

**Trạng thái verify:** `npm test` 35/35 pass (5 suites), `npx tsc --noEmit` exit 0.
Mọi bước TDD đều có bằng chứng RED trước GREEN.

**Quyết định:**
- STT lùi Phase 3 (cần dev build, không chạy trong Expo Go).
- NativeWind/Reanimated/SQLite lùi Phase 2 theo plan.
- Chờ user chọn license (MIT dưới tên user, hay không license).

**Chờ user:** chạy PoC trên iPhone (Expo Go): notification khi khóa máy /
khi kill app, chất lượng TTS tiếng Việt. Kết quả sẽ ghi vào đây.

**Bước tiếp theo:** PoC pass → viết plan Phase 2 (SQLite + stores + UI Today/AddTask).

## 2026-07-05 — Hạ SDK 57 → 54 (tương thích iPhone của user)

**Vấn đề:** Expo Go trên iPhone XS (iOS 18.2, không update được nữa) chỉ hỗ trợ
tối đa SDK 54 → project SDK 57 báo "incompatible" khi quét QR.

**Quyết định (user duyệt Phương án A):** ghim SDK 54 trong lúc phát triển để
chạy thử miễn phí trên iPhone thật; nâng SDK trước khi deploy store. App build
chính thức không bị ảnh hưởng bởi giới hạn này (iOS 18.2 vẫn được hỗ trợ).

**Đã làm:**
- app.json: bỏ `ios.icon` (định dạng Icon Composer của SDK 57), xóa `assets/expo.icon`.
- package.json: expo ~54.0.0, RN 0.81.5, react 19.1.0; version từng package do
  `npx expo install` tự chọn (expo-router 6.0.24, expo-notifications 0.32.17,
  expo-speech 14.0.8, reanimated 4.1.1...); jest-expo ~54, typescript ~5.9.2.
- Tỉa 8 dependency template không dùng (@expo/ui, expo-glass-effect, expo-image,
  expo-symbols, expo-web-browser, expo-device, expo-font, expo-system-ui).

**Verify:** expo-doctor 18/18 pass; npm test 35/35 pass; tsc exit 0.

**Chờ user:** quét lại QR bằng Expo Go hiện có → chạy 4 mục PoC.

## 2026-07-05 — PoC PASS trên iPhone XS, nâng cấp giọng đọc. PHASE 1 HOÀN TẤT.

**Kết quả PoC (user xác nhận trên iPhone XS, iOS 18.2, Expo Go SDK 54):**
- Notification hẹn giờ: hoạt động ổn định. ✅
- TTS tiếng Việt: hoạt động ổn định. ✅
- → 2 rủi ro lớn nhất của dự án đã được loại bỏ trên iOS.

**Nâng cấp giọng đọc (yêu cầu user):**
- `services/tts.ts`: tự dò danh sách giọng, ưu tiên giọng tiếng Việt chất lượng
  Enhanced nếu máy đã tải; cache lựa chọn; PoC screen hiển thị tên giọng đang dùng.
- Hướng dẫn user tải giọng Linh bản Nâng cao (Cài đặt → Trợ năng → Nội dung
  được đọc → Giọng nói → Tiếng Việt).
- Verify: tsc exit 0, 35/35 test pass.

**Phase 1 chốt:** core engine (scheduler + parser + reminder) 35 test xanh,
notification + TTS chạy thật trên thiết bị đích. Còn chờ user chọn license.

**Bước tiếp theo:** viết plan Phase 2 — SQLite + stores + UI Today/AddTask/Settings
(hướng thẩm mỹ "sổ tay ấm" theo spec mục 7), Android emulator setup song song.

## 2026-07-05 — Phase 2: data + stores + UI hoàn chỉnh (code xong, chờ user test)

**Plan:** `docs/superpowers/plans/2026-07-05-cadence-mvp-phase2.md`.

**Đã làm (TDD cho core, inline execution):**
- P2-1..3 (TDD): `core/selectors.ts` (currentBlock/pendingAfter/nextDeadlineAfter),
  `core/scheduler/shouldReschedule.ts` (chỉ dồn lịch khi block flexible quá hạn,
  không dồn khi đang làm dở), `core/reminder/notificationPlan.ts` (blocks → danh
  sách notification). `core/date.ts` + `core/id.ts`.
- P2-4: data layer expo-sqlite (`db.ts` migrate, `taskRepo`, `settingsRepo`).
- P2-5: `services/notifications.ts` viết lại: syncScheduledReminders
  (cancel-all-and-reschedule, DATE trigger), onNotificationReceived → TTS khi
  app mở. Xin quyền notification lúc khởi động (_layout).
- P2-6: Zustand stores (`useDayStore` load/tick/addFromText/updateStatus/remove,
  `useSettingsStore` persist qua settingsRepo).
- P2-7/8: theme tokens "sổ tay ấm" (light+dark), TimelineItem (swipe phải=Xong
  trái=Bỏ qua, haptics), NowDivider, EmptyDay, ParsedPreview chips; màn Today
  (timeline + dòng "bây giờ" + layout animation spring, tôn trọng Reduce Motion),
  Add Task (parse trực tiếp khi gõ), Settings (giờ ngày, giọng nói, tốc độ đọc).

**Quyết định:**
- Bỏ NativeWind (StyleSheet + tokens — ít dep, kiểm soát design tốt hơn). Ghi trong plan.
- Tắt experiment typedRoutes (type tự sinh stale làm hỏng tsc gate; app 3 route
  không cần) — xóa .expo/types cũ.
- `src/data/` không unit-test (expo-sqlite là native module, không chạy được
  trong Jest; repo giữ mỏng, logic nằm hết ở core đã test).

**Verify:** npm test 51/51 pass (10 suites); tsc exit 0; expo-doctor 18/18.

**Chờ user (device checklist trên iPhone qua Expo Go):** thêm 3 việc (1 fixed,
1 deadline) → lịch xếp đúng; swipe Xong/Bỏ qua → dồn lịch có animation;
notification đến đúng giờ; giọng đọc khi app mở; dark mode; Reduce Motion.

**Bước tiếp theo:** user test → sửa theo phản hồi → Phase 3 (STT dev build,
chip sửa trực tiếp, polish). Vẫn chờ user chọn license.

## 2026-07-05 — UI v2: nâng cấp giao diện (user feedback "đơn giản quá", duyệt gói 6 mục)

**User xác nhận Phase 2 chạy ổn trên iPhone**, feedback: giao diện quá đơn giản.
Gói nâng cấp 6 mục được đề xuất và duyệt (ghi trong spec §7 "Bổ sung UI v2").

**Đã làm:**
- TDD core mới: `core/daySummary.ts` (formatDuration tiếng Việt + summarizeDay
  "Xong 2/5 việc · còn rảnh 13 tiếng", tái dùng computeGaps), `core/timelineGaps.ts`
  (chèn item "trống X phút" khi gap ≥15'). +9 test.
- Font Lora (expo-font + @expo-google-fonts/lora), load trong _layout với splash.
- Timeline rail: cột ray dọc + chấm trạng thái (rỗng=chưa tới, PulseDot cam
  pulse=đang diễn ra — tôn trọng Reduce Motion, đầy=xong, rỗng mờ=bỏ qua);
  block pending = card giấy nổi nhẹ (surface + hairline + shadow 0.05);
  việc xong/bỏ qua co thành dòng compact gạch ngang; GapRow hiện khoảng trống.
- Header: "Hôm nay" Lora serif 30 + dòng tổng quan từ summarizeDay.
- EmptyDay: 3 chip ví dụ bấm được → addFromText + haptic.
- Micro-interactions: nút press scale 0.98, item mới FadeInDown spring,
  itemLayoutAnimation giữ nguyên. ParsedPreview dùng formatDuration.
- Dọn dead code: xóa type.title không còn dùng.

**Verify:** npm test 60/60 pass (12 suites); tsc exit 0; expo-doctor 18/18.

**Chờ user:** reload app trên iPhone, đánh giá lại giao diện + checklist cũ.
