import { ExternalLink } from "lucide-react";

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string;
}

interface WebSourcesProps {
  sources: WebSource[];
}

const WebSources = ({ sources }: WebSourcesProps) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Sources</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-start gap-2 w-52 bg-background border border-border rounded-lg p-2.5 hover:border-accent/50 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex-shrink-0 mt-0.5">
              <img
                src={source.favicon}
                alt=""
                className="w-4 h-4 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-foreground line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                  {source.title}
                </span>
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{source.domain}</p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-muted-foreground/60 font-mono mt-0.5">[{i + 1}]</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default WebSources;
