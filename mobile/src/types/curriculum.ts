export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Technology {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  difficulty: Difficulty;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  sourceUrl: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  overview: string;
  difficulty: Difficulty;
  sortOrder: number;
  completed: boolean;
}

export interface CurriculumModule {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  lessons: LessonSummary[];
}

export interface TechnologyDetail extends Technology {
  modules: CurriculumModule[];
  status: 'active' | 'coming_soon';
}

export interface KeyConcept {
  title: string;
  definition: string;
  purpose?: string;
}

export interface CodeExample {
  title: string;
  language?: string;
  code: string;
  explanation: string;
}

export interface LessonContent {
  explanation: string;
  keyConcepts: KeyConcept[];
  syntax?: string[];
  examples?: CodeExample[];
  rules?: string[];
  practicalApplications?: string[];
  commonMistakes?: string[];
  relatedConcepts?: string[];
  exercise?: { prompt: string; successCriteria: string };
  quiz?: { question: string; answer: string };
  challenge?: { prompt: string; successCriteria: string };
}

export interface LessonRevisionNotes {
  keyTerms: string[];
  remember: string[];
  commonMistakes?: string[];
}

export interface LessonSource {
  id: string;
  resourceTitle: string;
  sourceUrl: string;
  author: string;
  publishedDate?: string;
  updatedDate?: string;
  topics?: string;
}

export interface LessonNavReference {
  id: string;
  title: string;
}

export interface LessonDetail {
  id: string;
  moduleId: string;
  moduleName: string;
  subjectId: string;
  subjectName: string;
  title: string;
  overview: string;
  difficulty: Difficulty;
  technologyVersion: string;
  learningObjectives: string[];
  prerequisites?: string[];
  content: LessonContent;
  revisionNotes: LessonRevisionNotes;
  sources: LessonSource[];
  completed: boolean;
  previousLesson: LessonNavReference | null;
  nextLesson: LessonNavReference | null;
  attribution: {
    source: string;
    licenseNote: string;
    retrievedAt: string;
    primaryUrl: string;
  };
}

export interface CurriculumSearchResult {
  id: string;
  title: string;
  overview: string;
  difficulty: Difficulty;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleName: string;
  completed: boolean;
  snippet: string;
}
