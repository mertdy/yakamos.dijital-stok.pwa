import fs from 'fs';
import path from 'path';

const JS_BUDGET_BYTES = 1.4 * 1024 * 1024; // 1.4 MB
const CSS_BUDGET_BYTES = 600 * 1024; // 600 KB

const distDir = path.resolve('dist/assets');

if (!fs.existsSync(distDir)) {
  console.error(
    'Error: dist/assets directory not found. Did you run pnpm build?'
  );
  process.exit(1);
}

const files = fs.readdirSync(distDir);
let mainJsFile = null;
let mainCssFile = null;

for (const file of files) {
  if (file.startsWith('index-') && file.endsWith('.js')) {
    mainJsFile = file;
  }
  if (file.startsWith('index-') && file.endsWith('.css')) {
    mainCssFile = file;
  }
}

let failed = false;

if (mainJsFile) {
  const filePath = path.join(distDir, mainJsFile);
  const size = fs.statSync(filePath).size;
  const sizeMb = (size / (1024 * 1024)).toFixed(2);
  const budgetMb = (JS_BUDGET_BYTES / (1024 * 1024)).toFixed(2);
  console.log(
    `Main JS Bundle (${mainJsFile}): ${sizeMb} MB (Budget: ${budgetMb} MB)`
  );
  if (size > JS_BUDGET_BYTES) {
    console.error(
      `❌ FAILURE: Main JS Bundle size exceeds budget of ${budgetMb} MB!`
    );
    failed = true;
  } else {
    console.log(`✅ SUCCESS: Main JS Bundle is within budget.`);
  }
} else {
  console.warn('Warning: Could not find main index-*.js bundle.');
}

if (mainCssFile) {
  const filePath = path.join(distDir, mainCssFile);
  const size = fs.statSync(filePath).size;
  const sizeKb = (size / 1024).toFixed(2);
  const budgetKb = (CSS_BUDGET_BYTES / 1024).toFixed(2);
  console.log(
    `Main CSS Bundle (${mainCssFile}): ${sizeKb} KB (Budget: ${budgetKb} KB)`
  );
  if (size > CSS_BUDGET_BYTES) {
    console.error(
      `❌ FAILURE: Main CSS Bundle size exceeds budget of ${budgetKb} KB!`
    );
    failed = true;
  } else {
    console.log(`✅ SUCCESS: Main CSS Bundle is within budget.`);
  }
} else {
  console.warn('Warning: Could not find main index-*.css bundle.');
}

if (failed) {
  process.exit(1);
} else {
  console.log('🎉 All bundle budgets verified successfully!');
  process.exit(0);
}
