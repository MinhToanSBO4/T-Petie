import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { AboutPageContent } from '@/lib/content/site-content';
import { cloudinaryImage, cloudinarySrcSet } from '@/lib/media/cloudinary-url';

const FOUNDED = 2021;

const MEMORIES = [
  'Một chiếc váy trong ngày đặc biệt.',
  'Một chiếc áo mặc đến trường.',
  'Một bộ đồ trong chuyến đi cùng gia đình.',
  'Một bộ quần áo được mặc đi mặc lại, vì bé yêu nó.',
];

const BALANCE = [
  { title: 'Đẹp vừa đủ', text: 'Nhã nhặn, giữ trọn nét ngây thơ trong trẻo.' },
  { title: 'Thoải mái vừa đủ', text: 'Thấm hút tốt, êm ái cho từng cử động chạy nhảy.' },
  { title: 'Cá tính vừa đủ', text: 'Có phong cách riêng, tự nhiên và không gượng ép.' },
];

const ECOSYSTEM = [
  { name: 'Clothing', text: 'Trang phục' },
  { name: 'Accessories', text: 'Phụ kiện' },
  { name: 'Objects', text: 'Đồ dùng' },
  { name: 'Visuals', text: 'Hình ảnh' },
  { name: 'Stories', text: 'Câu chuyện' },
  { name: 'Childhood Experiences', text: 'Trải nghiệm tuổi thơ' },
];

const VALUES = [
  { name: 'Childhood first', title: 'Tuổi thơ là trung tâm',
    text: 'Mọi thiết kế đều quay về một câu hỏi: “Điều này có thực sự dành cho một đứa trẻ không?” Không hy sinh sự thoải mái của trẻ để đổi lấy một hình ảnh đẹp.' },
  { name: 'Quietly beautiful', title: 'Đẹp một cách tinh tế',
    text: 'Không chạy theo sự nổi bật bằng mọi giá. Thay vào đó là màu sắc, chất liệu, phom dáng và những chi tiết nhỏ khiến người ta muốn nhìn lâu hơn một chút.' },
  { name: 'Made with care', title: 'Làm bằng sự chăm chút',
    text: 'Từ thiết kế, chất liệu, đường may, đóng gói đến cách trò chuyện với khách hàng — những điều nhỏ đều quan trọng.' },
  { name: 'Lasting memories', title: 'Ký ức có thể ở lại',
    text: 'Không chỉ nghĩ về mùa này hay xu hướng này: chúng tôi muốn sản phẩm có mặt trong những bức ảnh mà nhiều năm sau bố mẹ vẫn muốn giữ lại.' },
];

/** Ảnh lookbook cắt sẵn đúng khung ở đúng độ phân giải. */
function Photo({ url, ratio, width, sizes, className = '', eager = false }: {
  url: string; ratio: number; width: number; sizes: string; className?: string; eager?: boolean;
}) {
  return <img src={cloudinaryImage(url, { width, fill: { height: width / ratio } })}
    srcSet={cloudinarySrcSet(url, [Math.round(width / 2), width, Math.round(width * 1.5)], ratio)} sizes={sizes}
    alt="" loading={eager ? 'eager' : 'lazy'} className={`block h-full w-full object-cover ${className}`} />;
}

/** Cột trái mỗi chương: số lớn và tên chương, nằm cố định ở đầu chương (không trôi theo khi cuộn). */
function Chapter({ number, label }: { number: string; label: string }) {
  return <div className="md:col-span-4">
    <span aria-hidden className="block font-serif text-[5.5rem] font-medium leading-[0.8] text-blush-600 lining-nums sm:text-[7.5rem]">{number}</span>
    <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-charcoal-700">{label}</p>
  </div>;
}

/**
 * Trang Về Chúng Tôi dạng một bài đọc liền mạch: tuyên ngôn, rồi 5 chương cùng một bố cục: câu chuyện, niềm tin,
 * tầm nhìn, sứ mệnh, giá trị cốt lõi. Ảnh là ảnh lookbook thật của shop. Tiêu đề, lời dẫn, ảnh chính và lời mời
 * cuối trang chỉnh trong mục Nội dung website.
 */
export function AboutContent({ about, photos }: { about: AboutPageContent | null; photos: string[] }) {
  const photo = (index: number) => photos[index % Math.max(1, photos.length)];
  const hasPhotos = photos.length >= 4;

  return <div className="pb-20">
    {/* ===== Mở đầu ===== */}
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-10 sm:px-6 sm:pt-16 md:grid-cols-12 md:items-center md:gap-10">
      <div className="md:col-span-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-charcoal-500">Về T&apos;Petie · Từ năm {FOUNDED}</p>
        <h1 className="mt-5 font-serif text-[3.25rem] font-semibold leading-[1.02] tracking-tight text-charcoal-900 sm:text-7xl lg:text-[5.5rem]">
          {about?.heroTitle || 'Made for little souls.'}
        </h1>
        {about?.heroDescription && <p className="mt-7 max-w-xl text-lg leading-relaxed text-charcoal-700 sm:text-xl">{about.heroDescription}</p>}
      </div>
      {hasPhotos && <div className="relative md:col-span-5">
        <div aria-hidden className="absolute -right-3 -top-5 h-[78%] w-[72%] rounded-[32px] bg-blush-200/60 sm:-right-5" />
        <div className="relative ml-auto aspect-[3/4] w-[82%] overflow-hidden rounded-[28px] bg-cream-100">
          <Photo url={photo(0)} ratio={3 / 4} width={720} sizes="(min-width: 768px) 34vw, 80vw" eager />
        </div>
        <div className="absolute -bottom-8 left-0 aspect-[2/3] w-[42%] overflow-hidden rounded-[22px] border-[6px] border-cream-50 bg-cream-100 shadow-xl shadow-blush-900/10">
          <Photo url={photo(1)} ratio={2 / 3} width={420} sizes="(min-width: 768px) 18vw, 40vw" eager />
        </div>
      </div>}
    </section>

    {about?.heroImageUrl && <div className="mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
      {/* Ảnh chính có thể đã có chữ thiết kế nên giữ nguyên tỉ lệ, không cắt. */}
      <img src={cloudinaryImage(about.heroImageUrl, { width: 1600 })}
        srcSet={cloudinarySrcSet(about.heroImageUrl, [800, 1200, 1600, 2200])} sizes="(min-width: 1152px) 1152px, 100vw"
        alt={about.heroImageAlt || "T'Petie"} className="block h-auto max-h-[75vh] w-full rounded-[28px] object-contain" />
    </div>}

    {/* ===== 01 Câu chuyện ===== */}
    <section id="story" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 gap-8 px-4 sm:mt-32 sm:px-6 md:grid-cols-12 md:gap-10">
      <Chapter number="01" label="Câu chuyện" />
      <div className="md:col-span-8">
        <h2 className="font-serif text-4xl font-semibold leading-[1.1] text-charcoal-900 sm:text-5xl">
          Quần áo không chỉ là thứ trẻ mặc trên người.
        </h2>
        <p className="mt-6 text-lg leading-8 text-charcoal-700">
          T&apos;Petie bắt đầu từ năm {FOUNDED}, bằng một tình yêu giản dị dành cho thời trang trẻ em
          và những điều nhỏ bé tạo nên một tuổi thơ đẹp.
        </p>
      </div>
    </section>

    <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-x-4 gap-y-10 px-4 sm:px-6 md:grid-cols-4 md:gap-x-6">
      {MEMORIES.map((memory, index) => <li key={memory} className={index % 2 === 1 ? 'md:mt-16' : ''}>
        {hasPhotos && <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-blush-50 ring-1 ring-blush-100">
          <Photo url={photo(index + 2)} ratio={3 / 4} width={480} sizes="(min-width: 768px) 25vw, 50vw" />
        </div>}
        <p className="mt-4 font-serif text-lg italic leading-snug text-charcoal-800 sm:text-xl">{memory}</p>
      </li>)}
    </ul>

    <div className="mx-auto mt-14 grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-12 md:gap-10">
      <div className="space-y-5 text-lg leading-8 text-charcoal-700 md:col-span-8 md:col-start-5">
        <p>Những điều rất nhỏ ấy, theo thời gian, có thể trở thành những ký ức rất lớn. Vì vậy T&apos;Petie tạo ra những thiết kế với tinh thần nhẹ nhàng, tinh tế và tự nhiên — đủ đẹp để người lớn yêu thích, nhưng đủ thoải mái để trẻ được tự do vui chơi, khám phá và lớn lên.</p>
        <p>Từ chất liệu, phom dáng, màu sắc đến từng chi tiết nhỏ, chúng tôi cố gắng tạo nên những sản phẩm không chỉ đẹp trong một khoảnh khắc, mà đồng hành cùng những ngày tháng rất thật của một đứa trẻ.</p>
      </div>
    </div>

    {/* ===== 02 Niềm tin ===== */}
    <section id="belief" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 gap-8 px-4 sm:mt-32 sm:px-6 md:grid-cols-12 md:gap-10">
      <Chapter number="02" label="Niềm tin" />
      <div className="md:col-span-8">
        <blockquote className="font-serif text-4xl font-medium leading-[1.15] text-charcoal-900 sm:text-5xl">
          Tuổi thơ không cần phải hoàn hảo. <span className="italic text-blush-700">Tuổi thơ chỉ cần được nâng niu.</span>
        </blockquote>
        <p className="mt-6 text-lg leading-8 text-charcoal-700">
          Trẻ em không cần những bộ quần áo biến chúng thành một “phiên bản hoàn hảo” trong mắt người lớn. Các em cần được thoải mái chạy nhảy, nghịch ngợm, đến trường, đi chơi và lớn lên theo cách của riêng mình.
        </p>
        <ol className="mt-10 grid gap-8 border-t border-blush-200 pt-8 sm:grid-cols-3">
          {BALANCE.map((item, index) => <li key={item.title}>
            <span aria-hidden className="font-serif text-4xl font-medium leading-none text-blush-600 lining-nums">0{index + 1}</span>
            <h3 className="mt-3 font-serif text-2xl font-semibold text-charcoal-900">{item.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-charcoal-600">{item.text}</p>
          </li>)}
        </ol>
      </div>
    </section>

    {/* ===== 03 Tầm nhìn ===== */}
    <section id="vision" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 gap-8 px-4 sm:mt-32 sm:px-6 md:grid-cols-12 md:gap-10">
      <Chapter number="03" label="Tầm nhìn" />
      <div className="md:col-span-8">
        <h2 className="font-serif text-4xl font-semibold leading-[1.1] text-charcoal-900 sm:text-5xl">
          Một thương hiệu thời trang trẻ em Việt Nam có dấu ấn riêng.
        </h2>
        <p className="mt-6 text-lg leading-8 text-charcoal-700">
          Được nhớ đến bởi vẻ đẹp tinh tế, chất lượng và cách trân trọng những năm tháng tuổi thơ. Về dài hạn, T&apos;Petie muốn trở thành một thương hiệu lifestyle cho trẻ nhỏ — một thế giới riêng, không chỉ giới hạn ở quần áo.
        </p>
        <ol className="mt-10 grid grid-cols-1 border-t border-blush-200 sm:grid-cols-2">
          {ECOSYSTEM.map((item, index) => <li key={item.name} className="flex items-baseline gap-5 border-b border-blush-200 py-5 sm:pr-6">
            <span aria-hidden className="w-10 shrink-0 font-serif text-2xl text-blush-600 lining-nums">0{index + 1}</span>
            <span><span className="block font-serif text-2xl text-charcoal-900">{item.name}</span>
              <span className="text-sm text-charcoal-600">{item.text}</span></span>
          </li>)}
        </ol>
      </div>
    </section>

    {hasPhotos && <ul className="mx-auto mt-24 grid max-w-6xl grid-cols-3 gap-3 px-4 sm:mt-32 sm:gap-5 sm:px-6" aria-label="Khoảnh khắc từ lookbook T'Petie">
      {[6, 7, 8].map((index, position) => <li key={index} className={position === 1 ? 'mt-12 sm:mt-20' : ''}>
        <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-cream-100">
          <Photo url={photo(index)} ratio={2 / 3} width={560} sizes="(min-width: 1152px) 370px, 33vw" />
        </div>
      </li>)}
    </ul>}

    {/* ===== 04 Sứ mệnh ===== */}
    <section id="mission" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 gap-8 px-4 sm:mt-32 sm:px-6 md:grid-cols-12 md:gap-10">
      <Chapter number="04" label="Sứ mệnh" />
      <div className="md:col-span-8">
        <blockquote className="font-serif text-4xl font-medium leading-[1.15] text-charcoal-900 sm:text-5xl">
          Tạo nên những điều đẹp đẽ để những tâm hồn nhỏ bé <span className="italic text-blush-700">lớn lên cùng.</span>
        </blockquote>
        <p className="mt-6 text-lg leading-8 text-charcoal-700">
          Mỗi đường chỉ êm ái, mỗi gam màu dịu nhẹ là một lời nhắn yêu thương gửi đến những em bé đang khám phá thế giới.
        </p>
      </div>
    </section>

    {/* ===== 05 Giá trị cốt lõi ===== */}
    <section id="values" className="mx-auto mt-24 grid max-w-6xl scroll-mt-24 gap-8 px-4 sm:mt-32 sm:px-6 md:grid-cols-12 md:gap-10">
      <Chapter number="05" label="Giá trị cốt lõi" />
      <div className="md:col-span-8">
        <h2 className="font-serif text-4xl font-semibold leading-[1.1] text-charcoal-900 sm:text-5xl">Bốn điều chúng tôi không đánh đổi.</h2>
        <ol className="mt-10 divide-y divide-blush-200 border-y border-blush-200">
          {VALUES.map((value, index) => <li key={value.name} className="grid gap-3 py-8 sm:grid-cols-[88px_1fr] sm:gap-6">
            <span aria-hidden className="font-serif text-5xl font-medium leading-none text-blush-600 lining-nums">0{index + 1}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal-500">{value.name}</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold text-charcoal-900">{value.title}</h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-charcoal-600">{value.text}</p>
            </div>
          </li>)}
        </ol>
      </div>
    </section>

    {/* ===== Lời mời ===== */}
    {(about?.ctaTitle || about?.ctaDescription) && <section className="mx-auto mt-24 max-w-6xl px-4 sm:mt-32 sm:px-6">
      <div className="grid overflow-hidden rounded-[32px] bg-blush-50 md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-14 sm:px-12 sm:py-20">
          {about.ctaTitle && <h2 className="font-serif text-4xl font-semibold leading-[1.1] text-charcoal-900 sm:text-5xl">{about.ctaTitle}</h2>}
          {about.ctaDescription && <p className="mt-5 max-w-md text-lg leading-relaxed text-charcoal-700">{about.ctaDescription}</p>}
          {about.ctaLabel && about.ctaHref && <Link href={about.ctaHref}
            className="group mt-9 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-charcoal-900 px-7 text-sm font-semibold text-white transition-colors hover:bg-charcoal-800">
            {about.ctaLabel}<ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
          </Link>}
        </div>
        {hasPhotos && <div className="min-h-[320px]">
          <Photo url={photo(9)} ratio={4 / 5} width={800} sizes="(min-width: 768px) 576px, 100vw" />
        </div>}
      </div>
    </section>}
  </div>;
}
