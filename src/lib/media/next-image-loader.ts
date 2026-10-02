import { cloudinaryLoader } from './cloudinary-url';

/**
 * Bộ nạp ảnh mặc định của next/image (khai báo `images.loaderFile` trong next.config): ảnh đã nằm trên Cloudinary nên
 * Cloudinary tự cắt đúng kích thước và định dạng, không đi qua bộ tối ưu ảnh của máy chủ Next/Vercel
 * (đỡ tốn hạn mức Image Optimization và CPU máy chủ). URL không phải Cloudinary được giữ nguyên.
 */
export default cloudinaryLoader;
