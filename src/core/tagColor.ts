export const TAG_PALETTE = ['#C2703D', '#7D8B4E', '#5E7F99', '#9A6B8F', '#B08830', '#7A9E87'];

export function tagColor(tag: string): string {
  let sum = 0;
  for (const ch of tag) sum = (sum + ch.codePointAt(0)!) % TAG_PALETTE.length;
  return TAG_PALETTE[sum];
}
