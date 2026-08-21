#!/usr/bin/env node
/**
 * tests/run-all-tests.js
 * Centralized Multi-Level Automated Test Runner & Anti-Regression Engine
 * 
 * Supports:
 * - Running all test suites across all 8 architectural layers
 * - Filtering by level (--unit, --security, --storage, --ipc, --renderer, --webview, --regression, --smoke)
 * - Beautiful color-coded reporting with pass/fail metrics and duration
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const TEST_LEVELS = [
  {
    id: 'logic',
    flag: '--unit',
    name: 'Level 1: Unit & Logic Tests',
    dir: 'tests/unit/logic'
  },
  {
    id: 'security',
    flag: '--security',
    name: 'Level 2: Security & RBAC Integrity Tests',
    dir: 'tests/unit/security'
  },
  {
    id: 'storage',
    flag: '--storage',
    name: 'Level 3: Storage, Backup & Migration Tests',
    dir: 'tests/unit/storage'
  },
  {
    id: 'ipc',
    flag: '--ipc',
    name: 'Level 4: IPC Contracts & Preload Surface Tests',
    dir: 'tests/integration/ipc'
  },
  {
    id: 'renderer',
    flag: '--renderer',
    name: 'Level 5: Renderer & DOM Component Tests',
    dir: 'tests/integration/renderer'
  },
  {
    id: 'webview',
    flag: '--webview',
    name: 'Level 6: Webview & Anti-Detection Tests',
    dir: 'tests/integration/webview'
  },
  {
    id: 'regression',
    flag: '--regression',
    name: 'Level 7: Dedicated Regression Catalog (REG-XXX)',
    dir: 'tests/regression'
  },
  {
    id: 'smoke',
    flag: '--smoke',
    name: 'Level 8: Smoke & Build Readiness Tests',
    dir: 'tests/smoke'
  }
];

function getFilesFromDir(dirPath) {
  const fullPath = path.join(__dirname, '..', dirPath);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.join(dirPath, f));
}

function runNodeTest(files) {
  return new Promise((resolve) => {
    if (files.length === 0) {
      resolve({ code: 0, stdout: '', stderr: '' });
      return;
    }

    const child = spawn(process.execPath, ['--test', ...files], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      resolve({ code, output });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const startTime = Date.now();

  console.log(`\n${COLORS.bright}${COLORS.cyan}==============================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  🛡️  MARKETPLACE CS DASHBOARD — ANTI-REGRESSION TEST RUNNER   ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}==============================================================${COLORS.reset}\n`);

  let activeLevels = TEST_LEVELS;

  // Filter if specific flag is provided
  const filterFlag = args.find(a => a.startsWith('--'));
  if (filterFlag) {
    const matched = TEST_LEVELS.filter(l => l.flag === filterFlag || `--${l.id}` === filterFlag);
    if (matched.length > 0) {
      activeLevels = matched;
    }
  }

  const results = [];
  let totalFailed = 0;
  let allTestFiles = [];

  for (const level of activeLevels) {
    const files = getFilesFromDir(level.dir);
    if (files.length === 0) continue;

    allTestFiles.push(...files);
    console.log(`${COLORS.bright}${COLORS.blue}▶ Running ${level.name} (${files.length} test files)...${COLORS.reset}`);
    const res = await runNodeTest(files);

    const isSuccess = res.code === 0;
    if (!isSuccess) totalFailed++;

    results.push({
      level: level.name,
      fileCount: files.length,
      success: isSuccess
    });
    console.log('');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`${COLORS.bright}${COLORS.cyan}==============================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}                  TEST EXECUTION SUMMARY                      ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}==============================================================${COLORS.reset}`);

  results.forEach(r => {
    const icon = r.success ? `${COLORS.green}✔ PASS${COLORS.reset}` : `${COLORS.red}✖ FAIL${COLORS.reset}`;
    console.log(` ${icon}  ${r.level.padEnd(50)} [${r.fileCount} files]`);
  });

  console.log(`${COLORS.bright}${COLORS.cyan}--------------------------------------------------------------${COLORS.reset}`);
  console.log(` Total Suites: ${results.length} | Test Files: ${allTestFiles.length} | Duration: ${duration}s`);

  if (totalFailed > 0) {
    console.log(`\n ${COLORS.bright}${COLORS.red}🚨 ANTI-REGRESSION ALERT: ${totalFailed} test suite(s) FAILED!${COLORS.reset}`);
    console.log(` ${COLORS.red}Perbaiki bug yang menyebabkan kegagalan sebelum melakukan commit atau release.${COLORS.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n ${COLORS.bright}${COLORS.green}✨ ALL TEST SUITES PASSED PERFECTLY! 100% REGRESSION-FREE.${COLORS.reset}\n`);
    process.exit(0);
  }
}

main();
