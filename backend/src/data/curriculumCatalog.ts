/**
 * Single, process-wide catalogue of materialized curriculum lessons.
 *
 * Materializing every lesson is expensive (the source data is tens of thousands
 * of lines), so it is done once and shared by the curriculum routes and the AI
 * grounding layer. Call `invalidateLessonCatalog()` after mutating source
 * lessons (e.g. the W3Schools sync engine) so the next read rebuilds it.
 */

import { w3schoolsProgrammingDomain } from './w3schoolsCurriculumData.js';
import { materializeLesson } from './curriculumLessonMaterial.js';
import { resolveLessonEntry, type FlatLessonEntry } from './curriculumAliases.js';

let flatLessons: FlatLessonEntry[] | null = null;
let indexById: Map<string, number> | null = null;

export function getAllFlatLessons(): FlatLessonEntry[] {
  if (flatLessons) return flatLessons;

  const result: FlatLessonEntry[] = [];
  for (const subject of w3schoolsProgrammingDomain.subjects) {
    for (const mod of subject.modules) {
      mod.lessons.forEach((sourceLesson, lessonIndex) => {
        result.push({
          lesson: materializeLesson(sourceLesson, subject, mod, mod.lessons[lessonIndex - 1]?.title),
          subjectId: subject.id,
          subjectName: subject.name,
          moduleId: mod.id,
          moduleName: mod.name,
        });
      });
    }
  }

  flatLessons = result;
  indexById = new Map(result.map((entry, index) => [entry.lesson.id, index]));
  return result;
}

/** O(1) lookup for canonical IDs; falls back to alias / fuzzy resolution. */
export function findLessonEntry(rawId: string): { entry: FlatLessonEntry; index: number } | null {
  const all = getAllFlatLessons();
  const index = indexById?.get(rawId.trim());
  if (index !== undefined) return { entry: all[index], index };
  return resolveLessonEntry(rawId, all);
}

export function invalidateLessonCatalog(): void {
  flatLessons = null;
  indexById = null;
}
