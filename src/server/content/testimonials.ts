import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/server/db/client';
import type { PublicTestimonial } from '@/types/testimonial';

export const getPublishedTestimonials = unstable_cache(async (): Promise<PublicTestimonial[]> => {
  return prisma.customerTestimonial.findMany({
    where: { isPublished: true, consentConfirmed: true },
    select: { id: true, customerName: true, quote: true, rating: true, location: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 6,
  });
}, ['published-testimonials'], { revalidate: 60, tags: ['testimonials'] });
