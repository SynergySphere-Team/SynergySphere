import { w3schoolsProgrammingDomain } from '../data/w3schoolsCurriculumData.js';
import { isMaterializedLessonRelevant, materializeSubjectLessons } from '../data/curriculumLessonMaterial.js';

const failures: string[] = [];
let lessonsChecked = 0;

const TEMPLATE_LITERAL_HINTS = [
  'executing ',
  'demonstrating ',
  'lesson title',
  'this topic',
  'the selected topic',
];

const TEMPLATE_REGEX_HINTS = [
  /\/\/[^\n]+ in (javascript|typescript|node\.js|python|java|c\+\+|c#|react|html|css|sql)/i,
];

function looksLikeTemplateCode(code: string): boolean {
  if (TEMPLATE_REGEX_HINTS.some((re) => re.test(code))) return true;
  return TEMPLATE_LITERAL_HINTS.some((hint) => code.toLowerCase().includes(hint));
}

for (const rawSubject of w3schoolsProgrammingDomain.subjects) {
  const subject = materializeSubjectLessons(rawSubject);
  for (const module of subject.modules) {
    if (module.lessons.length === 0) {
      failures.push(`${subject.name} › ${module.name} has no selectable lessons.`);
    }

    for (const lesson of module.lessons) {
      lessonsChecked += 1;

      // The validator should no longer see templated examples after materialization.
      if (!isMaterializedLessonRelevant(lesson)) {
        failures.push(`${subject.name} › ${lesson.title} still contains generic material.`);
      }

      // Materialized examples must not look like the old template stubs.
      const examples = lesson.content.examples ?? [];
      if (examples.length > 0 && examples.every((ex) => looksLikeTemplateCode(ex.code))) {
        failures.push(`${subject.name} › ${lesson.title} has only template-like examples.`);
      }

      if (examples.length > 0) {
        const firstCode = examples[0].code.toLowerCase();
        if (firstCode.includes('lesson title') || firstCode.includes('this topic') || firstCode.includes('the selected topic')) {
          failures.push(`${subject.name} › ${lesson.title} still uses placeholder example code.`);
        }
      }

      if (!lesson.sources[0]?.sourceUrl.startsWith('https://www.w3schools.com/')) {
        failures.push(`${subject.name} › ${lesson.title} is missing a W3Schools source URL.`);
      }
      if (!lesson.content.exercise || !lesson.content.quiz || !lesson.content.challenge) {
        failures.push(`${subject.name} › ${lesson.title} is missing selected-topic practice material.`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.info(`Verified ${lessonsChecked} selectable curriculum lessons across ${w3schoolsProgrammingDomain.subjects.length} technologies.`);
}
