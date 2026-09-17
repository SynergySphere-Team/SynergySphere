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
  examples?: Array<{ title: string; code: string; explanation: string }>;
  commands?: Array<{ command: string; meaning: string; options?: string }>;
  rules?: string[];
  practicalApplications: string[];
  commonMistakes: string[];
  relatedConcepts: string[];
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

export const CHEATOGRAPHY_LICENSE =
  'Hosted on Cheatography. Individual authors retain credit. Cheatography materials are typically offered under Creative Commons BY-NC-SA 2.0 UK. SynergySphere stores a synthesized study lesson, not the original cheat sheet or PDF.';

export const SOURCE = {
  python: {
    id: 'src-python-davechild',
    resourceTitle: 'Python Cheat Sheet',
    sourceUrl: 'https://cheatography.com/davechild/cheat-sheets/python/',
    author: 'DaveChild',
    publishedDate: '19 Oct 2011',
    updatedDate: '21 Nov 2022',
    topics: 'python, programming, development',
  },
  regex: {
    id: 'src-regex-davechild',
    resourceTitle: 'Regular Expressions Cheat Sheet',
    sourceUrl: 'https://cheatography.com/davechild/cheat-sheets/regular-expressions/',
    author: 'DaveChild',
    publishedDate: '19 Oct 2011',
    updatedDate: '12 Mar 2020',
    topics: 'regex, regular expressions, programming',
  },
  javascript: {
    id: 'src-js-davechild',
    resourceTitle: 'JavaScript Cheat Sheet',
    sourceUrl: 'https://cheatography.com/davechild/cheat-sheets/javascript/',
    author: 'DaveChild',
    publishedDate: '19 Oct 2011',
    updatedDate: '11 May 2016',
    topics: 'javascript, web, frontend',
  },
  linux: {
    id: 'src-linux-davechild',
    resourceTitle: 'Linux Command Line Cheat Sheet',
    sourceUrl: 'https://cheatography.com/davechild/cheat-sheets/linux-command-line/',
    author: 'DaveChild',
    publishedDate: '28 Oct 2011',
    updatedDate: '29 Feb 2020',
    topics: 'bash, linux, commandline',
  },
  mysql: {
    id: 'src-mysql-davechild',
    resourceTitle: 'MySQL Cheat Sheet',
    sourceUrl: 'https://cheatography.com/davechild/cheat-sheets/mysql/',
    author: 'DaveChild',
    publishedDate: '19 Oct 2011',
    updatedDate: '25 Feb 2020',
    topics: 'mysql, database, lamp',
  },
  gitUnixSql: {
    id: 'src-unix-git-sql-mitcht',
    resourceTitle: 'Unix / git / SQL Cheat Sheet (DRAFT)',
    sourceUrl: 'https://cheatography.com/mitcht/cheat-sheets/unix-git-sql/',
    author: 'mitcht',
    topics: 'unix, git, sql',
  },
  gitDave: {
    id: 'src-git-davechild',
    resourceTitle: 'Git Cheat Sheet (DRAFT)',
    sourceUrl: 'https://cheatography.com/davechild/cheat-sheets/git/',
    author: 'DaveChild',
    topics: 'git, version control',
  },
  docker: {
    id: 'src-docker-pratikshahp',
    resourceTitle: 'Docker Cheat Sheet',
    sourceUrl: 'https://cheatography.com/pratikshahp/cheat-sheets/docker/',
    author: 'pratikshahp',
    topics: 'docker, containers, devops',
  },
} as const;

export const importReport = {
  totalResourcesDiscovered: 4715,
  totalProgrammingResources: 3155,
  totalSoftwareResources: 1560,
  totalResourcesProcessed: 8,
  totalResourcesSkipped: 'PDFs/images, non-programming software (VLC/Gmail/EQ), Metasploit, GDB reverse-engineering framing',
  totalDuplicateClusters: ['Git', 'Python', 'JavaScript', 'Linux', 'Docker', 'Vim'],
  lessonsCreated: 0,
  lessonsUpdated: 0,
  lessonsRequiringReview: 0,
  topicsCovered: [
    'Python collections and stdlib methods',
    'JavaScript core objects',
    'Regular expressions',
    'Git basics and stash',
    'Linux command line',
    'Docker images, networks, Compose',
    'SQL query clauses and MySQL types/functions',
  ],
  languagesCovered: ['Python', 'JavaScript', 'SQL', 'Bash', 'Regular expressions'],
  softwareToolsCovered: ['Git', 'Linux CLI', 'Docker', 'MySQL', 'Nano/screen (mentioned in Linux source)'],
  insufficientMaterial: [
    'Algorithms and data structures beyond name-drops',
    'Modern React/TypeScript',
    'Python 3 pedagogy (comprehensions, with, generators noted as missing in comments)',
    'HTML/CSS were listed on Cheatography but not imported in this first cluster',
  ],
  accessIssues: ['https://cheatography.com/explore/tags/python/ returned 404'],
  imageOrPdfOnly: 'PDF downloads were not fetched by design',
  versionConflicts: [
    'Python sheet mixes APIs such as decode(), __cmp__, and __nonzero__ without stating 2 vs 3',
    'Regex sheet does not name a flavor; comments disagree (PCRE vs JS vs POSIX)',
    'JavaScript Date.now() missing; getYear listed; Michael Pohoreski comment 16 Sep 2016',
    'Linux echo $SHELL described as current shell; comment says default shell',
    'find -name glob quoting disputed in Linux comments',
    'numeric vs symbolic chmod disputed in Linux comments',
    'Docker sheet labels systemctl start/stop/restart docker as “Stop docker services”',
    'DaveChild Git sheet is an unfinished draft and includes a junk “teety” section that was not imported',
    'mitcht Unix/git/SQL sheet is marked DRAFT',
    'MySQL VARCHAR/CHAR listed as 0–255; TIMESTAMP shown as YYYYMMDDHHMMSS',
  ],
  license: CHEATOGRAPHY_LICENSE,
};
