import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCollectionInput } from '../src/lib/content/collection-input.ts';
import { parseTestimonialInput } from '../src/lib/content/testimonial-input.ts';

const collection = { title: 'Mùa Hạ', slug: 'mua-ha', bannerUrl: 'https://res.cloudinary.com/demo/image/upload/hero-banner.jpg',
  subtitle: '', story: '', season: '', badge: '', lookbookUrls: [], themeColor: '#fff8ee', accentColor: '#d97706',
  sortOrder: 2, isActive: true, showInMenu: true, showOnHome: true };

test('collection content accepts Cloudinary images and validates display settings', () => {
  assert.equal(parseCollectionInput(collection).showInMenu, true);
  assert.equal(parseCollectionInput({ ...collection, showInMenu: false }).showInMenu, false);
  assert.throws(() => parseCollectionInput({ ...collection, bannerUrl: 'http://evil.test/a.jpg' }));
  assert.throws(() => parseCollectionInput({ ...collection, bannerUrl: '/images/hero-banner.jpg' }));
  assert.throws(() => parseCollectionInput({ ...collection, sortOrder: 1.5 }));
  assert.throws(() => parseCollectionInput({ ...collection, lookbookUrls: ['javascript:alert(1)'] }));
});

test('a testimonial requires a real quote and confirmed permission before publication', () => {
  const feedback = { customerName: 'Nguyễn A', quote: 'Chất vải mềm, bé mặc thoải mái.', rating: 5,
    location: 'Hà Nội', sortOrder: 1, consentConfirmed: true, isPublished: true };
  assert.equal(parseTestimonialInput(feedback).isPublished, true);
  assert.throws(() => parseTestimonialInput({ ...feedback, consentConfirmed: false }));
  assert.throws(() => parseTestimonialInput({ ...feedback, rating: 6 }));
  assert.throws(() => parseTestimonialInput({ ...feedback, quote: 'x' }));
  assert.equal(parseTestimonialInput({ ...feedback, isPublished: false, consentConfirmed: false }).isPublished, false);
});
