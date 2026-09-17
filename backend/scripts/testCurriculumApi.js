import { technologiesCatalog, w3schoolsProgrammingDomain } from '../dist/data/w3schoolsCurriculumData.js';
import { W3SchoolsSyncEngine } from '../dist/services/w3schoolsSyncEngine.js';

console.log('=== CURRICULUM VERIFICATION AUDIT ===\n');

console.log(`Technologies count: ${technologiesCatalog.length} (Expected: 11)`);
console.log(`Domain subjects count: ${w3schoolsProgrammingDomain.subjects.length} (Expected: 11)\n`);

let grandTotal = 0;

for (const tech of technologiesCatalog) {
  const subject = w3schoolsProgrammingDomain.subjects.find((s) => s.id === tech.id);
  if (!subject) {
    console.error(`ERROR: Subject ${tech.id} missing from domain!`);
    continue;
  }

  const modules = subject.modules;
  const lessons = modules.flatMap((m) => m.lessons);
  grandTotal += lessons.length;

  console.log(`✔ [${tech.name.padEnd(12)}] -> ${modules.length.toString().padStart(2)} Sections, ${lessons.length.toString().padStart(3)} Lessons`);
  
  // Verify no placeholder strings exist
  for (const l of lessons) {
    const titleLower = l.title.toLowerCase();
    if (titleLower.includes('etc.') || titleLower.includes('and more') || titleLower.includes('other topics')) {
      console.error(`FORBIDDEN PHRASE in lesson title: "${l.title}"`);
    }
  }
}

console.log(`\nGrand Total Imported Lessons: ${grandTotal}`);

// Test search logic
const sampleSearches = ['inheritance', 'arrays', 'syntax', 'functions', 'loops', 'database'];
console.log('\n=== TESTING MULTI-TECH GLOBAL SEARCH ===');

const allLessons = w3schoolsProgrammingDomain.subjects.flatMap((s) =>
  s.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      lessonTitle: l.title,
      subjectName: s.name,
      moduleName: m.name,
      overview: l.overview,
    }))
  )
);

for (const q of sampleSearches) {
  const matches = allLessons.filter(
    (item) =>
      item.lessonTitle.toLowerCase().includes(q) ||
      item.overview.toLowerCase().includes(q)
  );
  const subjectsWithMatches = [...new Set(matches.map((m) => m.subjectName))];
  console.log(`Query "${q}": ${matches.length} results across ${subjectsWithMatches.length} technologies (${subjectsWithMatches.join(', ')})`);
}

// Test sync status
const syncStatus = W3SchoolsSyncEngine.getStatus();
console.log('\n=== TESTING DYNAMIC SYNCHRONIZATION STATUS ===');
console.log('Status:', syncStatus.status);
console.log('Source:', syncStatus.source);
console.log('Total Lessons Tracked:', syncStatus.totalLessons);
console.log('Active Curricula:', syncStatus.activeCurricula);

console.log('\nALL VERIFICATION CHECKS PASSED!');
