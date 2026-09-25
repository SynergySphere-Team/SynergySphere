import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { newId, pool } from '../lib/db.js';

async function main() {
  console.log('Seeding database...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const badges = [
      { name: 'First Steps', description: 'Complete your first challenge', xpRequired: 0, icon: 'target' },
      { name: 'Java Master', description: 'Reach level 5 in Java', xpRequired: 200, icon: 'java' },
      { name: 'SQL Expert', description: 'Complete 5 SQL challenges', xpRequired: 300, icon: 'database' },
      { name: 'Wellness Champion', description: 'Log wellness for 7 consecutive days', xpRequired: 100, icon: 'wellness' },
      { name: 'Community Hero', description: 'Complete a community project', xpRequired: 500, icon: 'community' },
      { name: 'Interview Pro', description: 'Score 80+ on a mock interview', xpRequired: 400, icon: 'interview' },
    ];

    for (const badge of badges) {
      await client.query(
        `INSERT INTO "Badge" ("id", "name", "description", "xpRequired", "icon")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("name")
         DO UPDATE SET
           "description" = EXCLUDED."description",
           "xpRequired" = EXCLUDED."xpRequired",
           "icon" = EXCLUDED."icon"`,
        [newId(), badge.name, badge.description, badge.xpRequired, badge.icon],
      );
    }

    const challenges = [
      {
        title: 'Hello World',
        difficulty: 'EASY',
        description: 'Write a function that returns "Hello, SynergySphere!"',
        language: 'JavaScript',
        starterCode: 'function greet() {\n  // Your code here\n}',
        solution: 'return "Hello, SynergySphere!"',
        xpReward: 50,
      },
      {
        title: 'Sum Array',
        difficulty: 'EASY',
        description: 'Write a function that returns the sum of all numbers in an array.',
        language: 'JavaScript',
        starterCode: 'function sumArray(arr) {\n  // Your code here\n}',
        solution: 'return arr.reduce((a, b) => a + b, 0)',
        xpReward: 50,
      },
      {
        title: 'FizzBuzz',
        difficulty: 'MEDIUM',
        description: 'Return "Fizz" for multiples of 3, "Buzz" for 5, "FizzBuzz" for both.',
        language: 'JavaScript',
        starterCode: 'function fizzBuzz(n) {\n  // Your code here\n}',
        solution: 'fizzbuzz',
        xpReward: 75,
      },
      {
        title: 'SQL: Top Students',
        difficulty: 'MEDIUM',
        description: 'Write a SQL query to find students with GPA above 3.5.',
        language: 'SQL',
        starterCode: 'SELECT * FROM students WHERE',
        solution: 'gpa > 3.5',
        xpReward: 75,
      },
      {
        title: 'Binary Search',
        difficulty: 'HARD',
        description: 'Implement binary search on a sorted array.',
        language: 'JavaScript',
        starterCode: 'function binarySearch(arr, target) {\n  // Your code here\n}',
        solution: 'binarysearch',
        xpReward: 100,
      },
    ];

    for (const challenge of challenges) {
      await client.query(
        `INSERT INTO "Challenge" (
           "id", "title", "difficulty", "description", "language", "starterCode", "solution", "xpReward"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("title")
         DO UPDATE SET
           "difficulty" = EXCLUDED."difficulty",
           "description" = EXCLUDED."description",
           "language" = EXCLUDED."language",
           "starterCode" = EXCLUDED."starterCode",
           "solution" = EXCLUDED."solution",
           "xpReward" = EXCLUDED."xpReward"`,
        [
          newId(),
          challenge.title,
          challenge.difficulty,
          challenge.description,
          challenge.language,
          challenge.starterCode,
          challenge.solution,
          challenge.xpReward,
        ],
      );
    }

    const projects = [
      {
        title: 'Green Infrastructure Monitor',
        category: 'GREEN_INFRASTRUCTURE',
        location: 'Urban District / Remote',
        organization: 'City Sustainability Office',
        description: 'IoT telemetry ingest and real-time operational dashboard for urban green roofs and storm water sensors. Ingests ESP8266/MQTT sensor payloads, plots time-series metrics, triggers automated threshold alerts, and displays interactive Leaflet map overlays.',
        requirements: 'Node.js/Java, PostgreSQL, React, WebSockets, Leaflet, TimescaleDB',
        techStack: 'Node.js, PostgreSQL, React, WebSockets, Leaflet, TimescaleDB',
        teamCapacity: 10,
        deliverableType: 'IoT Telemetry Ingest & Real-Time Dashboard',
        xpReward: 300,
      },
      {
        title: 'Campus Recycling Dashboard',
        category: 'RECYCLING',
        location: 'University Campus',
        organization: 'Green Earth NGO',
        description: 'Full-stack analytics and fill-level prediction service for smart campus waste receptacles. Features REST API ingest, route optimization calculation using OR-Tools, role-based departmental views, and CSV export for facilities managers.',
        requirements: 'React, Python/FastAPI, SQL, REST APIs, Mapbox, Data Visualization',
        techStack: 'React, Python/FastAPI, PostgreSQL, Chart.js, Mapbox',
        teamCapacity: 8,
        deliverableType: 'Full-Stack Analytics Web Application',
        xpReward: 250,
      },
      {
        title: 'Eco-Tourism Booking Platform',
        category: 'ECO_TOURISM',
        location: 'Coastal Region / Hybrid',
        organization: 'Sustainable Travel Foundation',
        description: 'Marketplace backend and responsive web app connecting travelers to certified conservation sanctuaries. Delivers real-time slot availability calendars, Stripe test-mode payments, role-based authorization, and verified carbon offset tracking.',
        requirements: 'React, Node.js, PostgreSQL, Stripe API, JWT Auth',
        techStack: 'React, Node.js, Express, PostgreSQL, Stripe API, Docker',
        teamCapacity: 12,
        deliverableType: 'E-Commerce Marketplace Web Platform',
        xpReward: 250,
      },
      {
        title: 'Carbon-Aware CI/CD Metric Collector',
        category: 'GREEN_SOFTWARE',
        location: 'Open Source / Remote',
        organization: 'Green Software Foundation Initiative',
        description: 'Developer tooling service tracking pipeline carbon intensity across GitHub Actions workflows. Queries real-time regional grid emissions APIs, visualizes pipeline footprints, and schedules compute jobs during green energy windows.',
        requirements: 'TypeScript, Node.js, Docker, GitHub REST API, Prometheus, React',
        techStack: 'TypeScript, Node.js, Docker, GitHub Actions, Prometheus, React',
        teamCapacity: 6,
        deliverableType: 'CLI Tool & Telemetry Dashboard',
        xpReward: 300,
      },
      {
        title: 'Campus Wi-Fi & Lab Occupancy API',
        category: 'CIVIC_TECH',
        location: 'Main University Campus',
        organization: 'Student Union IT Council',
        description: 'Real-time room occupancy and study space availability engine. Aggregates anonymized Wi-Fi access point counts, exposes cached low-latency REST endpoints, and provides WebSocket live streams for student mobile apps.',
        requirements: 'Java, Spring Boot, Redis, WebSockets, PostgreSQL, Docker',
        techStack: 'Java, Spring Boot, Redis, WebSockets, PostgreSQL, Docker',
        teamCapacity: 8,
        deliverableType: 'High-Throughput Microservice API',
        xpReward: 250,
      },
      {
        title: 'Accessibility & Performance Audit Engine',
        category: 'EDTECH',
        location: 'Distributed / Hybrid',
        organization: 'University Digital Accessibility Lab',
        description: 'Automated crawler and compliance tracker evaluating university course portals against WCAG 2.1 AA and Lighthouse performance budgets. Generates remediation tickets and detailed compliance summaries.',
        requirements: 'TypeScript, Next.js, Puppeteer, Axe-Core, PostgreSQL, Tailwind CSS',
        techStack: 'TypeScript, Next.js, Puppeteer, Axe-Core, PostgreSQL',
        teamCapacity: 10,
        deliverableType: 'Automated Crawler & Compliance Dashboard',
        xpReward: 280,
      },
      {
        title: 'Good-First-Issues Community Bot',
        category: 'OPEN_SOURCE',
        location: 'Global / Remote',
        organization: 'SynergySphere Open Source Guild',
        description: 'Automated GitHub triage bot and contributor portal that curates beginner-friendly issues across student repositories, verifies PR milestones, and synchronizes contribution XP directly to student portfolios.',
        requirements: 'Python, FastAPI, GitHub REST & GraphQL APIs, Redis, Webhooks',
        techStack: 'Python, FastAPI, GitHub GraphQL API, Redis, Celery',
        teamCapacity: 15,
        deliverableType: 'GitHub App & Community Portal',
        xpReward: 320,
      },
    ];

    for (const project of projects) {
      await client.query(
        `INSERT INTO "Project" (
           "id", "title", "category", "location", "organization", "description",
           "requirements", "xpReward", "techStack", "teamCapacity", "deliverableType"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("title")
         DO UPDATE SET
           "category" = EXCLUDED."category",
           "location" = EXCLUDED."location",
           "organization" = EXCLUDED."organization",
           "description" = EXCLUDED."description",
           "requirements" = EXCLUDED."requirements",
           "xpReward" = EXCLUDED."xpReward",
           "techStack" = EXCLUDED."techStack",
           "teamCapacity" = EXCLUDED."teamCapacity",
           "deliverableType" = EXCLUDED."deliverableType"`,
        [
          newId(),
          project.title,
          project.category,
          project.location,
          project.organization,
          project.description,
          project.requirements,
          project.xpReward,
          project.techStack,
          project.teamCapacity,
          project.deliverableType,
        ],
      );
    }

    const adminPassword = await bcrypt.hash('admin123456', 12);
    await client.query(
      `INSERT INTO "User" ("id", "firstName", "lastName", "email", "password", "role", "xp", "level")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("email") DO NOTHING`,
      [newId(), 'Admin', 'User', 'admin@synergysphere.com', adminPassword, 'ADMIN', 1000, 3],
    );

    const studentPassword = await bcrypt.hash('student123', 12);
    let studentUser = await client.query(
      `SELECT "id" FROM "User" WHERE "email" = 'student@synergysphere.com'`,
    );

    let studentId = studentUser.rows[0]?.id;
    if (!studentId) {
      studentId = newId();
      await client.query(
        `INSERT INTO "User" ("id", "firstName", "lastName", "email", "password", "role", "xp", "level")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [studentId, 'Demo', 'Student', 'student@synergysphere.com', studentPassword, 'STUDENT', 434, 2],
      );
    } else {
      await client.query(
        `UPDATE "User" SET "xp" = 434, "level" = 2, "password" = $1 WHERE "id" = $2`,
        [studentPassword, studentId],
      );
    }

    // 1. Seed 12 Completed Java Curriculum Lessons
    const javaLessonsToSeed = [
      'w3s-java-java-intro',
      'w3s-java-java-get-started',
      'w3s-java-java-syntax',
      'w3s-java-java-variables',
      'w3s-java-java-data-types',
      'w3s-java-java-type-casting',
      'w3s-java-java-operators',
      'w3s-java-java-strings',
      'w3s-java-java-math',
      'w3s-java-java-booleans',
      'w3s-java-java-if...else',
      'w3s-java-java-switch',
    ];

    for (const lessonId of javaLessonsToSeed) {
      await client.query(
        `INSERT INTO "LectureLessonProgress" ("id", "userId", "lessonId", "completedAt")
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '1 day')
         ON CONFLICT ("userId", "lessonId") DO NOTHING`,
        [newId(), studentId, lessonId],
      );
    }

    // 2. Seed 3 Passed Challenges
    const challengesToPass = [
      {
        title: 'Hello World',
        code: 'function greet() {\n  return "Hello, SynergySphere!";\n}',
        xpEarned: 50,
      },
      {
        title: 'Sum Array',
        code: 'function sumArray(arr) {\n  return arr.reduce((a, b) => a + b, 0);\n}',
        xpEarned: 50,
      },
      {
        title: 'FizzBuzz',
        code: 'function fizzBuzz(n) {\n  if (n % 15 === 0) return "FizzBuzz";\n  if (n % 3 === 0) return "Fizz";\n  if (n % 5 === 0) return "Buzz";\n  return n;\n}',
        xpEarned: 75,
      },
    ];

    for (const c of challengesToPass) {
      const challengeRow = await client.query<{ id: string }>(
        `SELECT "id" FROM "Challenge" WHERE "title" = $1 LIMIT 1`,
        [c.title],
      );
      if (challengeRow.rows[0]) {
        await client.query(
          `INSERT INTO "ChallengeAttempt" ("id", "userId", "challengeId", "code", "passed", "xpEarned")
           VALUES ($1, $2, $3, $4, true, $5)
           ON CONFLICT DO NOTHING`,
          [newId(), studentId, challengeRow.rows[0].id, c.code, c.xpEarned],
        );
      }
    }

    // 3. Seed 1 Completed Technical Interview
    const interviewSessionId = newId();
    await client.query(
      `INSERT INTO "Interview" ("id", "userId", "topic", "score", "feedback", "weakAreas", "questions")
       VALUES ($1, $2, 'Java Backend', 82,
         'Strong answer! Covered core OOP, memory management, and collection trade-offs with high technical precision.',
         $3, $4)
       ON CONFLICT DO NOTHING`,
      [
        interviewSessionId,
        studentId,
        JSON.stringify(['Java Threads & Concurrency', 'Spring Boot JDBC Transactions']),
        JSON.stringify([
          {
            id: 'java-records',
            prompt: 'Explain Java Records and how they differ from traditional POJOs.',
            difficulty: 'medium',
            rubric: ['Immutable data carriers', 'Auto-generated equals/hashCode/toString', 'Compact constructor'],
          },
        ]),
      ],
    );

    // 4. Seed 1 Community Project Application
    const projectRow = await client.query<{ id: string }>(
      `SELECT "id" FROM "Project" WHERE "title" = 'Campus Recycling Dashboard' LIMIT 1`,
    );
    if (projectRow.rows[0]) {
      await client.query(
        `INSERT INTO "ProjectApplication" ("id", "projectId", "userId", "status", "message")
         VALUES ($1, $2, $3, 'APPROVED', 'Interested in contributing FastAPI endpoint optimizations and sensor time-series caching.')
         ON CONFLICT DO NOTHING`,
        [newId(), projectRow.rows[0].id, studentId],
      );
    }

    // 5. Seed Real Tasks
    await client.query(
      `INSERT INTO "Task" ("id", "userId", "title", "description", "status", "dueDate")
       VALUES
         ($1, $2, 'Master Java Collections & HashMap Internals', 'Complete ArrayList vs LinkedList analysis and write comparator tests.', 'DONE', CURRENT_DATE - INTERVAL '1 day'),
         ($3, $2, 'Review Spring Boot JDBC Transactions', 'Follow take-home tutorial on database isolation levels and rollbacks.', 'IN_PROGRESS', CURRENT_DATE + INTERVAL '2 days')
       ON CONFLICT DO NOTHING`,
      [newId(), studentId, newId()],
    );

    // 6. Seed Wellness Log
    await client.query(
      `INSERT INTO "Wellness" ("id", "userId", "stressLevel", "mood", "energyLevel", "notes", "date")
       VALUES ($1, $2, 3, 8, 8, 'Productive morning session completing Java exercises. Ready for interview practice.', CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [newId(), studentId],
    );

    // 7. Seed Portfolio Profile & Verified STAR Bullet
    await client.query(
      `INSERT INTO "PortfolioProfile" ("id", "userId", "headline", "about", "location", "targetRole", "githubUrl", "linkedinUrl")
       VALUES ($1, $2, 'Aspiring Backend & Systems Developer',
         'Junior software engineer focused on robust Java microservices, PostgreSQL query optimization, and RESTful APIs.',
         'Johannesburg, South Africa', 'Junior Backend Developer',
         'https://github.com/demostudent', 'https://linkedin.com/in/demostudent')
       ON CONFLICT ("userId") DO UPDATE SET
         "headline" = EXCLUDED."headline",
         "about" = EXCLUDED."about",
         "targetRole" = EXCLUDED."targetRole"`,
      [newId(), studentId],
    );

    await client.query(
      `INSERT INTO "PortfolioBullet" ("id", "userId", "title", "bullet", "source")
       VALUES ($1, $2, 'Campus Recycling Telemetry Ingest',
         'Integrated RESTful sensor payload ingest pipeline with route optimization service, improving campus waste collection dispatch efficiency by 24%.',
         'COMMUNITY_PR')
       ON CONFLICT DO NOTHING`,
      [newId(), studentId],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  console.log('Seed completed!');
  console.log('Demo accounts:');
  console.log('  Admin: admin@synergysphere.com / admin123456');
  console.log('  Student: student@synergysphere.com / student123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
