/**
 * Type definitions cho Sản phẩm T'Petie
 * Phục vụ đồng bộ dữ liệu từ Google Sheet và hiển thị trên giao diện
 */

export interface ProductSizeOption {
  size: string;             // VD: "Size 1", "Size 2", "Size 3", "Size 4"
  weightRange: string;      // VD: "8 - 10kg", "10 - 12kg", "12 - 15kg"
  ageRange: string;         // VD: "9 - 18 tháng", "18 - 24 tháng", "2 - 3 tuổi"
  price: number;            // Giá tương ứng từng size (VND)
  stock: number;            // Số lượng tồn kho
}

export type ProductSubcategory = 'ao' | 'quan' | 'vay' | 'set-do';
export type SaleCampaign = 'dai-le-2-9' | 'sale-he' | 'sale-thu-dong' | 'sale-ngay-doi';

export interface Product {
  id: string;               // ID duy nhất (slug / SKU)
  sku: string;              // Mã sản phẩm (VD: "TP-VG-001")
  name: string;             // Tên sản phẩm
  category: 'be-gai' | 'phu-kien';
  categoryName: string;     // Tên hiển thị danh mục (VD: "Váy Bé Gái")
  subcategory?: ProductSubcategory; // Subcategory: ao, quan, vay, set-do
  subcategoryName?: string;
  
  collectionId?: 'hoc-xinh-kem' | 'trung-thu-kem-com' | 'ha-mat' | 'khanh-vy' | string;
  collectionName?: string;
  
  material: string;         // Chất liệu chính (VD: "Thô đũi organic cao cấp")
  materialFeatures: string[]; // Các đặc tính (VD: ["100% Cotton", "Thấm hút mồ hôi", "An toàn da bé"])
  
  sizes: ProductSizeOption[]; // Bảng giá và size
  basePrice: number;        // Giá khởi điểm (hiển thị "Từ 245.000đ")
  originalPrice?: number;   // Giá gốc trước khi giảm (nếu có)
  discountPercent?: number; // % giảm giá nếu có Sale
  saleCampaign?: SaleCampaign; // Đợt sale: dai-le-2-9, sale-he, sale-thu-dong
  
  images: string[];         // Danh sách URL ảnh sản phẩm (hỗ trợ nhiều ảnh gallery)
  thumbnail: string;        // Ảnh đại diện chính (mặt trước)
  image?: string;           // Ảnh đại diện phụ/fallback
  gallery?: string[];       // Danh sách ảnh phụ/chi tiết
  colorName?: string;       // Tên màu: Vàng Mật Ong, Xanh Cốm, Trắng Kem, Hồng Phấn
  colorHex?: string;        // Mã hex màu sản phẩm
  
  isBestSeller?: boolean;   // Sản phẩm bán chạy
  isNewArrival?: boolean;   // Hàng mới về
  isSale?: boolean;         // Đang có chương trình Sale
  
  description: string;      // Mô tả chi tiết cho mẹ bỉm
  promotion?: string;       // Ưu đãi: Tặng kẹp tóc, giảm 50k khi mua combo 3 món...
  orderNote?: string;       // Lưu ý nhận đơn / bảo quản riêng
  specifications?: string;  // Thông số đo chi tiết (chiều dài áo, váy, quần theo size)
  careInstructions: string[]; // Hướng dẫn giặt & bảo quản
  origin: string;           // Xuất xứ (VD: "Thiết kế & May đo tại Việt Nam")
  rating: number;           // Đánh giá trung bình (VD: 4.9)
  reviewCount: number;      // Số lượt đánh giá
}

export type ProductCategory = Product['category'];
