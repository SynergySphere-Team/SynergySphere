// scripts/generateChallenges.mjs
// Aggregates all 11 languages (45+ questions each) into backend and mobile data files

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { javascriptChallenges } from './challengesData/javascript.mjs';
import { typescriptChallenges } from './challengesData/typescript.mjs';
import { pythonChallenges } from './challengesData/python.mjs';
import { javaChallenges } from './challengesData/java.mjs';
import { cppChallenges } from './challengesData/cpp.mjs';
import { csharpChallenges } from './challengesData/csharp.mjs';
import { sqlChallenges } from './challengesData/sql.mjs';
import { htmlChallenges } from './challengesData/html.mjs';
import { cssChallenges } from './challengesData/css.mjs';
import { reactChallenges } from './challengesData/react.mjs';
import { nodejsChallenges } from './challengesData/nodejs.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const allLanguageDatasets = [
  { name: 'JavaScript', list: javascriptChallenges },
  { name: 'TypeScript', list: typescriptChallenges },
  { name: 'Python', list: pythonChallenges },
  { name: 'Java', list: javaChallenges },
  { name: 'C++', list: cppChallenges },
  { name: 'C#', list: csharpChallenges },
  { name: 'SQL', list: sqlChallenges },
  { name: 'HTML', list: htmlChallenges },
  { name: 'CSS', list: cssChallenges },
  { name: 'React', list: reactChallenges },
  { name: 'Node.js', list: nodejsChallenges },
];

console.log('Validating challenge counts per language:');
let totalChallenges = 0;
for (const { name, list } of allLanguageDatasets) {
  console.log(`  - ${name}: ${list.length} challenges`);
  if (list.length < 45) {
    throw new Error(`Assertion failed: ${name} only has ${list.length} challenges (minimum 45 required)!`);
  }
  totalChallenges += list.length;
}
console.log(`Total challenges: ${totalChallenges}`);

const allChallenges = allLanguageDatasets.flatMap(d => d.list);

// 1. Generate backend/src/data/builtinChallenges.ts
const backendTsContent = `// Auto-generated challenge data bank containing 495+ production-ready challenges across 11 languages
export interface BuiltinChallengeData {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  language: string;
  starterCode: string;
  solution?: string;
  hint: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  xpReward: number;
}

export const BUILTIN_CHALLENGES: BuiltinChallengeData[] = ${JSON.stringify(allChallenges, null, 2)};
`;

const backendFilePath = path.join(rootDir, 'backend', 'src', 'data', 'builtinChallenges.ts');
fs.writeFileSync(backendFilePath, backendTsContent, 'utf-8');
console.log(`Written ${backendFilePath} (${allChallenges.length} challenges)`);

// 2. Generate mobile/src/data/builtinChallenges.ts
const mobileTsContent = `// Auto-generated challenge data bank containing 495+ production-ready challenges across 11 languages
export interface BuiltinChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  language: string;
  starterCode: string;
  solution?: string;
  hint: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  xpReward: number;
}

export const BUILTIN_CHALLENGES: BuiltinChallenge[] = ${JSON.stringify(allChallenges, null, 2)};
`;

const mobileFilePath = path.join(rootDir, 'mobile', 'src', 'data', 'builtinChallenges.ts');
fs.writeFileSync(mobileFilePath, mobileTsContent, 'utf-8');
console.log(`Written ${mobileFilePath} (${allChallenges.length} challenges)`);

// 3. Generate frontend/src/data/builtinChallenges.ts
const frontendTsContent = `// Auto-generated challenge data bank containing 495+ production-ready challenges across 11 languages
export interface BuiltinChallenge {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description: string;
  language: string;
  starterCode: string;
  solution?: string;
  hint: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  xpReward: number;
}

export const BUILTIN_CHALLENGES: BuiltinChallenge[] = ${JSON.stringify(allChallenges, null, 2)};
`;

const frontendDir = path.join(rootDir, 'frontend', 'src', 'data');
if (!fs.existsSync(frontendDir)) {
  fs.mkdirSync(frontendDir, { recursive: true });
}
const frontendFilePath = path.join(frontendDir, 'builtinChallenges.ts');
fs.writeFileSync(frontendFilePath, frontendTsContent, 'utf-8');
console.log(`Written ${frontendFilePath} (${allChallenges.length} challenges)`);
console.log('Successfully generated challenge datasets!');

