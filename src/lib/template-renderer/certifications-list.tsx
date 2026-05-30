import React from 'react';
import type { CertificationItem } from '@/types/resume';
import { esc } from './template-contract';

interface CertificationListProps {
  items: CertificationItem[];
  listClassName?: string;
  itemClassName?: string;
  rowClassName?: string;
  titleClassName?: string;
  issuerClassName?: string;
  dateClassName?: string;
  titleStyle?: React.CSSProperties;
  issuerStyle?: React.CSSProperties;
  dateStyle?: React.CSSProperties;
}

interface CertificationListHtmlOptions {
  listClass?: string;
  itemClass?: string;
  rowClass?: string;
  titleClass?: string;
  issuerClass?: string;
  dateClass?: string;
  titleStyle?: string;
  issuerStyle?: string;
  dateStyle?: string;
}

export function CertificationList({
  items,
  listClassName = 'space-y-1.5 list-disc pl-5',
  itemClassName = 'pl-1 text-sm',
  rowClassName = 'flex items-baseline justify-between gap-3',
  titleClassName = 'font-semibold text-zinc-800',
  issuerClassName = 'text-zinc-500',
  dateClassName = 'shrink-0 text-xs text-zinc-400',
  titleStyle,
  issuerStyle,
  dateStyle,
}: CertificationListProps): React.ReactElement {
  return (
    <ul className={listClassName}>
      {items.map((item) => (
        <li key={item.id} className={itemClassName}>
          <div className={rowClassName}>
            <div>
              <span className={titleClassName} style={titleStyle}>{item.name}</span>
              {item.issuer && <span className={issuerClassName} style={issuerStyle}> — {item.issuer}</span>}
            </div>
            {item.date && <span className={dateClassName} style={dateStyle}>{item.date}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function buildCertificationListHtml(
  items: CertificationItem[],
  {
    listClass = 'space-y-1.5 list-disc pl-5',
    itemClass = 'pl-1 text-sm',
    rowClass = 'flex items-baseline justify-between gap-3',
    titleClass = 'font-semibold text-zinc-800',
    issuerClass = 'text-zinc-500',
    dateClass = 'shrink-0 text-xs text-zinc-400',
    titleStyle,
    issuerStyle,
    dateStyle,
  }: CertificationListHtmlOptions = {},
): string {
  return `<ul class="${listClass}">${items.map((item) => `<li class="${itemClass}"><div class="${rowClass}"><div><span class="${titleClass}"${titleStyle ? ` style="${titleStyle}"` : ''}>${esc(item.name)}</span>${item.issuer ? `<span class="${issuerClass}"${issuerStyle ? ` style="${issuerStyle}"` : ''}> — ${esc(item.issuer)}</span>` : ''}</div>${item.date ? `<span class="${dateClass}"${dateStyle ? ` style="${dateStyle}"` : ''}>${esc(item.date)}</span>` : ''}</div></li>`).join('')}</ul>`;
}
