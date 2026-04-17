/**
 * ACP Agent 7 (#866) — lightweight syntax highlighters for the Runs
 * explorer. We deliberately avoid pulling in `react-syntax-highlighter`
 * or `prismjs` for this surface: the snippets are short (a single
 * prompt or response per pane), they are read-only, and the bundle
 * already ships with no syntax-highlighting dependency. A small
 * regex-based colorizer keeps the page responsive and inspectable.
 *
 * `JsonHighlight` formats any JSON-serializable value with token-level
 * colors (keys, strings, numbers, booleans, null). `MarkdownHighlight`
 * applies a minimal token pass (headings, fences, bold/italic, links,
 * inline code) so the response panel stays readable when the agent
 * answered with markdown.
 *
 * Both components escape HTML before colorizing — never inject the raw
 * `dangerouslySetInnerHTML` payload without going through `escape()`.
 */
import { useMemo } from "react";

const JSON_TOKEN_RE = /("(\\.|[^"\\])*"\s*:)|("(\\.|[^"\\])*")|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function colorizeJson(raw: string): string {
  return escapeHtml(raw).replace(JSON_TOKEN_RE, (match) => {
    let cls = "text-amber-500";
    if (/^"/.test(match)) {
      cls = /:$/.test(match) ? "text-sky-500" : "text-emerald-500";
    } else if (/true|false/.test(match)) {
      cls = "text-purple-500";
    } else if (/null/.test(match)) {
      cls = "text-muted-foreground";
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

export function JsonHighlight({ value }: { value: unknown }) {
  const html = useMemo(() => {
    let pretty: string;
    if (typeof value === "string") {
      try {
        pretty = JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        pretty = value;
      }
    } else {
      try {
        pretty = JSON.stringify(value, null, 2);
      } catch {
        pretty = String(value);
      }
    }
    return colorizeJson(pretty);
  }, [value]);

  return (
    <pre
      className="text-xs whitespace-pre-wrap rounded border bg-muted/20 p-3 max-h-80 overflow-auto font-mono"
      // Safe: `colorizeJson` escapes HTML before injecting span markup.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function colorizeMarkdown(raw: string): string {
  let html = escapeHtml(raw);
  // fenced code blocks
  html = html.replace(
    /```([\s\S]*?)```/g,
    (_m, body: string) =>
      `<span class="block rounded bg-card/80 border border-border/40 px-2 py-1 my-1 text-foreground">${body}</span>`,
  );
  // inline code
  html = html.replace(
    /`([^`\n]+)`/g,
    '<span class="rounded bg-muted px-1 text-foreground">$1</span>',
  );
  // headings
  html = html.replace(
    /^(#{1,6})\s+(.+)$/gm,
    (_m, hashes: string, text: string) =>
      `<span class="block font-semibold text-foreground">${hashes} ${text}</span>`,
  );
  // bold
  html = html.replace(
    /\*\*([^*\n]+)\*\*/g,
    '<span class="font-semibold text-foreground">$1</span>',
  );
  // italics
  html = html.replace(
    /(^|\W)\*([^*\n]+)\*/g,
    '$1<span class="italic text-foreground">$2</span>',
  );
  // links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<span class="text-primary underline">$1</span> <span class="text-muted-foreground">($2)</span>',
  );
  return html;
}

export function MarkdownHighlight({ source }: { source: string }) {
  const html = useMemo(() => colorizeMarkdown(source), [source]);
  return (
    <pre
      className="text-xs whitespace-pre-wrap rounded border bg-muted/20 p-3 max-h-80 overflow-auto"
      // Safe: `colorizeMarkdown` escapes HTML before token replacement.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Heuristic: try JSON first, fall back to markdown. Used by the
 * Prompt/Response panels where we don't know the format up front.
 */
export function AutoHighlight({ source }: { source: string }) {
  const trimmed = source.trim();
  const looksJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (looksJson) {
    try {
      JSON.parse(trimmed);
      return <JsonHighlight value={trimmed} />;
    } catch {
      /* fall through */
    }
  }
  return <MarkdownHighlight source={source} />;
}
