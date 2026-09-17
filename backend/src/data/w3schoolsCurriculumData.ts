import type { DomainSpec, LessonDifficulty } from './lectureCurriculumTypes.js';
import { javaSubject } from './curriculum/java.js';
import { pythonSubject } from './curriculum/python.js';
import { javascriptSubject } from './curriculum/javascript.js';
import { htmlSubject } from './curriculum/html.js';
import { cssSubject } from './curriculum/css.js';
import { sqlSubject } from './curriculum/sql.js';
import { cppSubject } from './curriculum/cpp.js';
import { csharpSubject } from './curriculum/csharp.js';
import { reactSubject } from './curriculum/react.js';
import { nodejsSubject } from './curriculum/nodejs.js';
import { typescriptSubject } from './curriculum/typescript.js';

export interface TechnologySummary {
  id: string;
  name: string;
  category: 'Programming' | 'Web Development' | 'Databases' | 'Frameworks' | 'Tools';
  description: string;
  icon: string;
  difficulty: LessonDifficulty;
  totalLessons: number;
  totalModules: number;
  sourceUrl: string;
}

export const W3SCHOOLS_BASE_SOURCE = {
  name: 'W3Schools',
  licenseNote: 'Used under fair educational reference and structured transformation for SynergySphere LectureToLife. All rights and original reference material belong to W3Schools (Refsnes Data).',
  retrievedAt: '17 September 2026',
};

export const technologiesCatalog: TechnologySummary[] = [
  {
    "id": "java",
    "name": "Java",
    "category": "Programming",
    "description": "Object-oriented, platform-independent language widely used for enterprise backends and Android apps.",
    "icon": "coffee",
    "difficulty": "Intermediate",
    "totalLessons": 97,
    "totalModules": 11,
    "sourceUrl": "https://www.w3schools.com/java/"
  },
  {
    "id": "python",
    "name": "Python",
    "category": "Programming",
    "description": "High-level, readable language ideal for scripting, web development, data science, and automation.",
    "icon": "terminal",
    "difficulty": "Beginner",
    "totalLessons": 83,
    "totalModules": 13,
    "sourceUrl": "https://www.w3schools.com/python/"
  },
  {
    "id": "javascript",
    "name": "JavaScript",
    "category": "Web Development",
    "description": "The ubiquitous language of the web, powering dynamic browser interfaces and server runtimes.",
    "icon": "code",
    "difficulty": "Beginner",
    "totalLessons": 260,
    "totalModules": 33,
    "sourceUrl": "https://www.w3schools.com/js/"
  },
  {
    "id": "html",
    "name": "HTML",
    "category": "Web Development",
    "description": "The standard markup language for creating the structure and content of web pages.",
    "icon": "layout",
    "difficulty": "Beginner",
    "totalLessons": 75,
    "totalModules": 7,
    "sourceUrl": "https://www.w3schools.com/html/"
  },
  {
    "id": "css",
    "name": "CSS",
    "category": "Web Development",
    "description": "Style sheet language used for describing the presentation, layout, and responsiveness of web pages.",
    "icon": "palette",
    "difficulty": "Beginner",
    "totalLessons": 85,
    "totalModules": 7,
    "sourceUrl": "https://www.w3schools.com/css/"
  },
  {
    "id": "sql",
    "name": "SQL",
    "category": "Databases",
    "description": "Standard language for storing, querying, manipulating, and retrieving data in relational databases.",
    "icon": "database",
    "difficulty": "Beginner",
    "totalLessons": 82,
    "totalModules": 11,
    "sourceUrl": "https://www.w3schools.com/sql/"
  },
  {
    "id": "cpp",
    "name": "C++",
    "category": "Programming",
    "description": "High-performance compiled language giving direct control over memory and system hardware.",
    "icon": "cpu",
    "difficulty": "Advanced",
    "totalLessons": 89,
    "totalModules": 10,
    "sourceUrl": "https://www.w3schools.com/cpp/"
  },
  {
    "id": "csharp",
    "name": "C#",
    "category": "Programming",
    "description": "Modern, object-oriented language developed by Microsoft for .NET and game development in Unity.",
    "icon": "hash",
    "difficulty": "Intermediate",
    "totalLessons": 55,
    "totalModules": 7,
    "sourceUrl": "https://www.w3schools.com/cs/"
  },
  {
    "id": "react",
    "name": "React",
    "category": "Frameworks",
    "description": "Declarative component-based JavaScript library for building modern reactive user interfaces.",
    "icon": "layers",
    "difficulty": "Intermediate",
    "totalLessons": 62,
    "totalModules": 8,
    "sourceUrl": "https://www.w3schools.com/react/"
  },
  {
    "id": "nodejs",
    "name": "Node.js",
    "category": "Frameworks",
    "description": "Chrome V8-powered JavaScript runtime environment that executes JavaScript code server-side.",
    "icon": "server",
    "difficulty": "Intermediate",
    "totalLessons": 95,
    "totalModules": 13,
    "sourceUrl": "https://www.w3schools.com/nodejs/"
  },
  {
    "id": "typescript",
    "name": "TypeScript",
    "category": "Programming",
    "description": "Syntactic superset of JavaScript which adds static typing and compile-time correctness guarantees.",
    "icon": "file-code",
    "difficulty": "Intermediate",
    "totalLessons": 49,
    "totalModules": 8,
    "sourceUrl": "https://www.w3schools.com/typescript/"
  }
];

export const w3schoolsProgrammingDomain: DomainSpec = {
  id: 'programming-and-software',
  name: 'Programming & Software',
  description: 'Complete, structured programming and software curriculum extracted from W3Schools educational references across all 11 core technologies.',
  sortOrder: 1,
  subjects: [
    javaSubject,
    pythonSubject,
    javascriptSubject,
    htmlSubject,
    cssSubject,
    sqlSubject,
    cppSubject,
    csharpSubject,
    reactSubject,
    nodejsSubject,
    typescriptSubject,
  ],
};
