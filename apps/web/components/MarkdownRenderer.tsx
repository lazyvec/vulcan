"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import wikiLinkPlugin from "remark-wiki-link";

const remarkPlugins = [
  remarkGfm,
  remarkBreaks,
  [
    wikiLinkPlugin,
    {
      hrefTemplate: (permalink: string) => `/vault?note=${encodeURIComponent(permalink)}`,
      aliasDivider: "|",
    },
  ],
] as Parameters<typeof ReactMarkdown>[0]["remarkPlugins"];

export function MarkdownRenderer({
  content,
  onWikiLink,
}: {
  content: string;
  onWikiLink?: (path: string) => void;
}) {
  return (
    <div className="prose prose-invert max-w-none text-[var(--color-foreground)]">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={{
          a: ({ href, children, className }) => {
            const isWikiLink = className?.includes("internal");
            if (isWikiLink && onWikiLink && href) {
              const notePath = decodeURIComponent(
                href.replace("/vault?note=", ""),
              );
              return (
                <button
                  type="button"
                  onClick={() => onWikiLink(notePath)}
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline decoration-dotted cursor-pointer"
                >
                  {children}
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] underline"
              >
                {children}
              </a>
            );
          },
          code: ({ className, children, ...props }) => {
            const isBlock = className?.startsWith("language-");
            if (isBlock) {
              return (
                <code
                  className={`${className} block overflow-x-auto rounded-[var(--radius-control)] bg-[var(--color-muted)] p-3 text-sm`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[var(--color-border)] text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[var(--color-border)] px-3 py-2">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
