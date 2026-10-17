'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bold,
  Code,
  Eye,
  EyeOff,
  Italic,
  Link,
  List,
  Strikethrough,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { applyInlineMarkdown, toggleMarkdownList } from '@/lib/markdown-toolbar';

interface EditableMarkdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function EditableMarkdown({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: EditableMarkdownProps) {
  const t = useTranslations('editor.fields');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyInline = (action: 'bold' | 'italic' | 'strike' | 'code' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = applyInlineMarkdown(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      action,
    );
    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const applyList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

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
  };

  const toolbarButton = (
    action: 'bold' | 'italic' | 'strike' | 'code' | 'link',
    title: string,
    icon: React.ReactNode,
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 w-6 cursor-pointer p-0"
      onClick={() => applyInline(action)}
      title={title}
      aria-label={title}
    >
      {icon}
    </Button>
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview((current) => !current)}
          className={`h-6 w-6 cursor-pointer p-0 ${showPreview ? 'bg-emerald-500/10 text-emerald-600' : ''}`}
          title={showPreview ? t('markdownEdit') : t('markdownPreview')}
          aria-label={showPreview ? t('markdownEdit') : t('markdownPreview')}
        >
          {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>

      {!showPreview && (
        <>
          <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {toolbarButton('bold', t('markdownBold'), <Bold className="h-3 w-3" />)}
            {toolbarButton('italic', t('markdownItalic'), <Italic className="h-3 w-3" />)}
            {toolbarButton('strike', t('markdownStrike'), <Strikethrough className="h-3 w-3" />)}
            {toolbarButton('code', t('markdownCode'), <Code className="h-3 w-3" />)}
            {toolbarButton('link', t('markdownLink'), <Link className="h-3 w-3" />)}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 cursor-pointer p-0"
              onClick={applyList}
              title={t('markdownList')}
              aria-label={t('markdownList')}
            >
              <List className="h-3 w-3" />
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder || t('markdownPlaceholder')}
            rows={rows}
            className="resize-none font-mono text-sm"
          />
        </>
      )}

      {showPreview && (
        <div className="editor-markdown-preview min-h-[80px] rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="italic text-zinc-400">{t('markdownEmpty')}</p>
          )}
        </div>
      )}
    </div>
  );
}
