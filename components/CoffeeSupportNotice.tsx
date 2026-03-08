export default function CoffeeSupportNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm ${className}`}
    >
      🖼️ Image generation is currently unavailable — this feature requires a paid API. If
      you&apos;d like to{" "}
      <a
        href="https://venmo.com/Eric-Levicky"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium hover:text-amber-900"
      >
        send me a tip on Venmo 💸
      </a>
      , I&apos;ll consider enabling it!
    </div>
  );
}
