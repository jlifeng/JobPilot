import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Circle, RectangleVertical, X } from "lucide-react";
import { useResumeStore } from "../../../stores/resume-store";
import type { ResumeSection, PersonalInfoContent } from "../../../types/resume";
import { EditableSelect } from "../fields/editable-select";
import { EditableText } from "../fields/editable-text";
import { FieldWrapper } from "../fields/field-wrapper";

interface Props {
  section: ResumeSection;
  onUpdate: (content: Partial<PersonalInfoContent>) => void;
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = image;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = reject;
      image.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PersonalInfoSection({ section, onUpdate }: Props) {
  const { t } = useTranslation();
  const content = section.content as Partial<PersonalInfoContent>;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentResume, updateTheme } = useResumeStore();
  const avatarStyle = currentResume?.themeConfig?.avatarStyle || "oneInch";

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await resizeImage(file, 200);
    onUpdate({ avatar: dataUrl });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
        >
          {content.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.avatar}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-6 w-6 text-zinc-400" />
          )}
        </button>
        <div className="flex flex-col gap-2">
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
            {[
              {
                value: "circle" as const,
                icon: Circle,
                label: t("themeEditor.avatarCircle"),
              },
              {
                value: "oneInch" as const,
                icon: RectangleVertical,
                label: t("themeEditor.avatarOneInch"),
              },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateTheme({ avatarStyle: value })}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all duration-200 ${
                  avatarStyle === value
                    ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
          {content.avatar ? (
            <button
              type="button"
              onClick={() => onUpdate({ avatar: "" })}
              className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
              {t("editor.fields.clear")}
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.fullName")}
          value={content.fullName || ""}
          onChange={(value) => onUpdate({ fullName: value })}
        />
        <EditableText
          label={t("editor.fields.jobTitle")}
          value={content.jobTitle || ""}
          onChange={(value) => onUpdate({ jobTitle: value })}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.age")}
          value={content.age || ""}
          onChange={(value) => onUpdate({ age: value })}
        />
        <EditableSelect
          label={t("editor.fields.gender")}
          value={content.gender || ""}
          onChange={(value) => onUpdate({ gender: value })}
          options={t("editor.fields.genderOptions")
            .split(",")
            .map((option) => ({ label: option, value: option }))}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableSelect
          label={t("editor.fields.politicalStatus")}
          value={content.politicalStatus || ""}
          onChange={(value) => onUpdate({ politicalStatus: value })}
          options={t("editor.fields.politicalStatusOptions")
            .split(",")
            .map((option) => ({ label: option, value: option }))}
        />
        <EditableSelect
          label={t("editor.fields.ethnicity")}
          value={content.ethnicity || ""}
          onChange={(value) => onUpdate({ ethnicity: value })}
          options={t("editor.fields.ethnicityOptions")
            .split(",")
            .map((option) => ({ label: option, value: option }))}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.hometown")}
          value={content.hometown || ""}
          onChange={(value) => onUpdate({ hometown: value })}
        />
        <EditableSelect
          label={t("editor.fields.maritalStatus")}
          value={content.maritalStatus || ""}
          onChange={(value) => onUpdate({ maritalStatus: value })}
          options={t("editor.fields.maritalStatusOptions")
            .split(",")
            .map((option) => ({ label: option, value: option }))}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.yearsOfExperience")}
          value={content.yearsOfExperience || ""}
          onChange={(value) => onUpdate({ yearsOfExperience: value })}
        />
        <EditableSelect
          label={t("editor.fields.educationLevel")}
          value={content.educationLevel || ""}
          onChange={(value) => onUpdate({ educationLevel: value })}
          options={t("editor.fields.educationLevelOptions")
            .split(",")
            .map((option) => ({ label: option, value: option }))}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.availability")}
          value={content.availability || ""}
          onChange={(value) => onUpdate({ availability: value })}
        />
        <EditableText
          label={t("editor.fields.expectedSalary")}
          value={content.expectedSalary || ""}
          onChange={(value) => onUpdate({ expectedSalary: value })}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.email")}
          value={content.email || ""}
          onChange={(value) => onUpdate({ email: value })}
          type="email"
        />
        <EditableText
          label={t("editor.fields.phone")}
          value={content.phone || ""}
          onChange={(value) => onUpdate({ phone: value })}
          type="tel"
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.wechat")}
          value={content.wechat || ""}
          onChange={(value) => onUpdate({ wechat: value })}
        />
        <EditableText
          label={t("editor.fields.location")}
          value={content.location || ""}
          onChange={(value) => onUpdate({ location: value })}
        />
      </FieldWrapper>

      <FieldWrapper>
        <EditableText
          label={t("editor.fields.website")}
          value={content.website || ""}
          onChange={(value) => onUpdate({ website: value })}
        />
      </FieldWrapper>
    </div>
  );
}
