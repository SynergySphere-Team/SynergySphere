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
    await client.query(
      `INSERT INTO "User" ("id", "firstName", "lastName", "email", "password", "role", "xp", "level")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("email") DO NOTHING`,
      [newId(), 'Demo', 'Student', 'student@synergysphere.com', studentPassword, 'STUDENT', 150, 1],
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
