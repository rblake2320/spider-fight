export function SpiderMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#b4452a" />
      <ellipse cx="16" cy="17.5" rx="4.2" ry="5.2" fill="#efe6d4" />
      <ellipse cx="16" cy="11.5" rx="2.6" ry="2.8" fill="#efe6d4" />
      <path
        d="M12 12 L4 8 M12 14 L3 14 M12 17 L4 22 M12 20 L7 27 M20 12 L28 8 M20 14 L29 14 M20 17 L28 22 M20 20 L25 27"
        stroke="#efe6d4"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
