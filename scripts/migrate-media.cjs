/**
 * Chuyển mọi ảnh đang dùng trong database lên Cloudinary và ghi vào thư viện media.
 * - Ảnh còn sót dạng /images/... được đọc từ thư mục public nếu tệp vẫn tồn tại
 *   (ảnh tĩnh đã được xóa khỏi repo sau khi chuyển lên Cloudinary).
 * - Ảnh nguồn ngoài hoặc ảnh thuộc tài khoản Cloudinary khác được tải về rồi tải lên lại.
 * - Ảnh đã nằm trên Cloudinary hiện tại được giữ nguyên.
 * Chạy lại nhiều lần vẫn an toàn: mỗi ảnh nguồn chỉ tải lên một lần.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const { File } = require('node:buffer');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;

const MIME_BY_EXTENSION = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif' };
const IMAGE_PATTERN = /\.(?:jpg|jpeg|png|webp|avif)(?:\?.*)?$/i;

function isLocalPath(value) { return typeof value === 'string' && value.startsWith('/images/'); }
function isCloudinary(value) { return typeof value === 'string' && value.startsWith(`https://res.cloudinary.com/${cloud}/`); }
function looksLikeImage(value) {
  return typeof value === 'string' && IMAGE_PATTERN.test(value) && (isLocalPath(value) || /^https:\/\//.test(value));
}

async function uploadBuffer(buffer, filename, mimeType) {
  const form = new FormData();
  form.set('file', new File([buffer], filename, { type: mimeType }));
  form.set('folder', 'tpetie/site');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    body: form,
  });
  if (!response.ok) throw new Error(`Cloudinary ${response.status}: ${(await response.text()).slice(0, 160)}`);
  return response.json();
}

const cache = new Map();
let uploaded = 0;
let skipped = 0;

async function toCloudinary(source) {
  if (cache.has(source)) return cache.get(source);
  if (isCloudinary(source)) { cache.set(source, source); skipped += 1; return source; }
  let buffer; let filename; let mimeType;
  if (isLocalPath(source)) {
    const filePath = path.join(process.cwd(), 'public', source);
    if (!fs.existsSync(filePath)) { console.warn(`  ! thiếu tệp ${source}, giữ nguyên`); cache.set(source, source); return source; }
    buffer = fs.readFileSync(filePath);
    filename = path.basename(source);
    mimeType = MIME_BY_EXTENSION[path.extname(filename).toLowerCase()] || 'image/jpeg';
  } else {
    const response = await fetch(source);
    if (!response.ok) { console.warn(`  ! không tải được ${source} (${response.status}), giữ nguyên`); cache.set(source, source); return source; }
    buffer = Buffer.from(await response.arrayBuffer());
    filename = path.basename(new URL(source).pathname) || 'image.jpg';
    mimeType = response.headers.get('content-type')?.split(';')[0] || MIME_BY_EXTENSION[path.extname(filename).toLowerCase()] || 'image/jpeg';
  }
  const result = await uploadBuffer(buffer, filename, mimeType);
  await prisma.mediaAsset.upsert({ where: { url: result.secure_url }, update: {},
    create: { url: result.secure_url, publicId: result.public_id, folder: 'tpetie/site',
      width: result.width || null, height: result.height || null, bytes: result.bytes || null,
      format: result.format || null, altText: filename.replace(/\.[^.]+$/, '') } });
  uploaded += 1;
  cache.set(source, result.secure_url);
  return result.secure_url;
}

async function mapDeep(value) {
  if (typeof value === 'string') return looksLikeImage(value) ? await toCloudinary(value) : value;
  if (Array.isArray(value)) { const rows = []; for (const item of value) rows.push(await mapDeep(item)); return rows; }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [field, item] of Object.entries(value)) result[field] = await mapDeep(item);
    return result;
  }
  return value;
}

async function main() {
  if (!cloud || !key || !secret) throw new Error('Thiếu cấu hình Cloudinary trong .env');
  const ping = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` } });
  if (!ping.ok) throw new Error(`Cloudinary từ chối thông tin đăng nhập (${ping.status}). Cập nhật .env trước khi chạy.`);

  const collections = await prisma.collection.findMany();
  for (const collection of collections) {
    const bannerUrl = await toCloudinary(collection.bannerUrl);
    const lookbookUrls = [];
    for (const url of collection.lookbookUrls) lookbookUrls.push(await toCloudinary(url));
    if (bannerUrl !== collection.bannerUrl || lookbookUrls.some((url, index) => url !== collection.lookbookUrls[index])) {
      await prisma.collection.update({ where: { id: collection.id }, data: { bannerUrl, lookbookUrls } });
      console.log(`  ✓ bộ sưu tập ${collection.slug}`);
    }
  }

  const images = await prisma.productImage.findMany();
  for (const image of images) {
    const url = await toCloudinary(image.url);
    if (url !== image.url) await prisma.productImage.update({ where: { id: image.id }, data: { url } });
  }
  console.log(`  ✓ ${images.length} ảnh sản phẩm`);

  const rows = await prisma.siteContent.findMany();
  for (const row of rows) {
    const data = await mapDeep(row.data);
    if (JSON.stringify(data) !== JSON.stringify(row.data)) {
      await prisma.siteContent.update({ where: { key: row.key }, data: { data } });
      console.log(`  ✓ nội dung ${row.key}`);
    }
  }

  console.log(`Hoàn tất: ${uploaded} ảnh tải lên Cloudinary, ${skipped} ảnh đã ở Cloudinary.`);
}

main().catch((error) => { console.error(`Lỗi: ${error.message}`); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
