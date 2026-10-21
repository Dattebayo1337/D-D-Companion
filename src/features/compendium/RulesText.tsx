import type { ReactNode } from "react";

// Source text is rendered as React nodes, never as HTML or executable links.
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2).replace(/^_|_$/g, "")}</strong>
      ) : /^[*_]/.test(part) ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );
}
export function RulesText({ text }: { text: string }) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^>\s?/, ""));
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i++]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
      }
      blocks.push(
        <div className="rules-table" key={i}>
          <table>
            <thead>
              <tr>
                {rows[0]?.map((c, j) => (
                  <th key={j}>{inline(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, k) => (
                <tr key={k}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^#{1,6} /.test(line)) {
      blocks.push(<h4 key={i}>{inline(line.replace(/^#+ /, ""))}</h4>);
      i++;
    } else if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i]))
        items.push(lines[i++].slice(2));
      blocks.push(
        <ul key={i}>
          {items.map((s, j) => (
            <li key={j}>{inline(s)}</li>
          ))}
        </ul>,
      );
    } else {
      const paragraph = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(\||#{1,6} |[-*] )/.test(lines[i])
      )
        paragraph.push(lines[i++]);
      blocks.push(<p key={i}>{inline(paragraph.join("\n"))}</p>);
    }
  }
  return <div className="prose rules-text">{blocks}</div>;
}
