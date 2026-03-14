"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  Bold,
  Italic,
  Heading1,
  Link,
  Image,
  List,
  CheckSquare,
  Code,
  Quote,
} from "lucide-react";

/* ── Vulcan 다크 테마 ─────────────────────────────── */

const vulcanTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    height: "100%",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    caretColor: "var(--color-primary)",
    padding: "16px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--color-primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--color-primary-bg)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--color-muted) 50%, transparent)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--color-border)",
    color: "var(--color-tertiary)",
    minWidth: "40px",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--color-muted-foreground)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px",
    fontSize: "12px",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  /* 마크다운 문법 하이라이팅 */
  ".cm-header-1": { fontSize: "1.4em", fontWeight: "700", color: "var(--color-foreground)" },
  ".cm-header-2": { fontSize: "1.25em", fontWeight: "600", color: "var(--color-foreground)" },
  ".cm-header-3": { fontSize: "1.1em", fontWeight: "600", color: "var(--color-foreground)" },
  ".cm-header-4, .cm-header-5, .cm-header-6": { fontWeight: "600", color: "var(--color-foreground)" },
  ".cm-strong": { fontWeight: "700" },
  ".cm-emphasis": { fontStyle: "italic" },
  ".cm-strikethrough": { textDecoration: "line-through" },
  ".cm-link": { color: "var(--color-primary)", textDecoration: "underline" },
  ".cm-url": { color: "var(--color-tertiary)" },
  ".cm-meta": { color: "var(--color-tertiary)" },
  ".cm-comment": { color: "var(--color-tertiary)" },
  ".cm-monospace": {
    fontFamily: "'JetBrains Mono', monospace",
    backgroundColor: "var(--color-muted)",
    borderRadius: "3px",
    padding: "1px 4px",
  },
}, { dark: true });

/* ── 에디터 서식 유틸 ────────────────────────────────── */

function wrapSelection(view: EditorView, before: string, after: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: to + before.length },
  });
  view.focus();
}

function insertAtLineStart(view: EditorView, prefix: string) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  view.dispatch({
    changes: { from: line.from, insert: prefix },
    selection: { anchor: from + prefix.length },
  });
  view.focus();
}

function insertLinkTemplate(view: EditorView) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  if (selected) {
    const text = `[${selected}](url)`;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
    });
  } else {
    const text = "[링크텍스트](url)";
    view.dispatch({
      changes: { from, insert: text },
      selection: { anchor: from + 1, head: from + 6 },
    });
  }
  view.focus();
}

/* ── 툴바 버튼 정의 ──────────────────────────────────── */

interface ToolbarAction {
  icon: typeof Bold;
  title: string;
  action: (view: EditorView) => void;
}

const toolbarActions: ToolbarAction[] = [
  { icon: Bold, title: "굵게 (Ctrl+B)", action: (v) => wrapSelection(v, "**", "**") },
  { icon: Italic, title: "기울임 (Ctrl+I)", action: (v) => wrapSelection(v, "*", "*") },
  { icon: Heading1, title: "제목", action: (v) => insertAtLineStart(v, "## ") },
  { icon: Link, title: "링크 (Ctrl+K)", action: (v) => insertLinkTemplate(v) },
  { icon: Image, title: "이미지", action: (v) => wrapSelection(v, "![alt](", ")") },
  { icon: List, title: "목록", action: (v) => insertAtLineStart(v, "- ") },
  { icon: CheckSquare, title: "체크박스", action: (v) => insertAtLineStart(v, "- [ ] ") },
  { icon: Code, title: "코드", action: (v) => wrapSelection(v, "`", "`") },
  { icon: Quote, title: "인용", action: (v) => insertAtLineStart(v, "> ") },
];

/* ── 에디터 컴포넌트 ──────────────────────────────── */

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onImagePaste?: (file: File) => void;
  readOnly?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  onCancel,
  onImagePaste,
  readOnly = false,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onCancelRef = useRef(onCancel);
  const onImagePasteRef = useRef(onImagePaste);

  // ref 업데이트
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  onCancelRef.current = onCancel;
  onImagePasteRef.current = onImagePaste;

  const insertAtCursor = useCallback((text: string) => {
    const view = viewRef.current;
    if (!view) return;
    const { from } = view.state.selection.main;
    view.dispatch({
      changes: { from, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const formatKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onSaveRef.current?.();
          return true;
        },
      },
      {
        key: "Escape",
        run: () => {
          onCancelRef.current?.();
          return true;
        },
      },
      {
        key: "Mod-b",
        run: (view) => {
          wrapSelection(view, "**", "**");
          return true;
        },
      },
      {
        key: "Mod-i",
        run: (view) => {
          wrapSelection(view, "*", "*");
          return true;
        },
      },
      {
        key: "Mod-k",
        run: (view) => {
          insertLinkTemplate(view);
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    /* 이미지 붙여넣기 + 드래그앤드롭 핸들러 */
    const fileHandler = EditorView.domEventHandlers({
      paste: (event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file && onImagePasteRef.current) {
              event.preventDefault();
              onImagePasteRef.current(file);
              return true;
            }
          }
        }
        return false;
      },
      drop: (event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        for (const file of files) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            onImagePasteRef.current?.(file);
            return true;
          }
        }
        return false;
      },
      dragover: (event) => {
        const types = event.dataTransfer?.types;
        if (types?.includes("Files")) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        formatKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        history(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        indentOnInput(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown(),
        vulcanTheme,
        updateListener,
        fileHandler,
        cmPlaceholder("마크다운을 입력하세요..."),
        EditorState.readOnly.of(readOnly),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // value는 초기값으로만 사용 - 외부 변경 시 재생성하지 않음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // 외부에서 value가 변경되면 에디터 동기화 (저장 후 서버 응답 반영 등)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div className="flex h-full flex-col">
      {/* 툴바 */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-[var(--color-border)] px-2 py-1.5">
          {toolbarActions.map(({ icon: Icon, title, action }) => (
            <button
              key={title}
              type="button"
              title={title}
              onClick={() => viewRef.current && action(viewRef.current)}
              className="flex shrink-0 items-center justify-center rounded p-2 min-h-[44px] min-w-[44px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      )}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-hidden"
        data-insert-at-cursor={insertAtCursor}
      />
    </div>
  );
}
