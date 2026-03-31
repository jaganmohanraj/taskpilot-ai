import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExternalVerifier } from './externalVerifier.js';
import type { VerificationConfig } from './externalVerifier.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ExternalVerifier', () => {
  describe('constructor', () => {
    it('should create verifier with default config', () => {
      const verifier = new ExternalVerifier();
      expect(verifier).toBeDefined();
    });

    it('should create verifier with custom config', () => {
      const config: VerificationConfig = {
        testCommand: 'npm test',
        buildCommand: 'npm run build',
        lintCommand: 'npm run lint',
        requireGitCommit: true,
        requireCleanWorkingTree: true,
      };

      const verifier = new ExternalVerifier(config);
      expect(verifier).toBeDefined();
    });

    it('should use default values for missing config options', () => {
      const config: VerificationConfig = {
        testCommand: 'npm test',
      };

      const verifier = new ExternalVerifier(config);
      expect(verifier).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should pass when no checks configured', async () => {
      const verifier = new ExternalVerifier({});
      const result = await verifier.verify();

      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(0);
      expect(result.summary).toBe('0/0 verification checks passed');
    });

    it('should run test command when configured', async () => {
      const verifier = new ExternalVerifier({
        testCommand: 'echo "tests passed"',
      });

      const result = await verifier.verify();

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('Tests');
      expect(result.checks[0].passed).toBe(true);
      expect(result.checks[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should run build command when configured', async () => {
      const verifier = new ExternalVerifier({
        buildCommand: 'echo "build successful"',
      });

      const result = await verifier.verify();

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('Build');
      expect(result.checks[0].passed).toBe(true);
    });

    it('should run lint command when configured', async () => {
      const verifier = new ExternalVerifier({
        lintCommand: 'echo "linting done"',
      });

      const result = await verifier.verify();

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('Lint');
      expect(result.checks[0].passed).toBe(true);
    });

    it('should run multiple checks', async () => {
      const verifier = new ExternalVerifier({
        testCommand: 'echo "tests"',
        buildCommand: 'echo "build"',
        lintCommand: 'echo "lint"',
      });

      const result = await verifier.verify();

      expect(result.checks).toHaveLength(3);
      expect(result.passed).toBe(true);
      expect(result.summary).toBe('3/3 verification checks passed');
    });

    it('should fail overall when any check fails', async () => {
      const verifier = new ExternalVerifier({
        testCommand: 'echo "tests"',
        buildCommand: 'exit 1',
      });

      const result = await verifier.verify();

      expect(result.passed).toBe(false);
      expect(result.checks).toHaveLength(2);
      expect(result.summary).toBe('1/2 verification checks passed');
    });

    it('should handle command failures', async () => {
      const verifier = new ExternalVerifier({
        testCommand: 'exit 1',
      });

      const result = await verifier.verify();

      expect(result.checks[0].passed).toBe(false);
      expect(result.checks[0].error).toBeDefined();
    });

    it('should run custom checks', async () => {
      const verifier = new ExternalVerifier({
        customChecks: [
          { name: 'Custom Check', command: 'echo "custom"' },
        ],
      });

      const result = await verifier.verify();

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('Custom Check');
      expect(result.checks[0].passed).toBe(true);
    });

    it('should respect expected exit codes in custom checks', async () => {
      const verifier = new ExternalVerifier({
        customChecks: [
          { name: 'Custom Check', command: 'exit 42', expectedExitCode: 42 },
        ],
      });

      const result = await verifier.verify();

      expect(result.checks[0].passed).toBe(true);
    });

    it('should check git commit when required', async () => {
      const verifier = new ExternalVerifier({
        requireGitCommit: true,
      });

      const result = await verifier.verify();

      expect(result.checks.some(c => c.name === 'Git Commit')).toBe(true);
    });

    it('should check clean working tree when required', async () => {
      const verifier = new ExternalVerifier({
        requireCleanWorkingTree: true,
      });

      const result = await verifier.verify();

      expect(result.checks.some(c => c.name === 'Clean Working Tree')).toBe(true);
    });
  });

  describe('verifyTestsExist', () => {
    it('should return true when package.json has test script', async () => {
      const verifier = new ExternalVerifier();
      const result = await verifier.verifyTestsExist();

      expect(result).toBe(true);
    });

    it('should handle missing package.json gracefully', async () => {
      const verifier = new ExternalVerifier();
      const result = await verifier.verifyTestsExist('/nonexistent/path');

      expect(result).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should load config from valid JSON file', async () => {
      const tempDir = '/tmp/verifier-test';
      const configPath = path.join(tempDir, 'verify.json');

      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(
          configPath,
          JSON.stringify({
            testCommand: 'npm test',
            buildCommand: 'npm run build',
          })
        );

        const config = await ExternalVerifier.loadConfig(configPath);

        expect(config.testCommand).toBe('npm test');
        expect(config.buildCommand).toBe('npm run build');
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should return empty config when file does not exist', async () => {
      const config = await ExternalVerifier.loadConfig('/nonexistent/config.json');

      expect(config).toEqual({});
    });

    it('should return empty config when file is invalid JSON', async () => {
      const tempDir = '/tmp/verifier-test';
      const configPath = path.join(tempDir, 'invalid.json');

      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(configPath, 'invalid json');

        const config = await ExternalVerifier.loadConfig(configPath);

        expect(config).toEqual({});
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('createDefaultConfig', () => {
    it('should create node project config', () => {
      const config = ExternalVerifier.createDefaultConfig('node');

      expect(config.testCommand).toBe('npm test');
      expect(config.buildCommand).toBe('npm run build');
      expect(config.lintCommand).toBe('npm run lint');
      expect(config.requireGitCommit).toBe(true);
    });

    it('should create python project config', () => {
      const config = ExternalVerifier.createDefaultConfig('python');

      expect(config.testCommand).toBe('pytest');
      expect(config.buildCommand).toBe('python -m build');
      expect(config.lintCommand).toBe('pylint .');
      expect(config.requireGitCommit).toBe(true);
    });

    it('should create generic project config', () => {
      const config = ExternalVerifier.createDefaultConfig('generic');

      expect(config.testCommand).toBeUndefined();
      expect(config.buildCommand).toBeUndefined();
      expect(config.lintCommand).toBeUndefined();
      expect(config.requireGitCommit).toBe(true);
      expect(config.requireCleanWorkingTree).toBe(false);
    });

    it('should default to generic when no type specified', () => {
      const config = ExternalVerifier.createDefaultConfig();

      expect(config.requireGitCommit).toBe(true);
      expect(config.requireCleanWorkingTree).toBe(false);
    });
  });
});
