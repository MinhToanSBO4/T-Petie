import type { ReactNode } from 'react';

export type ErrorIllustrationName = 'dress' | 'spool' | 'parcel' | 'lock';

// Màu lấy từ lớp Tailwind (biến CSS) nên trong khu nội bộ (.admin-theme) minh họa tự chuyển sang tông hồng.
// Chuyển động rất nhẹ (váy đung đưa, cuộn chỉ nhấp nhô, lấp lánh) và tắt hẳn khi người dùng chọn giảm chuyển động.
const MOTION = '@keyframes tp-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}'
  + '@keyframes tp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}'
  + '@keyframes tp-twinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}'
  + '.tp-sway,.tp-twinkle{transform-box:fill-box}.tp-sway{transform-origin:50% 0;animation:tp-sway 5s ease-in-out infinite}'
  + '.tp-bob{animation:tp-bob 3.6s ease-in-out infinite}.tp-twinkle{transform-origin:center;animation:tp-twinkle 2.8s ease-in-out infinite}'
  + '@media (prefers-reduced-motion:reduce){.tp-sway,.tp-bob,.tp-twinkle{animation:none}}';

/** Ngôi sao bốn cánh nhỏ, nhấp nháy lệch nhịp theo `delay`. */
function Sparkle({ x, y, r, className, delay = 0 }: { x: number; y: number; r: number; className: string; delay?: number }) {
  return <path className={`tp-twinkle ${className}`} style={delay ? { animationDelay: `${delay}s` } : undefined}
    d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`} />;
}

function Heart({ x, y, scale = 1, className }: { x: number; y: number; scale?: number; className: string }) {
  return <path className={className} transform={`translate(${x} ${y}) scale(${scale})`}
    d="M0 4.6C-3.7 2-5.4 0-5.4-2c0-1.9 1.4-3.2 3-3.2 1 0 1.9.5 2.4 1.4.5-.9 1.4-1.4 2.4-1.4 1.6 0 3 1.3 3 3.2 0 2-1.7 4-5.4 6.6z" />;
}

/** Nơ hai cánh (dùng cho váy và hộp quà). */
function Bow({ x, y, className, knot }: { x: number; y: number; className: string; knot: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path className={className} d="M0 0c-5-5.5-11.5-5.5-11.5 0S-5 5.5 0 0zm0 0c5-5.5 11.5-5.5 11.5 0S5 5.5 0 0z" />
    <circle r="2.6" className={knot} />
  </g>;
}

const ART: Record<ErrorIllustrationName, ReactNode> = {
  // Chiếc váy nhỏ trên móc áo: "món đồ" mẹ tìm đã được cất khỏi kệ.
  dress: <>
    <Sparkle x={34} y={50} r={7} className="fill-honey-400" />
    <Sparkle x={130} y={46} r={5} className="fill-blush-300" delay={1.2} />
    <Sparkle x={134} y={110} r={4} className="fill-sage-300" delay={0.6} />
    <g transform="translate(0 6)">
      <g className="tp-sway">
        <path d="M80 40v-8a6 6 0 1 0-6-6M80 40 42 60c-3 1.6-2 5 1.5 5h73c3.5 0 4.5-3.4 1.5-5z" fill="none" strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round" className="stroke-honey-700" />
        <path className="fill-blush-200 stroke-blush-300" strokeWidth={1.5} strokeLinejoin="round"
          d="M65 49Q72 58 80 58Q88 58 95 49L101 53Q103 59 97 62L95 82L119 126q-6.5 7-13 0q-6.5 7-13 0q-6.5 7-13 0q-6.5 7-13 0q-6.5 7-13 0q-6.5 7-13 0L65 82L63 62Q57 59 59 53Z" />
        <g className="fill-white" opacity={0.9}>
          <circle cx="72" cy="93" r="1.8" /><circle cx="88" cy="93" r="1.8" />
          <circle cx="63" cy="105" r="1.8" /><circle cx="80" cy="104" r="1.8" /><circle cx="97" cy="105" r="1.8" />
          <circle cx="54" cy="118" r="1.8" /><circle cx="71" cy="117" r="1.8" /><circle cx="89" cy="117" r="1.8" /><circle cx="106" cy="118" r="1.8" />
        </g>
        <path className="fill-white stroke-blush-300" strokeWidth={1} strokeLinejoin="round"
          d="M80 58.5c-5 .5-10-1-12.5-5.5 4-1.5 9.5 0 12.5 5.5zm0 0c5 .5 10-1 12.5-5.5-4-1.5-9.5 0-12.5 5.5z" />
        <path className="fill-honey-300" d="M64.7 78h30.6l.5 6.5H64.2z" />
        <Bow x={80} y={81} className="fill-honey-400" knot="fill-honey-500" />
      </g>
    </g>
  </>,
  // Cuộn chỉ và cây kim: shop đang "khâu lại" chỗ trục trặc.
  spool: <>
    <Sparkle x={32} y={44} r={6} className="fill-honey-400" />
    <Sparkle x={136} y={124} r={4} className="fill-sage-300" delay={0.9} />
    <g className="tp-bob">
      <rect x="47" y="58" width="38" height="58" className="fill-blush-300" />
      <path d="M47 66h38M47 74h38M47 82h38M47 90h38M47 98h38M47 106h38" className="stroke-blush-500" strokeWidth={1.2} opacity={0.45} />
      <rect x="53" y="58" width="5" height="58" className="fill-white" opacity={0.3} />
      <rect x="40" y="48" width="52" height="12" rx="4" className="fill-honey-300" />
      <rect x="40" y="114" width="52" height="12" rx="4" className="fill-honey-300" />
      <path d="M46 52h40M46 118h40" className="stroke-white" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
      <path d="M85 64c8-3 14-11 21-18" fill="none" className="stroke-blush-500" strokeWidth={1.8} strokeLinecap="round" />
      <g transform="translate(120 64) rotate(-35)">
        <path className="fill-charcoal-300" d="M0-30c2 0 3 1.5 3 3.5V18L0 30l-3-12v-44.5c0-2 1-3.5 3-3.5z" />
        <rect x="-1" y="-26" width="2" height="9" rx="1" className="fill-white" />
      </g>
      <path d="M140 92c4 9 1 19-8 25" fill="none" strokeDasharray="3 4" className="stroke-blush-500" strokeWidth={2} strokeLinecap="round" />
      <Heart x={126} y={122} scale={1.1} className="fill-blush-500" />
    </g>
  </>,
  // Hộp quà hé nắp: đơn hàng mẹ tìm không có ở đây.
  parcel: <>
    <Sparkle x={34} y={52} r={6} className="fill-honey-400" />
    <Sparkle x={136} y={112} r={4} className="fill-sage-300" delay={1} />
    <rect x="46" y="82" width="68" height="48" rx="5" className="fill-honey-200" />
    <rect x="46" y="82" width="68" height="5" className="fill-honey-300" opacity={0.7} />
    <rect x="75" y="82" width="10" height="48" className="fill-blush-300" />
    <g className="tp-bob">
      <g transform="rotate(-12 42 80)">
        <rect x="40" y="66" width="80" height="16" rx="4" className="fill-honey-300" />
        <rect x="75" y="66" width="10" height="16" className="fill-blush-300" />
        <Bow x={80} y={65} className="fill-blush-300" knot="fill-blush-500" />
      </g>
    </g>
    <circle cx="122" cy="44" r="13" className="fill-white stroke-honey-200" strokeWidth={1.5} />
    <path d="M118.4 40.6a3.7 3.7 0 1 1 5.3 3.3c-1.1.5-1.7 1.4-1.7 2.5v1" fill="none" className="stroke-honey-700" strokeWidth={2.4} strokeLinecap="round" />
    <circle cx="122" cy="51.6" r="1.5" className="fill-honey-700" />
  </>,
  // Ổ khóa có lỗ khóa hình trái tim: khu vực dành riêng.
  lock: <>
    <Sparkle x={36} y={54} r={6} className="fill-honey-400" />
    <Sparkle x={128} y={44} r={5} className="fill-blush-300" delay={1.1} />
    <path d="M62 82V66a18 18 0 0 1 36 0v16" fill="none" className="stroke-charcoal-300" strokeWidth={8} strokeLinecap="round" />
    <rect x="48" y="76" width="64" height="54" rx="14" className="fill-honey-300" />
    <rect x="56" y="83" width="48" height="5" rx="2.5" className="fill-white" opacity={0.4} />
    <Heart x={80} y={104} scale={1.7} className="fill-blush-500" />
  </>,
};

/** Minh họa nhỏ của màn hình lỗi, vẽ bằng SVG nội tuyến theo bảng màu của shop (không tải ảnh ngoài). */
export function ErrorIllustration({ name, className = '' }: { name: ErrorIllustrationName; className?: string }) {
  return <svg viewBox="0 0 160 160" className={className} aria-hidden focusable="false">
    <style>{MOTION}</style>
    <path className="fill-honey-100" d="M80 24c30 0 58 20 60 52 2 34-22 64-58 64-34 0-62-24-62-58 0-32 28-58 60-58z" />
    <circle cx="134" cy="72" r="4" className="fill-blush-200" />
    <circle cx="26" cy="112" r="3" className="fill-sage-200" />
    {ART[name]}
  </svg>;
}
