import { tagColor, TAG_PALETTE } from '../tagColor';

test('deterministic for same tag', () => {
  expect(tagColor('học')).toBe(tagColor('học'));
});

test('returns a palette color', () => {
  expect(TAG_PALETTE).toContain(tagColor('bất kỳ nhãn nào'));
  expect(TAG_PALETTE).toContain(tagColor('x'));
});
