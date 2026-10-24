import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditableText } from "../fields/editable-text";
import { EditableDate } from "../fields/editable-date";
import { EditableMarkdown } from "../fields/editable-markdown";
import { EditableList } from "../fields/editable-list";
import { EditableMarkdownList } from "../fields/editable-markdown-list";
import { FieldWrapper } from "../fields/field-wrapper";
import { generateId } from "../../../stores/resume-store";
import type { ResumeSection } from "../../../types/resume";
import type { WorkExperienceContent, WorkExperienceItem } from "../../../types/resume";

interface Props {
  section: ResumeSection;
  onUpdate: (content: Partial<WorkExperienceContent>) => void;
}

export function WorkExperienceSection({ section, onUpdate }: Props) {
  const { t } = useTranslation();
  const content = section.content as Partial<WorkExperienceContent>;
  const items: WorkExperienceItem[] = (content.items || []) as WorkExperienceItem[];

  const addItem = () => {
    const newItem: WorkExperienceItem = {
      id: generateId(),
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: null,
      current: false,
      description: "",
      technologies: [],
      highlights: [],
    };
    onUpdate({ items: [...items, newItem] });
  };

  const updateItem = (index: number, data: Partial<WorkExperienceItem>) => {
    const updated = items.map((item: WorkExperienceItem, i: number) =>
      i === index ? { ...item, ...data } : item
    );
    onUpdate({ items: updated });
  };

  const removeItem = (index: number) => {
    onUpdate({ items: items.filter((_: WorkExperienceItem, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {items.map((item: WorkExperienceItem, index: number) => (
        <div key={item.id || `we-${index}`}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">#{index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer p-1 text-zinc-400 hover:text-red-500"
                onClick={() => removeItem(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <FieldWrapper>
              <EditableText
                label={t("editor.fields.company")}
                value={item.company}
                onChange={(v) => updateItem(index, { company: v })}
              />
              <EditableText
                label={t("editor.fields.position")}
                value={item.position}
                onChange={(v) => updateItem(index, { position: v })}
              />
            </FieldWrapper>
            <FieldWrapper>
              <EditableDate
                label={t("editor.fields.startDate")}
                value={item.startDate}
                onChange={(v) => updateItem(index, { startDate: v })}
              />
              <EditableDate
                label={t("editor.fields.endDate")}
                value={item.endDate || ""}
                onChange={(v) =>
                  updateItem(index, { endDate: v || null, current: !v })
                }
              />
            </FieldWrapper>
            <EditableMarkdown
              label={t("editor.fields.description")}
              value={item.description}
              onChange={(v) => updateItem(index, { description: v })}
              rows={3}
              expandedRows={8}
            />
            <EditableList
              label={t("editor.fields.technologies")}
              items={item.technologies || []}
              onChange={(v) => updateItem(index, { technologies: v })}
            />
            <EditableMarkdownList
              idPrefix={`${item.id}-highlights`}
              label={t("editor.fields.highlights")}
              items={item.highlights || []}
              onChange={(v) => updateItem(index, { highlights: v })}
              addLabel={t("editor.fields.addItem")}
              reorderLabel={t("editor.fields.reorderItem")}
              rows={2}
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full cursor-pointer gap-1"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("editor.fields.addItem")}
      </Button>
    </div>
  );
}
