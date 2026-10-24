import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Code,
  List,
  Link,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";

interface EditableMarkdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Rows shown after the user expands the editor. */
  expandedRows?: number;
}

export function EditableMarkdown({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  expandedRows,
}: EditableMarkdownProps) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canExpand = rows < (expandedRows ?? rows * 2);
  const visibleRows = isExpanded ? (expandedRows ?? rows * 2) : rows;

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);

      const newValue = beforeText + prefix + selectedText + suffix + afterText;
      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    },
    [value, onChange]
  );

  const insertList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeText = value.substring(0, start);
    const afterText = value.substring(start);

    // Find the start of the current line
    const lineStart = beforeText.lastIndexOf("\n") + 1;
    const currentLine = beforeText.substring(lineStart);

    // If line already starts with "- ", remove it; otherwise add it
    let newValue: string;
    if (currentLine.startsWith("- ")) {
      newValue =
        beforeText.substring(0, lineStart) +
        currentLine.substring(2) +
        afterText;
    } else {
      newValue =
        beforeText.substring(0, lineStart) + "- " + currentLine + afterText;
    }

    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  }, [value, onChange]);

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || "链接文字";
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newValue = beforeText + `[${selectedText}](url)` + afterText;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      // Select "url" part for easy editing
      const urlStart = start + selectedText.length + 3;
      textarea.setSelectionRange(urlStart, urlStart + 3);
    }, 0);
  }, [value, onChange]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </label>
        <div className="flex items-center gap-0.5">
          {canExpand && !showPreview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="h-6 w-6 cursor-pointer p-0"
              title={t(isExpanded ? "editor.fields.collapseEditor" : "editor.fields.expandEditor")}
              aria-label={t(isExpanded ? "editor.fields.collapseEditor" : "editor.fields.expandEditor")}
            >
              {isExpanded ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={`h-6 w-6 cursor-pointer p-0 ${showPreview ? "bg-emerald-500/10 text-emerald-600" : ""}`}
            title={t(showPreview ? "editor.fields.markdownEdit" : "editor.fields.markdownPreview")}
          >
            {showPreview ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {!showPreview && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 cursor-pointer p-0"
              onClick={() => insertMarkdown("**")}
              title="加粗"
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 cursor-pointer p-0"
              onClick={() => insertMarkdown("*")}
              title="斜体"
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 cursor-pointer p-0"
              onClick={() => insertMarkdown("`")}
              title="代码"
            >
              <Code className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 cursor-pointer p-0"
              onClick={insertList}
              title="列表"
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 cursor-pointer p-0"
              onClick={insertLink}
              title="链接"
            >
              <Link className="h-3 w-3" />
            </Button>
          </div>

          {/* Editor */}
          <Textarea
            ref={textareaRef}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || t("editor.fields.markdownPlaceholder")}
            rows={visibleRows}
            className="resize-none text-sm font-mono"
            style={{ fieldSizing: "fixed", minHeight: `${visibleRows * 1.5}rem` }}
          />
        </>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 min-h-[80px]">
          {value ? (
            <div className="editor-markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-zinc-400 italic">暂无内容</p>
          )}
        </div>
      )}
    </div>
  );
}
