"use client";

import type { ReactNode } from "react";

function linkifyLine(text: string, keyPrefix: string): ReactNode[] {
  const urlPattern = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]]*)/gi;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const href = match[0];
    nodes.push(
      <a
        key={`${keyPrefix}-url-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#015AFD] underline decoration-[#015AFD]/40 underline-offset-2 hover:decoration-[#015AFD]"
      >
        {href}
      </a>,
    );
    lastIndex = match.index + href.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function isBulletLine(line: string): boolean {
  return /^(\s*[-*•]\s+|\s*\d+\.\s+)/.test(line);
}

function stripListMarker(line: string): string {
  return line.replace(/^(\s*[-*•]\s+|\s*\d+\.\s+)/, "").trim();
}

export function FormattedEmailBody({ body }: { body: string }) {
  const normalized = body.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return <p className="text-[15px] italic text-slate-500">(No message body)</p>;
  }

  const blocks = normalized.split(/\n{2,}/);

  return (
    <div className="space-y-4 text-[15px] leading-[1.75] text-slate-800">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line, index, arr) => {
          if (line.trim() !== "") return true;
          return index > 0 && index < arr.length - 1;
        });

        if (lines.length === 0) return null;

        const allBullets = lines.every((line) => line.trim() === "" || isBulletLine(line));
        const hasBullets = lines.some((line) => isBulletLine(line));

        if (allBullets && hasBullets) {
          const ordered = /^\s*\d+\.\s+/.test(lines.find((l) => isBulletLine(l)) ?? "");
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`block-${blockIndex}`}
              className={
                ordered
                  ? "my-1 list-decimal space-y-2 pl-6 marker:text-slate-600"
                  : "my-1 list-disc space-y-2 pl-6 marker:text-slate-600"
              }
            >
              {lines
                .filter((line) => line.trim())
                .map((line, lineIndex) => (
                  <li key={`block-${blockIndex}-line-${lineIndex}`} className="ps-1">
                    {linkifyLine(stripListMarker(line), `b${blockIndex}-l${lineIndex}`)}
                  </li>
                ))}
            </ListTag>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="m-0 whitespace-pre-wrap">
            {lines.map((line, lineIndex) => (
              <span key={`block-${blockIndex}-line-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {linkifyLine(line, `b${blockIndex}-l${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
