import { GripVertical, Plus, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SortableStringItemProps {
  id: string;
  value: string;
  placeholder?: string;
  dragLabel: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}

function SortableStringItem({
  id,
  value,
  placeholder,
  dragLabel,
  onChange,
  onRemove,
}: SortableStringItemProps) {
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
      className="flex items-start gap-1"
    >
      <button
        type="button"
        className="mt-0.5 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 active:cursor-grabbing dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        aria-label={dragLabel}
        title={dragLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="resize-none text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 cursor-pointer p-0 text-zinc-400 hover:text-red-500"
        onClick={onRemove}
        aria-label="删除条目"
        title="删除条目"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export interface SortableStringListProps {
  idPrefix: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  reorderLabel: string;
  placeholder?: string;
}

export function SortableStringList({
  idPrefix,
  label,
  items,
  onChange,
  addLabel,
  reorderLabel,
  placeholder,
}: SortableStringListProps) {
  const values = items || [];
  const sortableIds = values.map((_, index) => `${idPrefix}-${index}`);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const updateItem = (index: number, value: string) => {
    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  const reorderItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(values, oldIndex, newIndex));
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderItems}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {values.map((value, index) => (
              <SortableStringItem
                key={sortableIds[index]}
                id={sortableIds[index]}
                value={value}
                placeholder={placeholder}
                dragLabel={reorderLabel}
                onChange={(nextValue) => updateItem(index, nextValue)}
                onRemove={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              />
            ))}
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
