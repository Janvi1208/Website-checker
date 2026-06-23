interface Competitor {
  name: string;
  url: string;
  positioning: string;
  priceComparison: string;
  keyDifference: string;
}

export function CompetitorTable({ competitors }: { competitors: Competitor[] }) {
  if (competitors.length === 0) {
    return (
      <p className="text-sm text-muted">
        No confident competitor matches were found via web search.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-4 py-3 readout-label">Competitor</th>
            <th className="px-4 py-3 readout-label">Positioning</th>
            <th className="px-4 py-3 readout-label">Pricing</th>
            <th className="px-4 py-3 readout-label">Key difference</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c) => (
            <tr key={c.name} className="border-b border-border last:border-0">
              <td className="px-4 py-3 align-top">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ivory hover:text-signal"
                >
                  {c.name}
                </a>
              </td>
              <td className="px-4 py-3 align-top text-muted">{c.positioning}</td>
              <td className="px-4 py-3 align-top text-muted">{c.priceComparison}</td>
              <td className="px-4 py-3 align-top text-muted">{c.keyDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
