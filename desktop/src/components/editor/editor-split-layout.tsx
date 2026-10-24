import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampEditorPanePercent,
  editorPanePercentForPointer,
} from "../../lib/editor-layout";

interface EditorSplitLayoutProps {
  editorPercent: number;
  onEditorPercentChange: (percent: number) => void;
  onReset: () => void;
  editor: React.ReactNode;
  preview: React.ReactNode;
}

const KEYBOARD_STEP = 4;

/**
 * Two-pane layout with a keyboard-accessible splitter. The splitter owns the
 * pointer capture, so dragging does not require window-level listeners.
 */
export function EditorSplitLayout({
  editorPercent,
  onEditorPercentChange,
  onReset,
  editor,
  preview,
}: EditorSplitLayoutProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromPointer = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    onEditorPercentChange(
      editorPanePercentForPointer(clientX, rect.left, rect.width),
    );
  };

  const adjustByKeyboard = (delta: number) => {
    const width = containerRef.current?.getBoundingClientRect().width ?? 0;
    onEditorPercentChange(
      clampEditorPanePercent(editorPercent + delta, width),
    );
  };

  // A resized window can make a stored split violate the current pixel
  // minimums. Re-clamp the persisted choice against the live container width.
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      const width = element.getBoundingClientRect().width;
      const clamped = clampEditorPanePercent(editorPercent, width);
      if (Math.abs(clamped - editorPercent) > 0.01) {
        onEditorPercentChange(clamped);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [editorPercent, onEditorPercentChange]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl"
      style={{
        display: "grid",
        gridTemplateColumns: `minmax(0, ${editorPercent}fr) 9px minmax(0, ${
          100 - editorPercent
        }fr)`,
      }}
    >
      <div className="flex min-h-0 min-w-0 gap-3 overflow-hidden">
        {editor}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={25}
        aria-valuemax={75}
        aria-valuenow={Math.round(editorPercent)}
        aria-label={t("editor.layout.dragHint")}
        tabIndex={0}
        title={t("editor.layout.resetSplit")}
        className={cn(
          "group relative z-10 flex cursor-col-resize touch-none items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400",
          isDragging ? "bg-blue-100 dark:bg-blue-950/60" : "hover:bg-blue-50 dark:hover:bg-blue-950/30",
        )}
        onDoubleClick={onReset}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          draggingRef.current = true;
          setIsDragging(true);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          updateFromPointer(event.clientX);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          draggingRef.current = false;
          setIsDragging(false);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          setIsDragging(false);
        }}
        onLostPointerCapture={() => {
          draggingRef.current = false;
          setIsDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            adjustByKeyboard(-KEYBOARD_STEP);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            adjustByKeyboard(KEYBOARD_STEP);
          } else if (event.key === "Home") {
            event.preventDefault();
            onReset();
          }
        }}
      >
        <span
          className={cn(
            "flex h-8 w-5 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:text-blue-500 dark:text-zinc-600 dark:group-hover:text-blue-300",
            isDragging && "text-blue-600 dark:text-blue-300",
          )}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 overflow-hidden">
        {preview}
      </div>
    </div>
  );
}
