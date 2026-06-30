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
        title: 'Campus Recycling Dashboard',
        category: 'RECYCLING',
        location: 'University Campus',
        organization: 'Green Earth NGO',
        description: 'Build a web dashboard to track recycling rates across campus buildings.',
        requirements: 'React, data visualization, REST API integration',
        xpReward: 200,
      },
      {
        title: 'Eco-Tourism Booking Platform',
        category: 'ECO_TOURISM',
        location: 'Coastal Region',
        organization: 'Sustainable Travel Foundation',
        description: 'Create a booking platform for eco-friendly tourism experiences.',
        requirements: 'Full-stack development, payment integration, responsive design',
        xpReward: 250,
      },
      {
        title: 'Green Infrastructure Monitor',
        category: 'GREEN_INFRASTRUCTURE',
        location: 'Urban District',
        organization: 'City Sustainability Office',
        description: 'Develop IoT dashboard for monitoring green roof and rain garden performance.',
        requirements: 'IoT data handling, real-time charts, alert system',
        xpReward: 300,
      },
    ];

    for (const project of projects) {
      await client.query(
        `INSERT INTO "Project" (
           "id", "title", "category", "location", "organization", "description", "requirements", "xpReward"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("title")
         DO UPDATE SET
           "category" = EXCLUDED."category",
           "location" = EXCLUDED."location",
           "organization" = EXCLUDED."organization",
           "description" = EXCLUDED."description",
           "requirements" = EXCLUDED."requirements",
           "xpReward" = EXCLUDED."xpReward"`,
        [
          newId(),
          project.title,
          project.category,
          project.location,
          project.organization,
          project.description,
          project.requirements,
          project.xpReward,
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
