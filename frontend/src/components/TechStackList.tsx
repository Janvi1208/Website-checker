interface TechItem {
  name: string;
  category: string;
  confidence: number;
  evidence: string;
}

export function TechStackList({ items }: { items: TechItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        No technologies were confidently detected from page markup and response headers.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((tech) => (
        <div key={tech.name} className="panel-raised flex items-center justify-between p-3">
          <div>
            <p className="text-sm font-medium text-ivory">{tech.name}</p>
            <p className="readout-label mt-0.5">{tech.category}</p>
          </div>
          <span className="readout text-xs">{tech.confidence}%</span>
        </div>
      ))}
    </div>
  );
}
