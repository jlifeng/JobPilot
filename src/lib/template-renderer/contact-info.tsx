/**
 * Shared ContactInfo component for all resume templates.
 *
 * Renders personal info fields in a responsive CSS Grid layout,
 * each with a semantic Lucide icon. Website is rendered as a
 * separate full-width row below the grid (URLs tend to be long).
 */

import React from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  MessageCircle,
  Calendar,
  User,
  Clock,
  GraduationCap,
  Home,
  Heart,
  Flag,
  Users,
  LinkIcon,
} from 'lucide-react';
import type { PersonalInfoContent } from '@/types/resume';

// ============================================================================
// Contact Entry (shared by React preview and HTML export)
// ============================================================================

export interface ContactEntry {
  icon: React.FC<{ size?: number; color?: string }>;
  value: string;
  htmlIcon: string;
}

/**
 * Build contact entries split into two rows:
 *   Row 1 (short): phone, location, linkedin, github, age, gender,
 *                  yearsOfExperience, educationLevel, hometown,
 *                  maritalStatus, politicalStatus, ethnicity
 *   Row 2 (long):  email, wechat, website, customLinks
 */
export function buildContactEntries(pi: PersonalInfoContent): { row1: ContactEntry[]; row2: ContactEntry[] } {
  const row1: ContactEntry[] = [];
  const row2: ContactEntry[] = [];

  if (pi.phone) row1.push({ icon: Phone, value: pi.phone, htmlIcon: '☎' });
  if (pi.location) row1.push({ icon: MapPin, value: pi.location, htmlIcon: '⌖' });
  if (pi.linkedin) row1.push({ icon: Linkedin, value: pi.linkedin, htmlIcon: 'in' });
  if (pi.github) row1.push({ icon: Github, value: pi.github, htmlIcon: '⌥' });
  if (pi.age) row1.push({ icon: Calendar, value: pi.age, htmlIcon: '📅' });
  if (pi.gender) row1.push({ icon: User, value: pi.gender, htmlIcon: '👤' });
  if (pi.yearsOfExperience) row1.push({ icon: Clock, value: pi.yearsOfExperience, htmlIcon: '⏱' });
  if (pi.educationLevel) row1.push({ icon: GraduationCap, value: pi.educationLevel, htmlIcon: '🎓' });
  if (pi.hometown) row1.push({ icon: Home, value: pi.hometown, htmlIcon: '🏠' });
  if (pi.maritalStatus) row1.push({ icon: Heart, value: pi.maritalStatus, htmlIcon: '♥' });
  if (pi.politicalStatus) row1.push({ icon: Flag, value: pi.politicalStatus, htmlIcon: '⚑' });
  if (pi.ethnicity) row1.push({ icon: Users, value: pi.ethnicity, htmlIcon: '👥' });

  if (pi.email) row2.push({ icon: Mail, value: pi.email, htmlIcon: '✉' });
  if (pi.wechat) row2.push({ icon: MessageCircle, value: pi.wechat, htmlIcon: '💬' });
  if (pi.website) row2.push({ icon: Globe, value: pi.website, htmlIcon: '⊕' });
  if (pi.customLinks) {
    for (const link of pi.customLinks) {
      row2.push({ icon: LinkIcon, value: `${link.label}: ${link.url}`, htmlIcon: '🔗' });
    }
  }

  return { row1, row2 };
}

// ============================================================================
// React Component
// ============================================================================

export function ContactInfo({
  pi,
  iconColor = '#71717a',
  iconSize = 13,
  align = 'center',
  className,
  style,
}: {
  pi: PersonalInfoContent;
  iconColor?: string;
  iconSize?: number;
  align?: 'center' | 'left';
  className?: string;
  style?: React.CSSProperties;
}) {
  const { row1, row2 } = buildContactEntries(pi);
  if (row1.length === 0 && row2.length === 0) return null;

  const rowStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6B7280',
    textAlign: align,
    ...style,
  };
  const itemClass = align === 'center'
    ? 'inline-flex items-center gap-1.5 mx-2 my-0.5'
    : 'inline-flex items-center gap-1.5 mr-4 my-0.5';
  const rowClassName = `mt-1 ${className || ''}`.trim();

  return (
    <>
      {row1.length > 0 && (
        <div className={rowClassName} style={rowStyle}>
          {row1.map((c, i) => (
            <span key={i} className={itemClass}>
              <span className="shrink-0"><c.icon size={iconSize} color={iconColor} /></span>
              <span>{c.value}</span>
            </span>
          ))}
        </div>
      )}
      {row2.length > 0 && (
        <div
          className={className}
          style={{ ...rowStyle, marginTop: row1.length > 0 ? '2px' : '8px' }}
        >
          {row2.map((c, i) => (
            <span key={i} className={itemClass}>
              <span className="shrink-0"><c.icon size={iconSize} color={iconColor} /></span>
              <span>{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
