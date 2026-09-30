/**
 * Tạo cấu hình nội dung khởi tạo trong database, chỉ chạy một lần cho khóa còn thiếu.
 * Script không ghi đè cấu hình mà quản trị viên đã sửa.
 * Các trường ảnh để trống: ảnh được tải lên thư viện media tại /admin/content,
 * không còn đường dẫn tĩnh nào trong mã nguồn.
 */
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const homeFeaturesDefaults = {
  eyebrow: 'Chất Lượng Là Danh Dự',
  title: "Những điều làm nên sự khác biệt của T'Petie",
};

const content = {
  home_hero: {
    shopLabel: 'Mua Sắm Ngay', shopHref: '/girls',
    lookbookLabel: 'Xem Lookbook', lookbookHref: '/collections',
    defaultBadge: 'Bộ sưu tập',
  },
  home_sections: {
    bestSellers: { title: 'Sản Phẩm Bán Chạy Nhất', linkLabel: 'Khám phá thêm', linkHref: '/girls' },
    sale: { title: 'Sản phẩm đang ưu đãi', linkLabel: 'Xem tất cả →', linkHref: '/sale' },
    collections: { eyebrow: 'Chuyện Của Mùa', title: 'Bộ Sưu Tập Nổi Bật', linkLabel: 'Xem Lookbook', linkHref: '/collections' },
  },
  testimonials_section: { eyebrow: 'Lời chia sẻ của khách hàng', title: "Mẹ nói gì về T'Petie?" },
  brand_assets: { logoUrl: '', logoAlt: "T'Petie - Made for little souls" },
  sale_page: {
    bannerUrl: '', bannerAlt: "Ưu đãi T'Petie",
    title: 'Ưu đãi cho bé yêu', description: 'Giá và số lượng được cập nhật từ cửa hàng.',
  },
  about_page: {
    heroImageUrl: '', heroImageAlt: "Học Xinh - T'Petie",
    heroTitle: 'Made for little souls.',
    heroDescription: 'Chúng tôi tạo ra những thiết kế nhẹ nhàng, tinh tế và tự nhiên — nơi quần áo đồng hành cùng những ngày tháng rất thật của một đứa trẻ.',
    ctaTitle: "Cùng T'Petie Nâng Niu Tuổi Thơ Của Con 🌸",
    ctaDescription: 'Mời ba mẹ ghé thăm các bộ sưu tập mới nhất để chọn cho bé những món đồ nhẹ nhàng và thoải mái nhất.',
    ctaLabel: 'XEM BỘ SƯU TẬP', ctaHref: '/collections',
  },
  category_pages: { items: [
    { id: 'girls', imageUrl: '', imageAlt: '', title: 'Thời Trang Bé Gái Ngọt Ngào 🌸',
      description: 'Tổng hợp tất cả các mẫu váy công chúa voan tơ, áo sơ mi cổ sen thêu tay và set bộ thô đũi organic cao cấp cho bé gái từ 1 đến 5 tuổi.' },
    { id: 'tops', imageUrl: '', imageAlt: '', title: 'Áo Sơ Mi & Áo Kiểu Bé Gái 👚',
      description: 'Thiết kế cổ sen thêu hoa, tay phồng babydoll xinh xắn từ chất vải cotton tự nhiên thoáng mát.' },
    { id: 'bottoms', imageUrl: '', imageAlt: '', title: 'Quần Bloomer & Quần Yếm Bé Gái 🩳',
      description: 'Quần bloomer bí bồng dễ thương và yếm thô đũi mát mẻ, thiết kế lưng chun co giãn êm ái cho bé thoải mái đóng bỉm.' },
    { id: 'dresses', imageUrl: '', imageAlt: '', title: 'Váy Đầm Công Chúa Bé Gái 👗',
      description: 'Những mẫu váy bồng xòe ngọt ngào từ voan tơ, lụa Habutai và thô đũi organic tự nhiên cho bé đi tiệc, đi chơi hay chụp ảnh kỷ niệm.' },
    { id: 'sets', imageUrl: '', imageAlt: '', title: 'Set Bộ Phối Sẵn Bé Gái ✨',
      description: 'Tiết kiệm thời gian phối đồ cho mẹ với những set bộ áo kèm chân váy/quần bloomer được mix-match chuẩn gu Hàn Quốc.' },
  ] },
};

async function main() {
  let created = 0;
  let migrated = 0;
  for (const [key, data] of Object.entries(content)) {
    const existing = await prisma.siteContent.findUnique({ where: { key } });
    if (existing) continue;
    await prisma.siteContent.create({ data: { key, data } });
    created += 1;
  }
  // Khối ảnh chủ đề đang lưu dạng mảng cũ: bọc thêm tiêu đề khối, giữ nguyên danh sách ảnh.
  const features = await prisma.siteContent.findUnique({ where: { key: 'home_features' } });
  if (features && Array.isArray(features.data)) {
    await prisma.siteContent.update({ where: { key: 'home_features' },
      data: { data: { ...homeFeaturesDefaults, items: features.data } } });
    migrated += 1;
  }
  console.log(`Site content seeded: ${created} created, ${migrated} migrated.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
