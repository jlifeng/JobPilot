import { useRef, useState } from "react";
import {
  Bold,
  Code,
  Eye,
  EyeOff,
  GripVertical,
  Italic,
  Link,
  List,
  Plus,
  Strikethrough,
  X,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { applyInlineMarkdown, toggleMarkdownList } from "@/lib/markdown-toolbar";
import { useTranslation } from "react-i18next";

interface EditableMarkdownListProps {
  idPrefix: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  reorderLabel: string;
  placeholder?: string;
  rows?: number;
}

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

function insertInlineMarkdown(
  textarea: HTMLTextAreaElement,
  value: string,
  action: "bold" | "italic" | "strike" | "code" | "link",
  fallback: string,
  onChange: (value: string) => void,
) {
  const result = applyInlineMarkdown(
    value,
    textarea.selectionStart,
    textarea.selectionEnd,
    action,
    fallback,
  );
  onChange(result.value);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  });
}

function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const { t } = useTranslation();

  const withTextarea = (action: (textarea: HTMLTextAreaElement) => void) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    action(textarea);
  };

  const toggleList = () => {
    withTextarea((textarea) => {
      const result = toggleMarkdownList(
        value,
        textarea.selectionStart,
        textarea.selectionEnd,
      );
      onChange(result.value);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    });
  };

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-800">
      <ToolbarButton
        label={t("editor.fields.markdownBold")}
        onClick={() => withTextarea((textarea) =>
          insertInlineMarkdown(textarea, value, "bold", "", onChange))}
      >
        <Bold className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label={t("editor.fields.markdownItalic")}
        onClick={() => withTextarea((textarea) =>
          insertInlineMarkdown(textarea, value, "italic", "", onChange))}
      >
        <Italic className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label={t("editor.fields.markdownStrike")}
        onClick={() => withTextarea((textarea) =>
          insertInlineMarkdown(textarea, value, "strike", "", onChange))}
      >
        <Strikethrough className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label={t("editor.fields.markdownCode")}
        onClick={() => withTextarea((textarea) =>
          insertInlineMarkdown(textarea, value, "code", "", onChange))}
      >
        <Code className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label={t("editor.fields.markdownLink")}
        onClick={() => withTextarea((textarea) =>
          insertInlineMarkdown(textarea, value, "link", "", onChange))}
      >
        <Link className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton label={t("editor.fields.markdownList")} onClick={toggleList}>
        <List className="h-3 w-3" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 w-6 cursor-pointer p-0"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function MarkdownHighlightItem({
  id,
  index,
  value,
  onChange,
  onRemove,
  preview,
  onTogglePreview,
  dragLabel,
  placeholder,
  rows,
}: {
  id: string;
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  dragLabel: string;
  placeholder?: string;
  rows: number;
}) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
      className="rounded-md border border-zinc-200 p-2 dark:border-zinc-700"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label={dragLabel}
            title={dragLabel}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </button>
          <span className="text-[11px] font-medium text-zinc-400">#{index + 1}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-6 w-6 cursor-pointer p-0", preview && "bg-emerald-500/10 text-emerald-600")}
            onClick={onTogglePreview}
            aria-label={preview ? t("editor.fields.markdownEdit") : t("editor.fields.markdownPreview")}
            title={preview ? t("editor.fields.markdownEdit") : t("editor.fields.markdownPreview")}
          >
            {preview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 cursor-pointer p-0 text-zinc-400 hover:text-red-500"
            onClick={onRemove}
            aria-label={t("editor.fields.removeItem")}
            title={t("editor.fields.removeItem")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="editor-markdown-preview min-h-[52px] rounded-md bg-white px-2.5 py-2 dark:bg-zinc-900">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-xs italic text-zinc-400">{t("editor.fields.markdownEmpty")}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} />
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={rows}
            className="min-h-16 resize-none font-mono text-xs"
            placeholder={placeholder || t("editor.fields.markdownPlaceholder")}
          />
        </div>
      )}
    </div>
  );
}

export function EditableMarkdownList({
  idPrefix,
  label,
  items,
  onChange,
  addLabel,
  reorderLabel,
  placeholder,
  rows = 2,
}: EditableMarkdownListProps) {
  const values = items || [];
  const safePrefix = idPrefix.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortableIds = values.map((_, index) => `${safePrefix}-${index}`);
  const [previewIds, setPreviewIds] = useState<Set<number>>(() => new Set());

  const updateItem = (index: number, value: string) => {
    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  };

  const reorderItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(values, oldIndex, newIndex));
  };

  const togglePreview = (index: number) => {
    setPreviewIds((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderItems}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {values.map((value, index) => {
              const id = sortableIds[index];
              return (
                <MarkdownHighlightItem
                  key={id}
                  id={id}
                  index={index}
                  value={value}
                  onChange={(nextValue) => updateItem(index, nextValue)}
                  onRemove={() => removeItem(index)}
                  preview={previewIds.has(index)}
                  onTogglePreview={() => togglePreview(index)}
                  dragLabel={reorderLabel}
                  placeholder={placeholder}
                  rows={rows}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, ""])}
        className="h-7 cursor-pointer gap-1 text-xs"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </Button>
    </div>
  );
}
