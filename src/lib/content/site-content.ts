export type SizeGuideRow = { size: string; age: string; weight: string; height: string };
export type SizeGuide = { baby: SizeGuideRow[]; kids: SizeGuideRow[]; tips: string[] };
export type HomeFeature = { id: string; src: string; icon: string; title: string;
  description: string; objectPosition: string };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid site content');
  return value as Record<string, unknown>;
}

function contentText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid site content text');
  return value;
}

function imageUrl(value: unknown): string {
  const src = contentText(value, 500);
  if (/^\/images\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp|avif)$/.test(src) && !src.includes('..')) return src;
  try {
    const url = new URL(src);
    if (url.protocol === 'https:' && ['res.cloudinary.com', 'i.ibb.co'].includes(url.hostname)) return url.toString();
  } catch { /* invalid URL */ }
  throw new Error('Invalid site content image');
}

export function parseHomeFeatures(value: unknown): HomeFeature[] {
  if (!Array.isArray(value) || value.length > 12) throw new Error('Invalid home features');
  const features = value.map((item): HomeFeature => {
    const row = record(item);
    const objectPosition = contentText(row.objectPosition, 40);
    if (!/^(?:left|center|right|\d{1,3}%)(?: (?:top|center|bottom|\d{1,3}%))?$/.test(objectPosition)) {
      throw new Error('Invalid feature image position');
    }
    return { id: contentText(row.id, 60), src: imageUrl(row.src),
      icon: contentText(row.icon, 12), title: contentText(row.title, 100),
      description: contentText(row.description, 500), objectPosition };
  });
  if (new Set(features.map((item) => item.id)).size !== features.length) throw new Error('Duplicate feature id');
  return features;
}

export function parseSizeGuide(value: unknown): SizeGuide {
  const data = record(value);
  const rows = (input: unknown): SizeGuideRow[] => {
    if (!Array.isArray(input) || input.length > 30) throw new Error('Invalid size guide rows');
    return input.map((item) => {
      const row = record(item);
      return { size: contentText(row.size, 50), age: contentText(row.age, 100),
        weight: contentText(row.weight, 100), height: contentText(row.height, 100) };
    });
  };
  if (!Array.isArray(data.tips) || data.tips.length > 20) throw new Error('Invalid size guide tips');
  return { baby: rows(data.baby), kids: rows(data.kids),
    tips: data.tips.map((tip) => contentText(tip, 500)) };
}
