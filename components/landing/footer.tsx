import { Logo } from "@/components/brand";

const groups = [
  {
    label: "Product",
    items: ["Assessments", "Question Bank", "Analytics", "Integrations", "Changelog"],
  },
  {
    label: "Company",
    items: ["About", "Customers", "Press", "Careers", "Contact"],
  },
  {
    label: "Resources",
    items: ["Documentation", "Help Center", "API Reference", "Security", "Status"],
  },
  {
    label: "Legal",
    items: ["Privacy", "Terms", "DPA", "Compliance", "Trust Center"],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1440px] px-8 py-16 grid grid-cols-2 md:grid-cols-6 gap-10">
        <div className="col-span-2 max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            The assessment infrastructure for serious universities and recruitment teams.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.label}>
            <h6 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground mb-4">
              {g.label}
            </h6>
            <ul className="space-y-2.5">
              {g.items.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            © 2026 Bluebirds Solutions Assessment Technologies, Inc.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" /> All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
