/**
 * Nhận diện ảnh theo vài byte đầu tệp, không tin loại MIME do trình duyệt khai báo.
 * Mặc định chỉ nhận JPEG, PNG và WebP — các định dạng ảnh đánh giá sau khi nén ở trình duyệt;
 * thư viện media của shop nhận thêm AVIF (`allowAvif`).
 */
export function detectImageType(bytes: Uint8Array, allowAvif = false): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) {
    return 'image/png';
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (allowAvif && bytes.length >= 12 && ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif';
  return null;
}
