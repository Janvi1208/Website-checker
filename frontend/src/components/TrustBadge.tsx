interface TrustBadgeProps {
  classification: "Safe" | "Medium Risk" | "High Risk";
  score: number;
}

const STYLES: Record<TrustBadgeProps["classification"], string> = {
  Safe: "bg-signal/10 text-signal border-signal/30",
  "Medium Risk": "bg-data/10 text-data border-data/30",
  "High Risk": "bg-alert/10 text-alert border-alert/30",
};

export function TrustBadge({ classification, score }: TrustBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs ${STYLES[classification]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {classification} · {score}/10
    </div>
  );
}
