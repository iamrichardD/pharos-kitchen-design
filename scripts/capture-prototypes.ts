import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Use absolute path for local file
  const prototypePath = `file://${join(process.cwd(), 'apps/marketing/public/command-v1/index.html')}`;
  const outputDir = join(process.cwd(), 'apps/marketing/public/assets/screenshots');
  
  console.log(`Navigating to: ${prototypePath}`);
  await page.goto(prototypePath);
  await page.setViewportSize({ width: 1280, height: 720 });

  // 1. Hero Interaction (index.astro)
  // Type something to show suggestions
  await page.fill('#omni-input', '/add ');
  await page.waitForTimeout(500); // Wait for animation
  await page.screenshot({ path: join(outputDir, 'hero-interaction.png') });
  console.log('Captured: hero-interaction.png');

  // 2. Spotlight Interaction (features.astro)
  await page.fill('#omni-input', '/add Vulcan');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outputDir, 'spotlight-interaction.png') });
  console.log('Captured: spotlight-interaction.png');

  // 3. Ghost-Link Metadata (features.astro)
  // Select the first item to show inspector data
  await page.press('#omni-input', 'ArrowDown');
  await page.press('#omni-input', 'Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outputDir, 'ghost-link-metadata.png') });
  console.log('Captured: ghost-link-metadata.png');

  // 4. Bridge Step (bridge.astro)
  // Just the inspector area for detail
  const inspector = await page.$('#inspector');
  if (inspector) {
    await inspector.screenshot({ path: join(outputDir, 'bridge-step.png') });
    console.log('Captured: bridge-step.png');
  }

  await browser.close();
}

capture().catch(console.error);
