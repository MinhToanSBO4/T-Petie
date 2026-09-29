export type TestimonialInput = {
  customerName: string; quote: string; rating: number; location: string | null;
  sortOrder: number; consentConfirmed: boolean; isPublished: boolean;
};

export function parseTestimonialInput(raw: unknown): TestimonialInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Feedback không hợp lệ');
  const input = raw as Record<string, unknown>;
  const name = typeof input.customerName === 'string' ? input.customerName.trim() : '';
  const quote = typeof input.quote === 'string' ? input.quote.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';
  if (name.length < 2 || name.length > 80 || quote.length < 15 || quote.length > 800 || location.length > 100 ||
    !Number.isInteger(input.rating) || Number(input.rating) < 1 || Number(input.rating) > 5 ||
    !Number.isInteger(input.sortOrder) || Number(input.sortOrder) < 0 || Number(input.sortOrder) > 999 ||
    typeof input.consentConfirmed !== 'boolean' || typeof input.isPublished !== 'boolean') {
    throw new Error('Nội dung feedback không hợp lệ');
  }
  if (input.isPublished && !input.consentConfirmed) throw new Error('Cần xác nhận sự đồng ý của khách trước khi công bố');
  return { customerName: name, quote, rating: Number(input.rating), location: location || null,
    sortOrder: Number(input.sortOrder), consentConfirmed: input.consentConfirmed,
    isPublished: input.isPublished };
}
