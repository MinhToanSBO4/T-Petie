export type AdminCollection = {
  id: string; slug: string; title: string; subtitle: string | null; story: string | null;
  bannerUrl: string; lookbookUrls: string[]; themeColor: string | null; accentColor: string | null;
  season: string | null; badge: string | null; sortOrder: number; isActive: boolean;
  showInMenu: boolean; showOnHome: boolean; productCount: number;
};

export type AdminTestimonial = {
  id: string; customerName: string; quote: string; rating: number; location: string | null;
  sortOrder: number; consentConfirmed: boolean; isPublished: boolean;
};
