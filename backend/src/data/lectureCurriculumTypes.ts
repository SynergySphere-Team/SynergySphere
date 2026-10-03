export type LessonDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type LessonStatus = 'draft' | 'review_required' | 'published';

export interface LessonSourceSpec {
  id: string;
  resourceTitle: string;
  sourceUrl: string;
  author: string;
  publishedDate?: string;
  updatedDate?: string;
  topics: string;
}

export interface LessonConflict {
  topic: string;
  claims: Array<{ source: string; statement: string }>;
}

export interface LessonContent {
  explanation: string;
  keyConcepts: Array<{ title: string; definition: string; purpose?: string }>;
  syntax?: string[];
  examples?: Array<{ title: string; language?: string; code: string; explanation: string }>;
  commands?: Array<{ command: string; meaning: string; options?: string }>;
  rules?: string[];
  practicalApplications: string[];
  commonMistakes: string[];
  relatedConcepts: string[];
  exercise?: { prompt: string; successCriteria: string };
  quiz?: { question: string; answer: string };
  challenge?: { prompt: string; successCriteria: string };
  conflicts?: LessonConflict[];
}

export interface LessonRevision {
  keyTerms: string[];
  remember: string[];
  importantSyntax?: string[];
  commonMistakes: string[];
}

export interface LessonSpec {
  id: string;
  moduleId: string;
  title: string;
  overview: string;
  difficulty: LessonDifficulty;
  status: LessonStatus;
  technologyVersion: string;
  sortOrder: number;
  learningObjectives: string[];
  prerequisites?: string[];
  content: LessonContent;
  revisionNotes: LessonRevision;
  sources: LessonSourceSpec[];
}

export interface ModuleSpec {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  sortOrder: number;
  lessons: LessonSpec[];
}

export interface SubjectSpec {
  id: string;
  domainId: string;
  name: string;
  description: string;
  sortOrder: number;
  modules: ModuleSpec[];
}

export interface DomainSpec {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  subjects: SubjectSpec[];
}
