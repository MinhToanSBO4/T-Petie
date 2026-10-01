export type AdminCollection = {
  id: string; slug: string; title: string; subtitle: string | null; story: string | null;
  bannerUrl: string; lookbookUrls: string[]; themeColor: string | null; accentColor: string | null;
  season: string | null; badge: string | null; sortOrder: number; isActive: boolean;
  showInMenu: boolean; showOnHome: boolean; productCount: number;
};

/** Feedback dạng ảnh chụp màn hình trong trang quản trị. */
export type AdminTestimonial = {
  id: string; imageUrl: string; imageWidth: number | null; imageHeight: number | null;
  caption: string | null; productId: string | null; productName: string | null;
  sortOrder: number; consentConfirmed: boolean; isPublished: boolean; createdAt: string;
};
