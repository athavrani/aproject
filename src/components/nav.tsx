type NavProps = {
  active: "strategies" | "my-strategies" | "dashboard" | "none";
  userEmail?: string | null;
};

const LINKS = [
  { key: "strategies", label: "Strategies", href: "/strategies" },
  { key: "my-strategies", label: "My Strategies", href: "/my-strategies" },
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
] as const;

export default function Nav({ active, userEmail }: NavProps) {
  return (
    <header className="flex items-center justify-between px-10 py-4 border-b border-border bg-surface flex-wrap gap-2">
      <div className="flex items-center gap-8 flex-wrap">
        <a href="/strategies" className="font-display font-bold text-xl">Strategix</a>
        <nav className="flex gap-6 text-sm font-medium">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={
                active === link.key
                  ? "border-b-2 border-accent pb-1"
                  : "text-text-secondary"
              }
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <a
        href="/settings"
        aria-label="Account settings"
        className="w-9 h-9 rounded-full bg-border flex items-center justify-center text-sm font-semibold text-text-secondary"
      >
        {userEmail?.[0]?.toUpperCase() ?? "?"}
      </a>
    </header>
  );
}
