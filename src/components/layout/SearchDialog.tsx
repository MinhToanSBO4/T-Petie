'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Search, X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { getCachedCatalog, loadCatalogProducts } from '@/client/catalog-cache';
import { searchCatalog } from '@/lib/catalog/filters';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import type { Product } from '@/types/product';

const POPULAR = ['Váy công chúa', 'Áo cổ sen', 'Quần bloomer', 'Thô đũi organic', 'Set đồ'];
const SUGGESTION_LIMIT = 6;

/**
 * Tìm kiếm nhanh: gợi ý sản phẩm ngay khi gõ (không dấu vẫn tìm được), chạy trên danh mục đã lưu ở trình duyệt nên
 * không gửi truy vấn nào lên máy chủ mỗi lần gõ. Enter hoặc "Xem tất cả" mở trang kết quả đầy đủ có bộ lọc.
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [products, setProducts] = useState<Product[]>(() => getCachedCatalog() || []);
  const [active, setActive] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useDialog(panelRef, onClose, inputRef);

  useEffect(() => {
    let alive = true;
    loadCatalogProducts().then((data) => { if (alive) setProducts(data); }).catch(() => { /* vẫn tìm được ở trang kết quả */ });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(query); setActive(-1); }, 120);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => debounced.trim() ? searchCatalog(products, debounced) : [], [products, debounced]);
  const suggestions = results.slice(0, SUGGESTION_LIMIT);

  const searchAll = (keyword: string) => {
    const value = keyword.trim();
    if (!value) return;
    onClose();
    router.push(`/girls?q=${encodeURIComponent(value)}`);
  };
  const open = (product: Product) => { onClose(); router.push(`/products/${product.slug}`); };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(suggestions.length - 1, index + 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(-1, index - 1)); }
  };

  return <div className="fixed inset-0 z-[60] flex items-start justify-center bg-charcoal-900/40 px-4 pt-16 backdrop-blur-sm"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={panelRef} role="dialog" aria-modal="true" aria-label="Tìm kiếm sản phẩm"
      initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full max-w-lg rounded-3xl border border-cream-200 bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-cream-200 pb-3">
        <h3 className="font-heading text-sm font-bold text-charcoal-900">Tìm Kiếm Đồ Cho Bé Yêu</h3>
        <button type="button" onClick={onClose} aria-label="Đóng tìm kiếm" className="rounded-full p-1 text-charcoal-400 hover:bg-cream-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (active >= 0 && suggestions[active]) open(suggestions[active]); else searchAll(query);
      }} className="relative mt-4" role="search">
        <input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown}
          placeholder="Nhập tên váy, áo sơ mi, chất vải organic..." aria-label="Từ khóa tìm kiếm"
          aria-controls="search-suggestions" aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
          className="w-full rounded-2xl border border-cream-300 bg-cream-50 py-3 pl-10 pr-4 text-sm focus:border-honey-500 focus:outline-none" />
        <button type="submit" aria-label="Thực hiện tìm kiếm" className="absolute left-3.5 top-3.5 transition-colors hover:text-honey-600">
          <Search className="h-4 w-4 text-charcoal-400 hover:text-honey-600" />
        </button>
      </form>

      {debounced.trim() ? <div className="mt-3">
        {suggestions.length > 0 ? <ul id="search-suggestions" role="listbox" aria-label="Gợi ý sản phẩm" className="divide-y divide-cream-100">
          {suggestions.map((product, index) => <li key={product.id} id={`search-option-${index}`} role="option" aria-selected={index === active}>
            <button type="button" onClick={() => open(product)} onMouseEnter={() => setActive(index)}
              className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${index === active ? 'bg-honey-50' : 'hover:bg-cream-50'}`}>
              {product.thumbnail
                ? <img src={cloudinaryImage(product.thumbnail, { width: 96 })} alt="" className="size-12 shrink-0 rounded-lg bg-cream-100 object-cover" />
                : <span className="size-12 shrink-0 rounded-lg bg-cream-100" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-charcoal-900">{product.name}</span>
                <span className="block truncate text-xs text-charcoal-500">{[product.subcategoryName || product.categoryName, product.collectionName].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-honey-700">{product.basePrice.toLocaleString('vi-VN')}đ</span>
            </button>
          </li>)}
        </ul> : <p className="px-2 py-4 text-sm text-charcoal-500">Không thấy mẫu nào cho “{debounced.trim()}”. Mẹ thử từ khóa ngắn hơn nhé.</p>}
        {results.length > 0 && <button type="button" onClick={() => searchAll(query)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-cream-100 py-2.5 text-xs font-bold text-charcoal-800 hover:bg-honey-100">
          Xem tất cả {results.length} kết quả <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>}
      </div> : <div className="mt-4">
        <span className="mb-2 block text-xs font-semibold text-charcoal-600">Gợi ý tìm kiếm phổ biến:</span>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((keyword) => <button key={keyword} type="button" onClick={() => searchAll(keyword)}
            className="rounded-full bg-cream-100 px-3 py-1.5 text-xs font-medium text-charcoal-700 transition-colors hover:bg-honey-100">
            🔍 {keyword}
          </button>)}
        </div>
      </div>}
    </motion.div>
  </div>;
}
