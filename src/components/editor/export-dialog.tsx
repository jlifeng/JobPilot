'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { downloadFromUrl } from '@/lib/utils/download';
import { useResumeStore } from '@/stores/resume-store';
import {
  FileDown,
  FileCode2,
  Globe,
  AlignLeft,
  Braces,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string;
}

type ExportFormat = 'pdf' | 'pdf-one-page' | 'html' | 'txt' | 'markdown' | 'json';
type ExportState = 'idle' | 'exporting' | 'success' | 'error';

const FORMAT_OPTIONS: {
  value: ExportFormat;
  icon: typeof FileDown;
  labelKey: string;
  descKey: string;
  tooltipKey?: string;
}[] = [
  { value: 'pdf', icon: FileDown, labelKey: 'pdf', descKey: 'pdfDescription' },
  { value: 'pdf-one-page', icon: Sparkles, labelKey: 'pdfOnePage', descKey: 'pdfOnePageDescription', tooltipKey: 'pdfOnePageTooltip' },
  { value: 'html', icon: Globe, labelKey: 'html', descKey: 'htmlDescription' },
  { value: 'txt', icon: AlignLeft, labelKey: 'txt', descKey: 'txtDescription' },
  { value: 'markdown', icon: FileCode2, labelKey: 'markdown', descKey: 'markdownDescription' },
  { value: 'json', icon: Braces, labelKey: 'json', descKey: 'jsonDescription' },
];

export function ExportDialog({ open, onOpenChange, resumeId }: ExportDialogProps) {
  const t = useTranslations('export');
  const { currentResume, isDirty, save } = useResumeStore();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [state, setState] = useState<ExportState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setState('idle');
      setErrorMessage('');
      setSelectedFormat('pdf');
    }
  }, [open]);

  const handleExport = useCallback(async () => {
    setState('exporting');
    setErrorMessage('');

    try {
      // Save first if dirty
      if (isDirty) await save();

      const queryFormat = selectedFormat === 'pdf-one-page' ? 'pdf' : selectedFormat;
      const fitParam = selectedFormat === 'pdf-one-page' ? '&fitOnePage=true' : '';

      const title = currentResume?.title || 'resume';
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const extMap: Record<ExportFormat, string> = {
        'pdf': 'pdf',
        'pdf-one-page': 'pdf',
        'html': 'html',
        'txt': 'txt',
        'markdown': 'md',
        'json': 'json',
      };
      downloadFromUrl(
        `/api/resume/${resumeId}/export?format=${queryFormat}${fitParam}`,
        `${title}-${ts}.${extMap[selectedFormat]}`,
      );

      setState('success');
      setTimeout(() => onOpenChange(false), 1500);
    } catch (err: any) {
      setState('error');
      setErrorMessage(err.message || t('error'));
    }
  }, [resumeId, selectedFormat, currentResume, isDirty, save, onOpenChange, t]);

  const isLoading = state === 'exporting';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isLoading) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {state === 'idle' && (
            <TooltipProvider>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FORMAT_OPTIONS.map((format) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormat === format.value;
                  const card = (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`cursor-pointer flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all duration-150 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 ${
                        isSelected
                          ? 'border-zinc-500 dark:border-zinc-400 bg-zinc-50 dark:bg-zinc-800/30'
                          : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {t(format.labelKey)}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {t(format.descKey)}
                      </span>
                    </button>
                  );
                  if (format.tooltipKey) {
                    return (
                      <Tooltip key={format.value}>
                        <TooltipTrigger asChild>{card}</TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6}>
                          {t(format.tooltipKey)}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return card;
                })}
              </div>
            </TooltipProvider>
          )}

          {state === 'exporting' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('exporting')}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mb-3" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('success')}
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {errorMessage || t('error')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          {(state === 'idle' || state === 'error') && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleExport}
                disabled={isLoading}
                className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('export')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
