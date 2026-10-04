/** Màu nền mặc định của bộ sưu tập chưa chọn màu: cream-100 của giao diện hồng (globals.css). */
export const DEFAULT_THEME_COLOR = '#FFF7FA';
/** Màu nhấn mặc định: honey-600 của giao diện hồng. */
export const DEFAULT_ACCENT_COLOR = '#BE4C7B';
/** Màu nhấn dự phòng (honey-700) khi màu quản trị viên chọn quá nhạt để đọc trên nền hồng nhạt. */
const FALLBACK_ACCENT = '#A63E69';
const PAGE_BACKGROUND = DEFAULT_THEME_COLOR;

/** Màu nền gợi ý trong trang quản trị: tông nhạt, hiện sau banner trong lúc ảnh đang tải. */
export const THEME_COLOR_PRESETS = [
  { value: DEFAULT_THEME_COLOR.toLowerCase(), name: 'Hồng kem' }, { value: '#ffffff', name: 'Trắng' }, { value: '#ffebeb', name: 'Hồng phấn' },
  { value: '#fde8ef', name: 'Hồng nhạt' }, { value: '#f5ebe1', name: 'Be cát' }, { value: '#eaf4ec', name: 'Xanh bạc hà' },
  { value: '#e8f1fa', name: 'Xanh da trời' }, { value: '#f1ecfa', name: 'Tím oải hương' },
] as const;

/** Màu nhấn gợi ý: đều đạt tương phản 3:1 trên nền hồng nhạt nên trang hiện đúng màu đã chọn. */
export const ACCENT_COLOR_PRESETS = [
  { value: DEFAULT_ACCENT_COLOR.toLowerCase(), name: 'Hồng sen' }, { value: FALLBACK_ACCENT.toLowerCase(), name: 'Hồng mận' },
  { value: '#b8434f', name: 'Hồng đất' }, { value: '#d97706', name: 'Cam mật ong' }, { value: '#4b834e', name: 'Xanh rêu' },
  { value: '#2f6690', name: 'Xanh biển' }, { value: '#6d4c9f', name: 'Tím mận' }, { value: '#2d3142', name: 'Than chì' },
] as const;

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
