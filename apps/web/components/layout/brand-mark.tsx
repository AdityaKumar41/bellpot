type BrandMarkProps = { size?: number };

export function BrandMark({ size = 28 }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#e10600" />
      <path d="M8 17.2c.4-4.2 3.4-6.7 8-6.7s7.6 2.5 8 6.7" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M10.2 17.4h11.6v1.7c0 3.2-2.6 5.4-5.8 5.4s-5.8-2.2-5.8-5.4z" fill="#fff" />
    </svg>
  );
}
