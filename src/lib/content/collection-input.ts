type CollectionInput = {
  title: string; slug: string; bannerUrl: string; subtitle: string | null; story: string | null;
  season: string | null; badge: string | null; lookbookUrls: string[];
  themeColor: string | null; accentColor: string | null; sortOrder: number;
  isActive: boolean; showInMenu: boolean; showOnHome: boolean;
};

function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && value.trim().length < 2)) {
    throw new Error('Nội dung bộ sưu tập không hợp lệ');
  }
  return value.trim() || null;
}

function imageUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 500) throw new Error('URL ảnh không hợp lệ');
  if (/^\/images\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(value) && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && ['res.cloudinary.com', 'i.ibb.co'].includes(url.hostname)) return url.toString();
  } catch { /* invalid URL */ }
  throw new Error('URL ảnh không hợp lệ');
}

function color(value: unknown): string | null {
  if (value === '' || value === null) return null;
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error('Màu hiển thị không hợp lệ');
  return value;
}

export function parseCollectionInput(raw: unknown): CollectionInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dữ liệu bộ sưu tập không hợp lệ');
  const input = raw as Record<string, unknown>;
  if (typeof input.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 100) {
    throw new Error('Slug bộ sưu tập không hợp lệ');
  }
  if (!Array.isArray(input.lookbookUrls) || input.lookbookUrls.length > 12) throw new Error('Ảnh lookbook không hợp lệ');
  if (!Number.isInteger(input.sortOrder) || Number(input.sortOrder) < 0 || Number(input.sortOrder) > 999) {
    throw new Error('Thứ tự bộ sưu tập không hợp lệ');
  }
  for (const flag of ['isActive', 'showInMenu', 'showOnHome']) {
    if (typeof input[flag] !== 'boolean') throw new Error('Cấu hình hiển thị không hợp lệ');
  }
  return {
    title: text(input.title, 100, true)!, slug: input.slug,
    bannerUrl: imageUrl(input.bannerUrl),
    subtitle: text(input.subtitle, 200), story: text(input.story, 5000),
    season: text(input.season, 100), badge: text(input.badge, 80),
    lookbookUrls: input.lookbookUrls.map(imageUrl),
    themeColor: color(input.themeColor), accentColor: color(input.accentColor),
    sortOrder: Number(input.sortOrder), isActive: input.isActive as boolean,
    showInMenu: input.showInMenu as boolean, showOnHome: input.showOnHome as boolean,
  };
}
