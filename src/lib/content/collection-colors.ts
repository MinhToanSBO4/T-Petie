/** Màu nhấn dự phòng (honey-700) khi màu quản trị viên chọn quá nhạt để đọc trên nền kem. */
const FALLBACK_ACCENT = '#B45309';
const PAGE_BACKGROUND = '#FFF8EE';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Màu nhấn của bộ sưu tập dùng cho chữ lớn (số chương) trên nền kem. Màu do quản trị viên chọn thay đổi theo
 * mùa nên có thể rất nhạt (vàng chanh, hồng phấn...): dưới mức tương phản 3:1 thì dùng màu dự phòng.
 */
export function readableAccent(color: string | null | undefined): string {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return FALLBACK_ACCENT;
  const [light, dark] = [luminance(PAGE_BACKGROUND), luminance(color)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05) >= 3 ? color : FALLBACK_ACCENT;
}
