/**
 * Type definitions cho Bộ Sưu Tập T'Petie
 */

export interface Collection {
  id: 'hoc-xinh-kem' | 'trung-thu-kem-com' | 'ha-mat' | 'khanh-vy' | string;
  title: string;            // Tên BST: "Học Xinh Kem", "Trung Thu Kem Cốm", "Hạ Mát", "Khánh Vy x T'Petie"
  subtitle: string;         // Phụ đề mô tả cảm xúc
  story: string;            // Câu chuyện cảm hứng của BST
  bannerImage: string;      // Ảnh banner chính
  lookbookImages: string[]; // Ảnh lookbook phối cảnh
  themeColor: string;       // Màu nền chủ đạo
  accentColor: string;      // Màu điểm nhấn
  season: string;           // "Mùa Tựu Trường", "Tết Trung Thu", "Mùa Hè Dịu Mát", "Độc Quyền Limited"
  badge: string;            // Tag: "BST Mới", "Best Choice", "Limited Edition"
  featuredProductIds: string[]; // Danh sách ID sản phẩm nổi bật
}
