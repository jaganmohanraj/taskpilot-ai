/**
 * External Verification System
 * Runs actual tests, builds, and other external checks to verify completion
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface VerificationConfig {
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
  requireGitCommit?: boolean;
  requireCleanWorkingTree?: boolean;
  customChecks?: Array<{
    name: string;
    command: string;
    expectedExitCode?: number;
  }>;
}

export interface VerificationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    output?: string;
    error?: string;
    duration: number;
  }>;
  summary: string;
}

export class ExternalVerifier {
  private config: VerificationConfig;

  constructor(config: VerificationConfig = {}) {
    this.config = {
      testCommand: config.testCommand,
      buildCommand: config.buildCommand,
      lintCommand: config.lintCommand,
      requireGitCommit: config.requireGitCommit ?? false,
      requireCleanWorkingTree: config.requireCleanWorkingTree ?? false,
      customChecks: config.customChecks || [],
    };
  }

  /**
   * Run all configured verification checks
   */
  async verify(workingDirectory?: string): Promise<VerificationResult> {
    const checks: VerificationResult['checks'] = [];
    const cwd = workingDirectory || process.cwd();

    // Run test command
    if (this.config.testCommand) {
      checks.push(await this.runCheck('Tests', this.config.testCommand, cwd));
    }

    // Run build command
    if (this.config.buildCommand) {
      checks.push(await this.runCheck('Build', this.config.buildCommand, cwd));
    }

    // Run lint command
    if (this.config.lintCommand) {
      checks.push(await this.runCheck('Lint', this.config.lintCommand, cwd));
    }

    // Check git commit
    if (this.config.requireGitCommit) {
      checks.push(await this.checkGitCommit(cwd));
    }

    // Check clean working tree
    if (this.config.requireCleanWorkingTree) {
      checks.push(await this.checkCleanWorkingTree(cwd));
    }

    // Run custom checks
    if (this.config.customChecks) {
      for (const check of this.config.customChecks) {
        checks.push(await this.runCheck(check.name, check.command, cwd, check.expectedExitCode));
      }
    }

    const allPassed = checks.every(c => c.passed);
    const passedCount = checks.filter(c => c.passed).length;

    return {
      passed: allPassed,
      checks,
      summary: `${passedCount}/${checks.length} verification checks passed`,
    };
  }

  /**
   * Verify that tests exist and can be found
   */
  async verifyTestsExist(workingDirectory?: string): Promise<boolean> {
    const cwd = workingDirectory || process.cwd();

    // Common test file patterns
    const patterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      'test/**/*',
      'tests/**/*',
    ];

    try {
      // Check package.json for test script
      const packagePath = path.join(cwd, 'package.json');
      const packageData = await fs.readFile(packagePath, 'utf-8');
      const pkg = JSON.parse(packageData);

      if (pkg.scripts?.test) {
        return true;
      }

      // Check for test files
      for (const pattern of patterns) {
        try {
          const { stdout } = await execAsync(`find . -name "${pattern}" | head -1`, { cwd });
          if (stdout.trim()) {
            return true;
          }
        } catch {
          // Continue checking other patterns
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Run a command and capture result
   */
  private async runCheck(
    name: string,
    command: string,
    cwd: string,
    expectedExitCode = 0
  ): Promise<VerificationResult['checks'][0]> {
    const start = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 300000, // 5 minutes max
      });

      const duration = Date.now() - start;

      return {
        name,
        passed: true,
        output: stdout || stderr,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - start;

      // Check if exit code matches expected
      if (error.code === expectedExitCode) {
        return {
          name,
          passed: true,
          output: error.stdout || error.stderr,
          duration,
        };
      }

      return {
        name,
        passed: false,
        error: error.message,
        output: error.stdout || error.stderr,
        duration,
      };
    }
  }

  /**
   * Check if there's a recent git commit
   */
  private async checkGitCommit(cwd: string): Promise<VerificationResult['checks'][0]> {
    const start = Date.now();

    try {
      const { stdout } = await execAsync('git log -1 --format="%H %s"', { cwd });

      if (stdout.trim()) {
        return {
          name: 'Git Commit',
          passed: true,
          output: `Latest commit: ${stdout.trim()}`,
          duration: Date.now() - start,
        };
      }

      return {
        name: 'Git Commit',
        passed: false,
        error: 'No git commits found',
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        name: 'Git Commit',
        passed: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Check if working tree is clean
   */
  private async checkCleanWorkingTree(cwd: string): Promise<VerificationResult['checks'][0]> {
    const start = Date.now();

    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd });

      const isClean = !stdout.trim();

      return {
        name: 'Clean Working Tree',
        passed: isClean,
        output: isClean ? 'Working tree is clean' : `Uncommitted changes:\n${stdout}`,
        error: isClean ? undefined : 'Working tree has uncommitted changes',
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        name: 'Clean Working Tree',
        passed: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Load verification config from file
   */
  static async loadConfig(configPath: string): Promise<VerificationConfig> {
    try {
      const data = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  /**
   * Create a default verification config
   */
  static createDefaultConfig(projectType: 'node' | 'python' | 'generic' = 'generic'): VerificationConfig {
    switch (projectType) {
      case 'node':
        return {
          testCommand: 'npm test',
          buildCommand: 'npm run build',
          lintCommand: 'npm run lint',
          requireGitCommit: true,
        };
      case 'python':
        return {
          testCommand: 'pytest',
          buildCommand: 'python -m build',
          lintCommand: 'pylint .',
          requireGitCommit: true,
        };
      default:
        return {
          requireGitCommit: true,
          requireCleanWorkingTree: false,
        };
    }
  }
}
