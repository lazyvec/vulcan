"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import wikiLinkPlugin from "remark-wiki-link";
import rehypeHighlight from "rehype-highlight";
import type { Root, Text, PhrasingContent } from "mdast";

/* ── 커스텀 remark 플러그인: ==highlight== ──────────── */

const remarkHighlight = () => {
  return (tree: Root) => {
    visitText(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      const regex = /==(.+?)==/g;
      let match: RegExpExecArray | null;
      const children: PhrasingContent[] = [];
      let lastIndex = 0;

      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: "text", value: value.slice(lastIndex, match.index) });
        }
        children.push({
          type: "html",
          value: `<mark>${escapeHtml(match[1])}</mark>`,
        } as unknown as PhrasingContent);
        lastIndex = regex.lastIndex;
      }

      if (children.length === 0) return;
      if (lastIndex < value.length) {
        children.push({ type: "text", value: value.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...children);
    });
  };
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function visitText(tree: Root, fn: (node: Text, index: number, parent: any) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function visit(node: any, index?: number, parent?: any) {
    if (node.type === "text" && parent && index !== undefined) {
      fn(node, index, parent);
    }
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        visit(node.children[i], i, node);
      }
    }
  }
  visit(tree);
}

/* ── 커스텀 remark 플러그인: Obsidian Callout ────────── */

const CALLOUT_ICONS: Record<string, string> = {
  note: "📝",
  tip: "💡",
  warning: "⚠️",
  danger: "🔴",
  info: "ℹ️",
  example: "📌",
  quote: "💬",
  abstract: "📋",
  summary: "📋",
  todo: "☑️",
  success: "✅",
  question: "❓",
  failure: "❌",
  bug: "🐛",
};

const CALLOUT_COLORS: Record<string, string> = {
  note: "var(--color-primary)",
  tip: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  example: "#8b5cf6",
  quote: "var(--color-tertiary)",
  abstract: "#3b82f6",
  summary: "#3b82f6",
  todo: "#3b82f6",
  success: "#10b981",
  question: "#f59e0b",
  failure: "#ef4444",
  bug: "#ef4444",
};

const remarkCallout = () => {
  return (tree: Root) => {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== "blockquote" || !node.children.length) continue;

      const first = node.children[0];
      if (first.type !== "paragraph" || !first.children.length) continue;

      const firstChild = first.children[0];
      if (firstChild.type !== "text") continue;

      const match = firstChild.value.match(/^\[!(\w+)\]\s*(.*)/);
      if (!match) continue;

      const calloutType = match[1].toLowerCase();
      const title = match[2] || calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
      const icon = CALLOUT_ICONS[calloutType] || "📝";
      const color = CALLOUT_COLORS[calloutType] || "var(--color-primary)";

      // 첫 줄에서 제목 이후 텍스트가 있으면 제거
      if (firstChild.value.indexOf("\n") !== -1) {
        firstChild.value = firstChild.value.slice(firstChild.value.indexOf("\n") + 1);
      } else {
        first.children.shift();
      }
      // 나머지 paragraph 내용이 있으면 유지
      if (first.children.length === 0) {
        node.children.shift();
      }

      // 나머지 children에서 본문 텍스트 추출
      const bodyParts: string[] = [];
      for (const child of node.children) {
        if (child.type === "paragraph") {
          const texts = child.children
            .filter((c): c is Text => c.type === "text")
            .map((c) => escapeHtml(c.value));
          if (texts.length > 0) bodyParts.push(texts.join(""));
        }
      }
      const bodyHtml = bodyParts.length > 0
        ? `<div style="margin-top:4px;color:var(--color-foreground)">${bodyParts.join("<br>")}</div>`
        : "";

      // blockquote를 callout HTML로 교체
      tree.children[i] = {
        type: "html",
        value: `<div class="callout callout-${calloutType}" style="border-left:4px solid ${color};background:color-mix(in srgb, ${color} 8%, transparent);border-radius:var(--radius-card);padding:12px 16px;margin:16px 0"><div style="font-weight:600;margin-bottom:4px;color:${color}">${icon} ${escapeHtml(title)}</div>${bodyHtml}</div>`,
      } as unknown as (typeof tree.children)[number];
    }
  };
};

/* ── 플러그인 설정 ───────────────────────────────────── */

const remarkPlugins = [
  remarkGfm,
  remarkBreaks,
  remarkHighlight,
  remarkCallout,
  [
    wikiLinkPlugin,
    {
      hrefTemplate: (permalink: string) => `/vault?note=${encodeURIComponent(permalink)}`,
      aliasDivider: "|",
    },
  ],
] as Parameters<typeof ReactMarkdown>[0]["remarkPlugins"];

const rehypePlugins = [rehypeHighlight];

/* ── 컴포넌트 ────────────────────────────────────────── */

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
        rehypePlugins={rehypePlugins}
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
          img: ({ src, alt, ...props }) => {
            // 상대경로 이미지를 vault files API로 라우팅
            const srcStr = typeof src === "string" ? src : "";
            let resolvedSrc = srcStr;
            if (
              srcStr &&
              !srcStr.startsWith("http://") &&
              !srcStr.startsWith("https://") &&
              !srcStr.startsWith("/") &&
              !srcStr.startsWith("data:")
            ) {
              resolvedSrc = `/api/vault/files/${srcStr.split("/").map(encodeURIComponent).join("/")}`;
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedSrc}
                alt={alt ?? ""}
                className="max-w-full rounded-[var(--radius-control)]"
                loading="lazy"
                {...props}
              />
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
          mark: ({ children }) => (
            <mark className="rounded px-0.5 bg-yellow-500/30 text-[var(--color-foreground)]">
              {children}
            </mark>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
