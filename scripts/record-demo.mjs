/**
 * SynergySphere Automated Video Demonstration Recorder
 * Meets all university rubric criteria:
 * - 15 minutes or less
 * - Starts from registration & login through to complete workflow
 * - Explicit function announcements ("This is the [function name] function")
 * - Demonstrates practical operation and final outputs
 */

import { chromium } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RECORDINGS_DIR = path.resolve(__dirname, '../recordings');
const AUDIO_DIR = path.resolve(RECORDINGS_DIR, 'audio');

// Ensure output directories exist
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Check CLI flags
const isHeadless = process.argv.includes('--headless');
const skipAudio = process.argv.includes('--no-audio');
const isFastMode = process.argv.includes('--fast');

// Timing constants (calibrated for clear viewing well within 15 mins)
const STEP_PAUSE = isFastMode ? 1200 : 2600;
const BANNER_PAUSE = isFastMode ? 1500 : 3000;

console.log('====================================================');
console.log('🎥 SynergySphere Automated Workflow Video Recorder');
console.log(`Base URL:     ${BASE_URL}`);
console.log(`Headless:     ${isHeadless}`);
console.log(`Fast Mode:    ${isFastMode}`);
console.log(`Audio Voice:  ${!skipAudio}`);
console.log('====================================================\n');

/**
 * Speaks text using Windows SAPI and saves to a WAV file
 */
function speakAndSaveAudio(text, wavFilePath) {
  if (skipAudio) return Promise.resolve();

  return new Promise((resolve) => {
    const escapedText = text.replace(/"/g, '`"');
    const escapedPath = wavFilePath.replace(/'/g, "''");

    const psScript = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $synth.Rate = 1
      $synth.SetOutputToWaveFile('${escapedPath}')
      $synth.Speak("${escapedText}")
      try {
        $synth.SetOutputToDefaultAudioDevice()
        $synth.Speak("${escapedText}")
      } catch {}
    `;

    const ps = spawn('powershell', ['-NoProfile', '-Command', psScript], {
      windowsHide: true,
    });

    ps.on('close', () => resolve());
    ps.on('error', (err) => {
      console.warn('Speech synthesis warning:', err.message);
      resolve();
    });
  });
}

/**
 * Injects on-screen presenter banner and custom mouse cursor
 */
async function setupPageOverlays(page) {
  await page.evaluate(() => {
    // 1. Mouse cursor trail
    if (!document.getElementById('demo-cursor-dot')) {
      const cursor = document.createElement('div');
      cursor.id = 'demo-cursor-dot';
      cursor.style.position = 'fixed';
      cursor.style.width = '24px';
      cursor.style.height = '24px';
      cursor.style.borderRadius = '50%';
      cursor.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
      cursor.style.border = '2px solid #60a5fa';
      cursor.style.pointerEvents = 'none';
      cursor.style.zIndex = '9999999';
      cursor.style.transition = 'transform 0.08s ease-out, background-color 0.15s ease';
      cursor.style.transform = 'translate(-50%, -50%)';
      cursor.style.display = 'none';

      const inner = document.createElement('div');
      inner.style.position = 'absolute';
      inner.style.top = '50%';
      inner.style.left = '50%';
      inner.style.width = '6px';
      inner.style.height = '6px';
      inner.style.borderRadius = '50%';
      inner.style.backgroundColor = '#ffffff';
      inner.style.transform = 'translate(-50%, -50%)';
      cursor.appendChild(inner);

      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.display = 'block';
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      });

      window.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        cursor.style.backgroundColor = 'rgba(239, 68, 68, 0.6)';
        cursor.style.borderColor = '#f87171';
      });

      window.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
        cursor.style.borderColor = '#60a5fa';
      });
    }

    // 2. Presenter Banner Container
    if (!document.getElementById('demo-presenter-banner')) {
      const banner = document.createElement('div');
      banner.id = 'demo-presenter-banner';
      banner.style.position = 'fixed';
      banner.style.bottom = '36px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.zIndex = '9999998';
      banner.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96))';
      banner.style.border = '2px solid rgba(59, 130, 246, 0.8)';
      banner.style.borderRadius = '16px';
      banner.style.padding = '14px 28px';
      banner.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(59, 130, 246, 0.3)';
      banner.style.backdropFilter = 'blur(12px)';
      banner.style.display = 'flex';
      banner.style.flexDirection = 'column';
      banner.style.alignItems = 'center';
      banner.style.gap = '4px';
      banner.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
      banner.style.minWidth = '420px';
      banner.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      banner.style.opacity = '0';
      banner.style.pointerEvents = 'none';
      document.body.appendChild(banner);
    }
  });
}

/**
 * Displays the presenter banner and triggers audio narration
 */
async function announceFunction(page, stepNumber, totalSteps, statement, detail = '') {
  console.log(`\n📢 [Step ${stepNumber}/${totalSteps}] ${statement}`);

  const wavPath = path.join(AUDIO_DIR, `step_${stepNumber}.wav`);
  const audioPromise = speakAndSaveAudio(statement, wavPath);

  await page.evaluate(({ stepNumber, totalSteps, statement, detail }) => {
    const banner = document.getElementById('demo-presenter-banner');
    if (banner) {
      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 6px; margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #60a5fa;">SynergySphere Showcase</span>
          <span style="font-size: 11px; font-weight: 600; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 8px;">Function ${stepNumber} of ${totalSteps}</span>
        </div>
        <div style="font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.01em;">"${statement}"</div>
        ${detail ? `<div style="font-size: 13px; color: #cbd5e1; text-align: center; margin-top: 2px;">${detail}</div>` : ''}
      `;
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
    }
  }, { stepNumber, totalSteps, statement, detail });

  await Promise.all([audioPromise, page.waitForTimeout(BANNER_PAUSE)]);
}

/**
 * Smooth human-like scrolling
 */
async function smoothScroll(page, distance, steps = 12) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(40);
  }
}

/**
 * Main recording workflow
 */
async function record() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: isHeadless,
    args: ['--start-maximized', '--window-size=1920,1080'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  page.on('load', async () => {
    try {
      await setupPageOverlays(page);
    } catch {}
  });

  const totalSteps = 14;
  let currentStep = 1;
  const demoEmail = `student_${Date.now().toString().slice(-5)}@synergysphere.edu`;

  try {
    // ==========================================
    // STEP 1: USER REGISTRATION
    // ==========================================
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the user registration function.',
      'Demonstrating new account creation and instant onboarding'
    );

    const inputs = page.locator('input');
    await inputs.nth(0).fill('Alex'); // First Name
    await page.waitForTimeout(200);
    await inputs.nth(1).fill('Vance'); // Last Name
    await page.waitForTimeout(200);
    await page.locator('input[type="email"]').fill(demoEmail); // Email
    await page.waitForTimeout(200);
    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill('Student123!'); // Password
    await page.waitForTimeout(200);
    await passInputs.nth(1).fill('Student123!'); // Confirm Password
    await page.waitForTimeout(500);

    // Submit form
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 2: USER LOGIN
    // ==========================================
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the user login function.',
      'Demonstrating secure JWT credential authentication'
    );

    await page.locator('input[type="email"]').fill('student@synergysphere.com');
    await page.waitForTimeout(250);
    await page.locator('input[type="password"]').fill('student123');
    await page.waitForTimeout(400);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1000);
    await setupPageOverlays(page);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 3: MAIN DASHBOARD
    // ==========================================
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the main dashboard function.',
      'Overview of student XP, levels, study streaks, and activity analytics'
    );
    await smoothScroll(page, 450);
    await page.waitForTimeout(1000);
    await smoothScroll(page, -450);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 4: LEARNING HUB & CURRICULUM
    // ==========================================
    await page.goto(`${BASE_URL}/learning-hub`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the learning hub function.',
      '1,000+ interactive lessons across modern tech stacks'
    );
    await smoothScroll(page, 400);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 5: CODING CHALLENGES
    // ==========================================
    await page.goto(`${BASE_URL}/coding`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the coding challenge and skill evaluation function.',
      'Algorithm challenges, live test runner, and engineering PR tickets'
    );
    // Click Run Tests button
    const runBtn = page.locator('button:has-text("Run Tests"), button:has-text("Test (Backend)")').first();
    if (await runBtn.isVisible()) {
      await runBtn.click();
      await page.waitForTimeout(2000);
    }
    await smoothScroll(page, 300);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 6: AI CODING ASSISTANT
    // ==========================================
    await page.goto(`${BASE_URL}/ai-assistant`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the AI assistant and workspace function.',
      'Interactive AI study coach with context-aware code analysis'
    );
    const chatInput = page.locator('input[placeholder*="Ask about code"], input[placeholder*="Ask"]').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('Explain how binary search achieves O(log n) time complexity.');
      await page.waitForTimeout(400);
      const sendBtn = page.locator('button:has-text("Send"), button:has(svg.lucide-send)').first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        await page.waitForTimeout(3000); // Give AI time to stream response
      }
    }
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 7: LECTURE-TO-LIFE
    // ==========================================
    await page.goto(`${BASE_URL}/lecture-to-life`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the lecture to life transformation function.',
      'Converts theoretical slides and syllabus notes into actionable coding tasks'
    );
    await smoothScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 8: TASK MANAGEMENT & PRODUCTIVITY
    // ==========================================
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the task and productivity management function.',
      'Kanban task tracker with Pomodoro focus timer and portfolio push'
    );
    const addTaskTrigger = page.locator('button:has-text("Add New Task")').first();
    if (await addTaskTrigger.isVisible()) {
      await addTaskTrigger.click();
      await page.waitForTimeout(500);
      const titleInput = page.locator('input[placeholder*="Build JWT"], input[placeholder*="task"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('SynergySphere End-to-End Walkthrough');
        await page.waitForTimeout(300);
        const submitTaskBtn = page.locator('button[type="submit"]:has-text("Add Task"), button:has-text("Save Task")').first();
        if (await submitTaskBtn.isVisible()) {
          await submitTaskBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    await smoothScroll(page, 300);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 9: WELLNESS TRACKING
    // ==========================================
    await page.goto(`${BASE_URL}/wellness`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the student wellness tracking function.',
      'Mood logging, study-break alerts, and cognitive balance insights'
    );
    const moodBtn = page.locator('button:has-text("Good"), button:has-text("Great"), button:has-text("Energized")').first();
    if (await moodBtn.isVisible()) {
      await moodBtn.click();
      await page.waitForTimeout(800);
    }
    await smoothScroll(page, 300);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 10: COMMUNITY PROJECT MATCHING
    // ==========================================
    await page.goto(`${BASE_URL}/community`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the community project matching function.',
      'Collaborative social impact projects connecting student developers'
    );
    await smoothScroll(page, 400);
    await page.waitForTimeout(1000);
    await smoothScroll(page, -400);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 11: MOCK TECHNICAL INTERVIEWS
    // ==========================================
    await page.goto(`${BASE_URL}/interviews`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mock technical interview coaching function.',
      'Simulated behavioral and algorithm interviews with scored feedback'
    );
    await smoothScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 12: STUDENT PORTFOLIO & EVIDENCE
    // ==========================================
    await page.goto(`${BASE_URL}/portfolio`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the student portfolio and evidence function.',
      'Automated verified developer portfolio with badge showcase'
    );
    await smoothScroll(page, 450);
    await page.waitForTimeout(1000);
    await smoothScroll(page, -450);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 13: LEADERBOARD & GAMIFICATION
    // ==========================================
    await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the leaderboard and gamification function.',
      'Competitive XP ranking, level milestones, and student achievements'
    );
    await smoothScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 14: ADMINISTRATOR MANAGEMENT
    // ==========================================
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the administrator management function.',
      'Platform governance, user verification, KPI metrics, and moderation'
    );
    await page.locator('input[type="email"]').fill('admin@synergysphere.com');
    await page.waitForTimeout(200);
    await page.locator('input[type="password"]').fill('admin123456');
    await page.waitForTimeout(300);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await setupPageOverlays(page);
    await smoothScroll(page, 400);
    await page.waitForTimeout(2000);

    // Final Wrap-up Banner
    await announceFunction(
      page,
      14,
      totalSteps,
      'Complete workflow demonstrated successfully.',
      'All major tasks, modules, and end-to-end outputs presented'
    );
    await page.waitForTimeout(3000);

    console.log('\n🎉 Demonstration workflow recorded successfully!');
  } catch (err) {
    console.error('Error during recording execution:', err);
  } finally {
    // Save video file
    const video = page.video();
    await page.close();

    if (video) {
      try {
        const originalPath = await video.path();
        const finalWebm = path.join(RECORDINGS_DIR, 'SynergySphere_Complete_Workflow_Demo.webm');
        const finalMp4 = path.join(RECORDINGS_DIR, 'SynergySphere_Complete_Workflow_Demo.mp4');

        if (fs.existsSync(originalPath)) {
          fs.copyFileSync(originalPath, finalWebm);
          console.log(`\n📹 WebM Video saved to:\n   ${finalWebm}`);

          // Convert to standard MP4 with ffmpeg if available
          if (ffmpegPath && fs.existsSync(ffmpegPath)) {
            console.log('\n🎞️ Transcoding to MP4 for maximum compatibility...');
            try {
              execSync(`"${ffmpegPath}" -y -i "${finalWebm}" -c:v libx264 -pix_fmt yuv420p "${finalMp4}"`, {
                stdio: 'ignore',
              });
              console.log(`✅ MP4 Video saved to:\n   ${finalMp4}`);
            } catch (e) {
              console.warn('MP4 transcoding note:', e.message);
            }
          }
        }
      } catch (videoErr) {
        console.warn('Video save note:', videoErr.message);
      }
    }

    await context.close();
    await browser.close();
  }
}

record();
