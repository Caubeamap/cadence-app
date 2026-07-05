import { parseTask } from '../parser/parseTask';

test('plain text -> flexible 30min task', () => {
  expect(parseTask('đọc sách')).toEqual({
    title: 'đọc sách', durationMin: 30, kind: 'flexible', priority: 'normal',
  });
});

test('duration in tieng', () => {
  expect(parseTask('tập gym 1 tiếng')).toMatchObject({ title: 'tập gym', durationMin: 60 });
});

test('tieng ruoi', () => {
  expect(parseTask('học bài 1 tiếng rưỡi')).toMatchObject({ durationMin: 90 });
});

test('duration in phut', () => {
  expect(parseTask('thiền 15 phút')).toMatchObject({ title: 'thiền', durationMin: 15 });
});

test('fixed time with buoi', () => {
  expect(parseTask('họp nhóm lúc 3h chiều')).toMatchObject({
    title: 'họp nhóm', kind: 'fixed', fixedStart: '15:00',
  });
});

test('24h time', () => {
  expect(parseTask('họp 15h')).toMatchObject({ kind: 'fixed', fixedStart: '15:00' });
});

test('time with minutes', () => {
  expect(parseTask('đón con 17h30')).toMatchObject({ kind: 'fixed', fixedStart: '17:30' });
});

test('gio chieu form', () => {
  expect(parseTask('ăn tối 7 giờ tối')).toMatchObject({ kind: 'fixed', fixedStart: '19:00' });
});

test('truoc -> deadline, stays flexible', () => {
  expect(parseTask('nộp báo cáo trước 5h chiều')).toMatchObject({
    title: 'nộp báo cáo', kind: 'flexible', deadline: '17:00',
  });
});

test('duration + fixed time together', () => {
  expect(parseTask('họp nhóm lúc 3h chiều 1 tiếng')).toMatchObject({
    kind: 'fixed', fixedStart: '15:00', durationMin: 60,
  });
});

test('priority keyword', () => {
  expect(parseTask('nộp đơn gấp')).toMatchObject({ title: 'nộp đơn', priority: 'high' });
});

test('priority keyword with non-ascii start', () => {
  expect(parseTask('gọi điện cho khách ưu tiên')).toMatchObject({
    title: 'gọi điện cho khách', priority: 'high',
  });
});

test('unparseable stays safe', () => {
  expect(parseTask('!!!')).toMatchObject({ title: '!!!', durationMin: 30, kind: 'flexible' });
});
