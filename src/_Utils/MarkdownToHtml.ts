import { EscapeHtml } from "./EscapeHtml";

// A small, deliberately non-exhaustive Markdown-to-HTML converter — covers
// headings, paragraphs, bold/italic, inline code, fenced code blocks, links,
// and unordered lists. Everything is escaped *before* any markdown syntax is
// re-applied as HTML, since this exists to render content fetched from an
// arbitrary remote URL (juel-embed type="markdown") — the source text must
// always be treated as plain text, never as trusted HTML.
export function MarkdownToHtml(markdown: string): string {
    const lines = markdown.split(/\r?\n/);
    const out: string[] = [];
    let inCodeBlock = false;
    let listOpen = false;

    const closeList = () => {
        if (listOpen) {
            out.push("</ul>");
            listOpen = false;
        }
    };

    const inline = (text: string): string => {
        let escaped = EscapeHtml(text);
        escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        return escaped;
    };

    for (const rawLine of lines) {
        if (rawLine.trim().startsWith("```")) {
            out.push(inCodeBlock ? "</code></pre>" : "<pre><code>");
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) {
            out.push(EscapeHtml(rawLine));
            continue;
        }

        const headingMatch = /^(#{1,6})\s+(.*)$/.exec(rawLine);
        if (headingMatch) {
            closeList();
            const level = headingMatch[1].length;
            out.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
            continue;
        }

        const listMatch = /^[-*]\s+(.*)$/.exec(rawLine);
        if (listMatch) {
            if (!listOpen) {
                out.push("<ul>");
                listOpen = true;
            }
            out.push(`<li>${inline(listMatch[1])}</li>`);
            continue;
        }
        closeList();

        if (rawLine.trim() === "") {
            continue;
        }

        out.push(`<p>${inline(rawLine)}</p>`);
    }
    closeList();
    if (inCodeBlock) {
        out.push("</code></pre>");
    }

    return out.join("\n");
}
