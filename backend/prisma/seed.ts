import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const badges = [
    { name: 'First Steps', description: 'Complete your first challenge', xpRequired: 0, icon: 'target' },
    { name: 'Java Master', description: 'Reach level 5 in Java', xpRequired: 200, icon: 'java' },
    { name: 'SQL Expert', description: 'Complete 5 SQL challenges', xpRequired: 300, icon: 'database' },
    { name: 'Wellness Champion', description: 'Log wellness for 7 consecutive days', xpRequired: 100, icon: 'wellness' },
    { name: 'Community Hero', description: 'Complete a community project', xpRequired: 500, icon: 'community' },
    { name: 'Interview Pro', description: 'Score 80+ on a mock interview', xpRequired: 400, icon: 'interview' },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
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
    await prisma.challenge.upsert({
      where: { title: challenge.title },
      update: challenge,
      create: challenge,
    });
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
    await prisma.project.upsert({
      where: { title: project.title },
      update: project,
      create: project,
    });
  }

  const adminPassword = await bcrypt.hash('admin123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@synergysphere.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@synergysphere.com',
      password: adminPassword,
      role: 'ADMIN',
      xp: 1000,
      level: 3,
    },
  });

  const studentPassword = await bcrypt.hash('student123', 12);
  await prisma.user.upsert({
    where: { email: 'student@synergysphere.com' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Student',
      email: 'student@synergysphere.com',
      password: studentPassword,
      role: 'STUDENT',
      xp: 150,
      level: 1,
    },
  });

  console.log('Seed completed!');
  console.log('Demo accounts:');
  console.log('  Admin: admin@synergysphere.com / admin123456');
  console.log('  Student: student@synergysphere.com / student123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
