'use client';

import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EditableText } from '../fields/editable-text';
import { EditableDate } from '../fields/editable-date';
import { EditableRichText } from '../fields/editable-rich-text';
import { EditableList } from '../fields/editable-list';
import { FieldWrapper } from '../fields/field-wrapper';
import { generateId } from '@/lib/utils';
import type { ResumeSection, ProjectsContent, ProjectItem } from '@/types/resume';

interface Props {
  section: ResumeSection;
  onUpdate: (content: Partial<ProjectsContent>) => void;
}

interface SortableProjectItemProps {
  id: string;
  children: (dragHandleProps: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  }) => React.ReactNode;
}

function SortableProjectItem({ id, children }: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

export function ProjectsSection({ section, onUpdate }: Props) {
  const t = useTranslations('editor.fields');
  const content = section.content as ProjectsContent;
  const rawItems = content.items as ProjectItem[] | { items?: ProjectItem[] } | undefined;
  const items = Array.isArray(rawItems)
    ? rawItems
    : Array.isArray(rawItems?.items)
      ? rawItems.items
      : [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addItem = () => {
    const newItem: ProjectItem = {
      id: generateId(),
      name: '',
      description: '',
      technologies: [],
      highlights: [],
    };
    onUpdate({ items: [...items, newItem] });
  };

  const updateItem = (index: number, data: Partial<ProjectItem>) => {
    const updated = items.map((item, i) => (i === index ? { ...item, ...data } : item));
    onUpdate({ items: updated });
  };

  const removeItem = (index: number) => {
    onUpdate({ items: items.filter((_, i) => i !== index) });
  };

  const reorderItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    onUpdate({ items: arrayMove(items, oldIndex, newIndex) });
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderItems}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {items.map((item, index) => (
              <SortableProjectItem key={item.id} id={item.id}>
                {({ attributes, listeners }) => (
                  <div>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 active:cursor-grabbing dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            aria-label={t('reorderItem')}
                            title={t('reorderItem')}
                            {...attributes}
                            {...listeners}
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-medium text-zinc-400">#{index + 1}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 cursor-pointer p-1 text-zinc-400 hover:text-red-500" onClick={() => removeItem(index)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <FieldWrapper>
                        <EditableText label={t('projectName')} value={item.name} onChange={(v) => updateItem(index, { name: v })} />
                        <EditableText label={t('website')} value={item.url || ''} onChange={(v) => updateItem(index, { url: v })} />
                      </FieldWrapper>
                      <FieldWrapper>
                        <EditableDate label={t('startDate')} value={item.startDate || ''} onChange={(v) => updateItem(index, { startDate: v })} />
                        <EditableDate label={t('endDate')} value={item.endDate || ''} onChange={(v) => updateItem(index, { endDate: v })} />
                      </FieldWrapper>
                      <EditableRichText label={t('description')} value={item.description} onChange={(v) => updateItem(index, { description: v })} />
                      <EditableList label={t('technologies')} items={item.technologies} onChange={(v) => updateItem(index, { technologies: v })} />
                      <EditableList label={t('highlights')} items={item.highlights} onChange={(v) => updateItem(index, { highlights: v })} />
                    </div>
                  </div>
                )}
              </SortableProjectItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={addItem} className="w-full cursor-pointer gap-1">
        <Plus className="h-3.5 w-3.5" />
        {t('addItem')}
      </Button>
    </div>
  );
}
