import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCollectionInput } from '../src/lib/content/collection-input.ts';
import { parseTestimonialBatch, parseTestimonialInput } from '../src/lib/content/testimonial-input.ts';

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

const screenshot = 'https://res.cloudinary.com/demo/image/upload/v1/tpetie/site/chat-1.png';
const feedback = { imageUrl: screenshot, caption: '  Mẹ bé Na   ·  Hà Nội ', productId: 'cm123product',
  sortOrder: 1, consentConfirmed: true, isPublished: true };

test('a screenshot feedback needs a Cloudinary image and confirmed permission before publication', () => {
  const parsed = parseTestimonialInput(feedback);
  assert.equal(parsed.isPublished, true);
  assert.equal(parsed.caption, 'Mẹ bé Na · Hà Nội');
  assert.throws(() => parseTestimonialInput({ ...feedback, consentConfirmed: false }), /đồng ý/);
  assert.equal(parseTestimonialInput({ ...feedback, isPublished: false, consentConfirmed: false }).isPublished, false);
  assert.throws(() => parseTestimonialInput({ ...feedback, imageUrl: 'https://evil.test/chat.png' }));
  assert.throws(() => parseTestimonialInput({ ...feedback, imageUrl: 'javascript:alert(1)' }));
  assert.throws(() => parseTestimonialInput({ ...feedback, imageUrl: 'https://res.cloudinary.com/demo/raw/upload/a.xlsx' }));
  assert.throws(() => parseTestimonialInput({ ...feedback, caption: 'x'.repeat(121) }));
  assert.throws(() => parseTestimonialInput({ ...feedback, productId: '../products' }));
  assert.throws(() => parseTestimonialInput({ ...feedback, sortOrder: 1000 }));
  assert.equal(parseTestimonialInput({ ...feedback, caption: '   ', productId: '' }).caption, null);
  assert.equal(parseTestimonialInput({ ...feedback, productId: '' }).productId, null);
});

test('several screenshots can be added at once with shared publication settings', () => {
  const batch = parseTestimonialBatch({ consentConfirmed: true, isPublished: false,
    items: [{ imageUrl: screenshot }, { imageUrl: `${screenshot}?2`, caption: 'Mẹ Lan' }] });
  assert.equal(batch.items.length, 2);
  assert.equal(batch.sortOrder, 0);
  assert.throws(() => parseTestimonialBatch({ consentConfirmed: true, isPublished: true, items: [] }));
  assert.throws(() => parseTestimonialBatch({ consentConfirmed: true, isPublished: true,
    items: Array.from({ length: 13 }, (_, index) => ({ imageUrl: `${screenshot}?${index}` })) }));
  assert.throws(() => parseTestimonialBatch({ consentConfirmed: true, isPublished: true,
    items: [{ imageUrl: screenshot }, { imageUrl: screenshot }] }), 'duplicate screenshots are rejected');
  assert.throws(() => parseTestimonialBatch({ consentConfirmed: false, isPublished: true, items: [{ imageUrl: screenshot }] }), /đồng ý/);
});
