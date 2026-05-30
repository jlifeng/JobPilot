import type { Template } from './constants';

export type TemplateMatrixGroupId =
  | 'ats-general'
  | 'tech-engineering'
  | 'business-consulting'
  | 'academic-research'
  | 'medical-legal'
  | 'executive'
  | 'creative'
  | 'dense'
  | 'visual';

export interface TemplateMatrixGroup {
  id: TemplateMatrixGroupId;
  titleKey: string;
  descriptionKey: string;
  templates: readonly Template[];
}

export const TEMPLATE_MATRIX_GROUPS: readonly TemplateMatrixGroup[] = [
  {
    id: 'ats-general',
    titleKey: 'templates.matrix.atsGeneral.title',
    descriptionKey: 'templates.matrix.atsGeneral.description',
    templates: ['ats', 'minimal', 'classic', 'clean', 'formal'],
  },
  {
    id: 'tech-engineering',
    titleKey: 'templates.matrix.techEngineering.title',
    descriptionKey: 'templates.matrix.techEngineering.description',
    templates: ['modern-minimal', 'developer', 'coder', 'engineer'],
  },
  {
    id: 'business-consulting',
    titleKey: 'templates.matrix.businessConsulting.title',
    descriptionKey: 'templates.matrix.businessConsulting.description',
    templates: ['consultant', 'professional', 'corporate', 'finance', 'swiss'],
  },
  {
    id: 'academic-research',
    titleKey: 'templates.matrix.academicResearch.title',
    descriptionKey: 'templates.matrix.academicResearch.description',
    templates: ['academic', 'teacher', 'scientist'],
  },
  {
    id: 'medical-legal',
    titleKey: 'templates.matrix.medicalLegal.title',
    descriptionKey: 'templates.matrix.medicalLegal.description',
    templates: ['medical', 'legal'],
  },
  {
    id: 'executive',
    titleKey: 'templates.matrix.executive.title',
    descriptionKey: 'templates.matrix.executive.description',
    templates: ['executive', 'luxe'],
  },
  {
    id: 'creative',
    titleKey: 'templates.matrix.creative.title',
    descriptionKey: 'templates.matrix.creative.description',
    templates: ['designer', 'creative', 'artistic', 'magazine', 'watercolor'],
  },
  {
    id: 'dense',
    titleKey: 'templates.matrix.dense.title',
    descriptionKey: 'templates.matrix.dense.description',
    templates: ['compact', 'two-column', 'sidebar', 'blocks'],
  },
  {
    id: 'visual',
    titleKey: 'templates.matrix.visual.title',
    descriptionKey: 'templates.matrix.visual.description',
    templates: [
      'modern',
      'elegant',
      'startup',
      'infographic',
      'euro',
      'bold',
      'timeline',
      'nordic',
      'gradient',
      'metro',
      'material',
      'berlin',
      'japanese',
      'rose',
      'architect',
      'card',
      'zigzag',
      'ribbon',
      'mosaic',
      'retro',
      'neon',
    ],
  },
] as const;

export const TEMPLATE_MATRIX_TEMPLATE_IDS = new Set<Template>(
  TEMPLATE_MATRIX_GROUPS.flatMap((group) => group.templates),
);
