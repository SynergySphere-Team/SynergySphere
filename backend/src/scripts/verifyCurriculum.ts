import { w3schoolsProgrammingDomain } from '../data/w3schoolsCurriculumData.js';
import { isMaterializedLessonRelevant, materializeSubjectLessons } from '../data/curriculumLessonMaterial.js';

const failures: string[] = [];
let lessonsChecked = 0;

for (const rawSubject of w3schoolsProgrammingDomain.subjects) {
  const subject = materializeSubjectLessons(rawSubject);
  for (const module of subject.modules) {
    if (module.lessons.length === 0) {
      failures.push(`${subject.name} › ${module.name} has no selectable lessons.`);
    }

    for (const lesson of module.lessons) {
      lessonsChecked += 1;
      if (!isMaterializedLessonRelevant(lesson)) {
        failures.push(`${subject.name} › ${lesson.title} still contains generic material.`);
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
