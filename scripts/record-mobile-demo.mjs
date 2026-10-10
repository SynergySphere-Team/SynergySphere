/**
 * SynergySphere Automated Mobile Video Demonstration Recorder
 * Demonstrates the React Native / Expo Mobile Application
 * Meets all university rubric criteria:
 * - 15 minutes or less
 * - Starts from registration & login through to complete workflow
 * - Explicit function announcements ("This is the [function name] function")
 * - Demonstrates practical operation and final outputs
 */

import { chromium, devices } from 'playwright-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOBILE_URL = process.env.MOBILE_URL || 'http://localhost:8081';
const RECORDINGS_DIR = path.resolve(__dirname, '../recordings');
const AUDIO_DIR = path.resolve(RECORDINGS_DIR, 'audio_mobile');

if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const isHeadless = process.argv.includes('--headless');
const skipAudio = process.argv.includes('--no-audio');
const isFastMode = process.argv.includes('--fast');

const STEP_PAUSE = isFastMode ? 1400 : 2800;
const BANNER_PAUSE = isFastMode ? 1600 : 3200;

console.log('====================================================');
console.log('📱 SynergySphere Mobile Workflow Video Recorder');
console.log(`Mobile URL:   ${MOBILE_URL}`);
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
    ps.on('error', () => resolve());
  });
}

/**
 * Injects on-screen presenter banner and touch pointer into the mobile DOM
 */
async function setupMobileOverlays(page) {
  await page.evaluate(() => {
    // 1. Touch pointer indicator
    if (!document.getElementById('mobile-touch-dot')) {
      const touch = document.createElement('div');
      touch.id = 'mobile-touch-dot';
      touch.style.position = 'fixed';
      touch.style.width = '32px';
      touch.style.height = '32px';
      touch.style.borderRadius = '50%';
      touch.style.backgroundColor = 'rgba(74, 222, 128, 0.4)';
      touch.style.border = '2px solid #4ade80';
      touch.style.pointerEvents = 'none';
      touch.style.zIndex = '9999999';
      touch.style.transition = 'transform 0.08s ease-out, background-color 0.15s ease';
      touch.style.transform = 'translate(-50%, -50%)';
      touch.style.display = 'none';

      const inner = document.createElement('div');
      inner.style.position = 'absolute';
      inner.style.top = '50%';
      inner.style.left = '50%';
      inner.style.width = '8px';
      inner.style.height = '8px';
      inner.style.borderRadius = '50%';
      inner.style.backgroundColor = '#ffffff';
      inner.style.transform = 'translate(-50%, -50%)';
      touch.appendChild(inner);

      document.body.appendChild(touch);

      window.addEventListener('mousemove', (e) => {
        touch.style.display = 'block';
        touch.style.left = `${e.clientX}px`;
        touch.style.top = `${e.clientY}px`;
      });

      window.addEventListener('mousedown', () => {
        touch.style.transform = 'translate(-50%, -50%) scale(0.75)';
        touch.style.backgroundColor = 'rgba(59, 130, 246, 0.6)';
        touch.style.borderColor = '#60a5fa';
      });

      window.addEventListener('mouseup', () => {
        touch.style.transform = 'translate(-50%, -50%) scale(1)';
        touch.style.backgroundColor = 'rgba(74, 222, 128, 0.4)';
        touch.style.borderColor = '#4ade80';
      });
    }

    // 2. Presenter Banner Container (top docked for mobile)
    if (!document.getElementById('mobile-presenter-banner')) {
      const banner = document.createElement('div');
      banner.id = 'mobile-presenter-banner';
      banner.style.position = 'fixed';
      banner.style.top = '14px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.zIndex = '9999998';
      banner.style.width = 'calc(100% - 24px)';
      banner.style.maxWidth = '390px';
      banner.style.background = 'linear-gradient(135deg, rgba(3, 7, 18, 0.96), rgba(15, 23, 42, 0.96))';
      banner.style.border = '1.5px solid rgba(74, 222, 128, 0.7)';
      banner.style.borderRadius = '14px';
      banner.style.padding = '10px 16px';
      banner.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(74, 222, 128, 0.2)';
      banner.style.backdropFilter = 'blur(10px)';
      banner.style.display = 'flex';
      banner.style.flexDirection = 'column';
      banner.style.alignItems = 'center';
      banner.style.gap = '3px';
      banner.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
      banner.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
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
    const banner = document.getElementById('mobile-presenter-banner');
    if (banner) {
      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 2px;">
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #4ade80;">SynergySphere Mobile</span>
          <span style="font-size: 10px; font-weight: 600; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 6px;">Function ${stepNumber} of ${totalSteps}</span>
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.25;">"${statement}"</div>
        ${detail ? `<div style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 1px;">${detail}</div>` : ''}
      `;
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
    }
  }, { stepNumber, totalSteps, statement, detail });

  await Promise.all([audioPromise, page.waitForTimeout(BANNER_PAUSE)]);
}

/**
 * Smooth touch scroll on mobile
 */
async function smoothTouchScroll(page, distance, steps = 10) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(40);
  }
}

/**
 * Main Mobile Recording Workflow
 */
async function recordMobile() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: isHeadless,
    args: ['--window-size=500,1050'],
  });

  const iPhone = devices['iPhone 14 Pro'];
  const context = await browser.newContext({
    ...iPhone,
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 430, height: 932 },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  page.on('load', async () => {
    try {
      await setupMobileOverlays(page);
    } catch {}
  });

  const totalSteps = 13;
  let currentStep = 1;
  const demoEmail = `mobile_${Date.now().toString().slice(-5)}@synergysphere.edu`;

  try {
    // ==========================================
    // STEP 1: USER REGISTRATION
    // ==========================================
    await page.goto(`${MOBILE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the user registration function.',
      'Mobile onboarding and new student profile creation'
    );

    const inputs = page.locator('input');
    await inputs.nth(0).fill('Jordan'); // First Name
    await page.waitForTimeout(200);
    await inputs.nth(1).fill('Cole'); // Last Name
    await page.waitForTimeout(200);
    await inputs.nth(2).fill(demoEmail); // Email
    await page.waitForTimeout(200);
    await inputs.nth(3).fill('Student123!'); // Password
    await page.waitForTimeout(200);
    await inputs.nth(4).fill('Student123!'); // Confirm Password
    await page.waitForTimeout(400);

    // Tap submit button
    const submitBtn = page.locator('div[role="button"], button').filter({ hasText: /start|register|sign up/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 2: USER LOGIN
    // ==========================================
    await page.goto(`${MOBILE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the user login function.',
      'Mobile authentication with secure token storage'
    );

    await page.locator('input').first().fill('student@synergysphere.com');
    await page.waitForTimeout(250);
    await page.locator('input').nth(1).fill('student123');
    await page.waitForTimeout(400);

    const loginBtn = page.locator('div[role="button"], button').filter({ hasText: /sign in/i }).first();
    await loginBtn.click();
    await page.waitForTimeout(2500);
    await setupMobileOverlays(page);

    // ==========================================
    // STEP 3: MOBILE DASHBOARD
    // ==========================================
    await page.goto(`${MOBILE_URL}/`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile dashboard function.',
      'Engineering activity, level progress, XP, and quick access'
    );
    await smoothTouchScroll(page, 450);
    await page.waitForTimeout(1000);
    await smoothTouchScroll(page, -450);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 4: MOBILE TASKS & PRODUCTIVITY
    // ==========================================
    await page.goto(`${MOBILE_URL}/tasks`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile task management function.',
      'Mobile Kanban task tracker and focus sprint sessions'
    );
    await smoothTouchScroll(page, 400);
    await page.waitForTimeout(1000);
    await smoothTouchScroll(page, -400);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 5: MOBILE WELLNESS TRACKING
    // ==========================================
    await page.goto(`${MOBILE_URL}/wellness`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile wellness tracking function.',
      'Mobile mood check-in, study breaks, and cognitive balance'
    );
    // Tap a mood icon if clickable
    const moodTarget = page.locator('div[role="button"]').filter({ hasText: /good|great|energized|check/i }).first();
    if (await moodTarget.isVisible()) {
      await moodTarget.click();
      await page.waitForTimeout(600);
    }
    await smoothTouchScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 6: MOBILE CODING CHALLENGES
    // ==========================================
    await page.goto(`${MOBILE_URL}/coding`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile coding challenge and learning hub function.',
      'Algorithm challenges, mobile code editor, and live execution'
    );
    await smoothTouchScroll(page, 400);
    await page.waitForTimeout(1000);
    await smoothTouchScroll(page, -400);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 7: MOBILE AI WORKSPACE
    // ==========================================
    await page.goto(`${MOBILE_URL}/ai-assistant`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile AI assistant and workspace function.',
      'AI tutor with context-aware code review and learning support'
    );
    // Tap a suggested topic chip if available
    const suggestedChip = page.locator('div[role="button"]').filter({ hasText: /Explain|closures|query|garbage|lifecycle/i }).first();
    if (await suggestedChip.isVisible()) {
      await suggestedChip.click();
      await page.waitForTimeout(2500);
    } else {
      const chatInput = page.locator('input, textarea').first();
      if (await chatInput.isVisible()) {
        await chatInput.click();
        await page.keyboard.type('Explain recursion in detail.', { delay: 25 });
        await page.waitForTimeout(300);
        const sendBtn = page.locator('div[role="button"], button').filter({ hasText: /send|question/i }).first();
        if (await sendBtn.isVisible() && !await sendBtn.isDisabled()) {
          await sendBtn.click().catch(() => null);
        }
      }
    }
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 8: MOBILE LECTURE-TO-LIFE
    // ==========================================
    await page.goto(`${MOBILE_URL}/lecture-to-life`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile lecture to life transformation function.',
      'Turning lecture notes into structured mobile coding challenges'
    );
    await smoothTouchScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 9: MOBILE COMMUNITY PROJECTS
    // ==========================================
    await page.goto(`${MOBILE_URL}/community`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile community project matching function.',
      'Matching students with collaborative sustainability projects'
    );
    await smoothTouchScroll(page, 450);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 10: MOBILE MOCK INTERVIEWS
    // ==========================================
    await page.goto(`${MOBILE_URL}/interviews`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile mock interview coaching function.',
      'Mobile technical interview simulation with automated scoring'
    );
    await smoothTouchScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 11: MOBILE STUDENT PORTFOLIO
    // ==========================================
    await page.goto(`${MOBILE_URL}/portfolio`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile student portfolio function.',
      'Verified developer credentials, skill badges, and public locker'
    );
    await smoothTouchScroll(page, 450);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 12: MOBILE LEADERBOARD
    // ==========================================
    await page.goto(`${MOBILE_URL}/leaderboard`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile leaderboard and gamification function.',
      'Student XP rankings, streaks, and achievement milestones'
    );
    await smoothTouchScroll(page, 350);
    await page.waitForTimeout(STEP_PAUSE);

    // ==========================================
    // STEP 13: MOBILE ADMINISTRATOR MANAGEMENT
    // ==========================================
    await page.goto(`${MOBILE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await announceFunction(
      page,
      currentStep++,
      totalSteps,
      'This is the mobile administrator management function.',
      'Administrative control, platform analytics, and user oversight'
    );
    await page.locator('input').first().fill('admin@synergysphere.com');
    await page.waitForTimeout(200);
    await page.locator('input').nth(1).fill('admin123456');
    await page.waitForTimeout(300);
    const adminLoginBtn = page.locator('div[role="button"], button').filter({ hasText: /sign in/i }).first();
    await adminLoginBtn.click();
    await page.waitForTimeout(2000);

    await page.goto(`${MOBILE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await setupMobileOverlays(page);
    await smoothTouchScroll(page, 400);
    await page.waitForTimeout(1500);

    // Final Wrap-up Banner
    await announceFunction(
      page,
      13,
      totalSteps,
      'Complete mobile workflow demonstrated successfully.',
      'All mobile tasks, features, and end-to-end outputs presented'
    );
    await page.waitForTimeout(3000);

    console.log('\n🎉 Mobile demonstration workflow recorded successfully!');
  } catch (err) {
    console.error('Error during mobile recording execution:', err);
  } finally {
    const video = page.video();
    await page.close();

    if (video) {
      try {
        const originalPath = await video.path();
        const verticalMp4 = path.join(RECORDINGS_DIR, 'SynergySphere_Mobile_Workflow_Demo_Vertical.mp4');
        const framedMp4 = path.join(RECORDINGS_DIR, 'SynergySphere_Mobile_Workflow_Demo.mp4');

        if (fs.existsSync(originalPath)) {
          // 1. Convert to Vertical MP4
          if (ffmpegPath && fs.existsSync(ffmpegPath)) {
            console.log('\n📱 Exporting Vertical Mobile MP4...');
            try {
              execSync(`"${ffmpegPath}" -y -i "${originalPath}" -c:v libx264 -pix_fmt yuv420p "${verticalMp4}"`, {
                stdio: 'ignore',
              });
              console.log(`✅ Vertical Mobile MP4 saved to:\n   ${verticalMp4}`);
            } catch (e) {
              console.warn('Vertical MP4 export note:', e.message);
            }

            // 2. Export Widescreen (1920x1080) Framed Presentation
            console.log('\n🎬 Generating 1080p Centered Mobile Presentation MP4...');
            try {
              // Scale mobile video cleanly and pad into 1920x1080 with stylish dark background
              execSync(
                `"${ffmpegPath}" -y -i "${originalPath}" -vf "scale=-1:1000,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x070b14" -c:v libx264 -pix_fmt yuv420p "${framedMp4}"`,
                { stdio: 'ignore' }
              );
              console.log(`✅ Widescreen 1080p Mobile Demo saved to:\n   ${framedMp4}`);
            } catch (e) {
              console.warn('Framed presentation export note:', e.message);
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

recordMobile();
