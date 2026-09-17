export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="url(#th-grad)" />
      <path
        d="M8 11.5c3.2-1.6 6.4.2 8 1.6 1.6-1.4 4.8-3.2 8-1.6V22c-3.2-1.6-6.4.2-8 1.6-1.6-1.4-4.8-3.2-8-1.6V11.5Z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 13.2V23.2" stroke="white" strokeWidth="1.4" />
      <circle cx="23.2" cy="8.4" r="2.3" fill="#FDE68A" />
      <defs>
        <linearGradient id="th-grad" x1="4" y1="2" x2="30" y2="30">
          <stop stopColor="#6D28D9" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
    </svg>
  );
}
