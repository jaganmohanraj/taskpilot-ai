# TaskPilot AI Examples

This directory contains real-world examples of using TaskPilot AI.

## Example 1: Building a REST API

**Scenario**: Building a user authentication API with JWT tokens

### Step 1: Create Project

```typescript
// Using start_project prompt
Request: "Build a REST API for user authentication with JWT tokens, password hashing, and rate limiting"

// TaskPilot generates:
{
  "title": "User Authentication REST API",
  "objective": "Build secure user authentication system with JWT tokens, bcrypt password hashing, and rate limiting",
  "acceptanceCriteria": `
- POST /api/register endpoint creates new users with hashed passwords
- POST /api/login endpoint returns JWT token for valid credentials
- GET /api/profile endpoint returns user data when authenticated
- Rate limiting prevents brute force attacks (max 5 login attempts per minute)
- All passwords hashed with bcrypt (salt rounds >= 10)
- JWT tokens expire after 24 hours
- API returns proper HTTP status codes and error messages
- All endpoints validated with integration tests
  `
}
```

### Step 2: Generate Work Breakdown

```typescript
// TaskPilot auto-generates tasks:
[
  { title: "Clarify and validate project objective", priority: 1 },
  { title: "Implement: POST /api/register endpoint creates new users with hashed passwords", priority: 10 },
  { title: "Implement: POST /api/login endpoint returns JWT token for valid credentials", priority: 20 },
  { title: "Implement: GET /api/profile endpoint returns user data when authenticated", priority: 30 },
  { title: "Implement: Rate limiting prevents brute force attacks", priority: 40 },
  { title: "Implement: All passwords hashed with bcrypt", priority: 50 },
  { title: "Implement: JWT tokens expire after 24 hours", priority: 60 },
  { title: "Implement: API returns proper HTTP status codes and error messages", priority: 70 },
  { title: "Implement: All endpoints validated with integration tests", priority: 80 },
  { title: "Collect completion evidence", priority: 900 },
  { title: "Run completion audit", priority: 1000 }
]
```

### Step 3: Execute With Discipline

As you work, log decisions, assumptions, and blockers:

```typescript
// Log decision
logMemory(projectId, 'decision', 'Using Express.js framework for REST API - team familiar, good middleware ecosystem');

// Log assumption
logMemory(projectId, 'assumption', 'Users have unique email addresses - will use email as primary identifier');

// Log blocker
logMemory(projectId, 'blocker', 'bcrypt installation fails on ARM architecture - need to research solution');

// Update task status
updateTaskStatus(task1Id, 'in_progress', 'Starting implementation of /register endpoint');
updateTaskStatus(task1Id, 'done', 'Endpoint implemented, manual testing successful');

// Log evidence
logEvidence(projectId, 'Register endpoint tests pass',
  'All 15 integration tests for /api/register pass. Screenshot: tests-register.png. Commit: abc123');
```

### Step 4: Handle Blockers

```typescript
// When blocked:
logMemory(projectId, 'blocker', 'Rate limiting library (express-rate-limit) conflicts with TypeScript types');

// Later, when resolved:
resolveMemory(blockerId, 'Installed @types/express-rate-limit package, types now work correctly');
```

### Step 5: Verify Before Closure

```typescript
// Run completion audit
const audit = runCompletionAudit(projectId);

// If audit fails:
const reasons = whyNotDone(projectId);
// Returns:
// - "1 unverified assumptions remain" (email uniqueness not verified)
// - "Integration tests not complete"

// Address gaps:
resolveMemory(assumptionId, 'Verified: database has unique constraint on email column');
logEvidence(projectId, 'All tests pass', 'Test suite: 45/45 passing. Coverage: 94%. CI build: #127');

// Try again:
closeProjectIfVerified(projectId);
// Success! Project closed.
```

---

## Example 2: Refactoring Legacy Code

**Scenario**: Refactoring a monolithic file into modular components

### Setup

```typescript
{
  "title": "Refactor user service into modules",
  "objective": "Break down 2000-line UserService.ts into focused, testable modules without breaking existing functionality",
  "acceptanceCriteria": `
- Split UserService into: UserRepository, UserValidator, UserAuthenticator, UserNotifier
- Each module has single responsibility and < 200 lines
- All existing tests still pass
- No changes to public API surface
- Add unit tests for new modules (> 80% coverage)
- Update imports in all dependent files
  `
}
```

### Tracking Progress

```typescript
// As you refactor:
logMemory(projectId, 'decision', 'Extract UserRepository first - handles data layer, fewest dependencies');

updateTaskStatus(createRepositoryTask, 'in_progress');
logEvidence(projectId, 'UserRepository extracted',
  'Created UserRepository.ts (145 lines). All data access methods moved. No logic changed. Commit: def456');

// Track dependencies:
logMemory(projectId, 'note', 'Files depending on UserService: AuthController.ts, ProfileController.ts, AdminPanel.ts (12 files total)');

// After each module:
logEvidence(projectId, 'All tests still pass', 'Test suite: 120/120 passing after UserRepository extraction');
```

### Drift Detection Catches Issues

```typescript
// Halfway through, drift detector notices:
const driftChecks = runDriftDetection(projectId);
// Returns:
// - "abandoned_task": Task "Update imports" has been in progress for 48 hours

// You realize you forgot to update imports. Fix it:
updateTaskStatus(updateImportsTask, 'in_progress');
// ... update all imports ...
updateTaskStatus(updateImportsTask, 'done');
```

---

## Example 3: Bug Fix With Root Cause Analysis

**Scenario**: Fixing a production bug

### Initial Setup

```typescript
{
  "title": "Fix: Users can't upload files > 5MB",
  "objective": "Identify and fix root cause of file upload failures for files larger than 5MB",
  "acceptanceCriteria": `
- Root cause identified and documented
- Fix implemented without breaking existing uploads
- Upload limit increased to 50MB
- Add tests for various file sizes (1MB, 10MB, 50MB, 51MB)
- Deploy to staging and verify
- Add monitoring for upload failures
  `
}
```

### Investigation

```typescript
// Log investigation steps:
logMemory(projectId, 'note', 'Checked client-side: FormData correctly sends large files. Not a frontend issue.');
logMemory(projectId, 'note', 'Checked server logs: "PayloadTooLargeError: request entity too large"');
logMemory(projectId, 'decision', 'Root cause: Express body-parser limit set to 5MB. Need to increase to 50MB.');

// Log assumptions to verify:
logMemory(projectId, 'assumption', 'Increasing limit won't cause memory issues - server has 8GB RAM');
logMemory(projectId, 'assumption', 'S3 bucket has no size restrictions');
```

### Implementation

```typescript
updateTaskStatus(fixTask, 'in_progress');

logEvidence(projectId, 'Fix implemented',
  'Changed body-parser limit from 5MB to 50MB in server.ts line 23. Added request.on("limit") handler. Commit: ghi789');

// Verify assumptions:
resolveMemory(s3AssumptionId, 'Verified: S3 bucket has no size limit. Tested with 100MB file.');
resolveMemory(memoryAssumptionId, 'Load tested: Server handles 10 concurrent 50MB uploads without issues.');

logEvidence(projectId, 'Tests pass', 'Added 4 new upload tests. All 28 upload tests passing. Screenshot: test-results.png');

logEvidence(projectId, 'Staging verified', 'Deployed to staging. Manually tested 45MB file upload - success. Verified in CloudWatch logs.');
```

### Closure

```typescript
const audit = runCompletionAudit(projectId);
// audit.pass === true

closeProjectIfVerified(projectId);
```

---

## Example 4: Multi-Task Dependency Management

**Scenario**: Feature requiring sequential implementation

### Setup

```typescript
{
  "title": "Add payment processing",
  "objective": "Integrate Stripe payment processing for subscription plans",
  "acceptanceCriteria": "Stripe integration, subscription management, webhook handling, receipt emails"
}

// Create tasks with dependencies:
const task1 = createTask(projectId, 'Set up Stripe account and API keys', 'Get credentials', 10);
const task2 = createTask(projectId, 'Create Stripe customer on user registration', 'Link users to Stripe', 20, task1.id);
const task3 = createTask(projectId, 'Implement subscription checkout flow', 'Payment UI', 30, task2.id);
const task4 = createTask(projectId, 'Handle Stripe webhooks', 'Process payment events', 40, task3.id);
const task5 = createTask(projectId, 'Send receipt emails', 'Email notifications', 50, task4.id);
```

### Smart Next Action

```typescript
// At any point:
const nextAction = suggestNextBestAction(projectId);

// If task1 is done, task2 is todo:
// { priority: 'high', action: 'Work on task: Create Stripe customer on user registration', taskId: task2.id }

// If task2 is still in progress:
// { priority: 'high', action: 'Work on task: Create Stripe customer on user registration', taskId: task2.id }
// (Won't suggest task3 because dependency not met)
```

---

## Example 5: Using TaskPilot for TaskPilot Development

**Meta example**: How TaskPilot tracks its own development

```typescript
{
  "title": "Add evidence validation system",
  "objective": "Prevent low-quality evidence from being accepted without validation",
  "acceptanceCriteria": `
- Validate evidence length (minimum 20 characters)
- Detect suspicious patterns (just "done", "ok", etc)
- Score evidence quality (0-100)
- Warn on low-quality evidence but still accept
- Log quality issues as memory notes
- Add tests for validation logic
  `
}

// Work breakdown auto-generated...

// As implementation progresses:
logMemory(projectId, 'decision', 'Warning only, not blocking - allows flexibility while still providing feedback');

logEvidence(projectId, 'Validator implemented',
  'Created validators.ts with validateEvidence() function. Pattern matching, length checks, quality scoring implemented. 185 lines. Commit: jkl012');

logEvidence(projectId, 'Tests added',
  'validators.test.ts: 12 test cases covering all validation scenarios. 100% coverage. All passing.');

logEvidence(projectId, 'Integration complete',
  'Integrated into taskEngine.ts logEvidence() method. Low-quality evidence triggers console.warn and creates memory note. Tested with "done" - correctly flagged.');

// Close when ready:
closeProjectIfVerified(projectId);
```

---

## Tips for Effective Usage

### 1. Be Specific in Acceptance Criteria

❌ Bad: "The feature should work"
✅ Good: "API endpoint returns 200 status, response includes user ID and timestamp, handles rate limiting with 429 status"

### 2. Log Decisions Early

Don't wait until the end. Log architectural decisions as you make them.

### 3. Use Assumptions for Things You Need to Verify

Mark assumptions as resolved only when you've actually verified them.

### 4. Evidence Should Be Verifiable

❌ Bad evidence: "Feature is done"
✅ Good evidence: "Feature deployed to staging. Manual test: user-test-001 successfully completed checkout. Screenshot: checkout-success.png. Commit: abc123"

### 5. Update Task Status Frequently

Keep tasks current. Don't batch updates.

### 6. Let the Verifier Catch Issues

Run `runCompletionAudit` early and often. It will catch missing evidence, unresolved blockers, etc.

### 7. Use Health Scores as Signals

If health score drops significantly, investigate what changed.

---

## Common Patterns

### Pattern: Spike/Research Task

```typescript
logMemory(projectId, 'note', 'Starting research spike: evaluating Redis vs Memcached for caching layer');
// ... research ...
logMemory(projectId, 'decision', 'Chose Redis: better data structure support, pub/sub for real-time features, team familiarity');
logEvidence(projectId, 'Research complete', 'Comparison doc: docs/redis-vs-memcached.md. Benchmarks: Redis 15% faster for our workload');
```

### Pattern: Emergency Bug Fix

```typescript
logMemory(projectId, 'blocker', 'CRITICAL: Production down - database connection pool exhausted');
updateProjectStatus(projectId, 'blocked');
// ... fix ...
logEvidence(projectId, 'Hotfix deployed', 'Increased pool size from 10 to 50. Deployed at 14:32 UTC. Incident report: INC-2024-089');
resolveMemory(blockerId, 'Production restored. Root cause: connection leak in reporting module. Permanent fix in #PR-456');
```

### Pattern: Incremental Feature Rollout

```typescript
// Phase 1
logEvidence(projectId, 'Feature deployed to 5% of users', 'Feature flag: new-checkout enabled for 5%. Monitoring dashboard: no errors after 2 hours');
// Phase 2
logEvidence(projectId, 'Feature deployed to 50% of users', 'Scaled to 50%. Conversion rate: +3.2%. No performance degradation.');
// Phase 3
logEvidence(projectId, 'Feature deployed to 100% of users', 'Full rollout complete. Feature flag removed. Old code deleted in commit xyz789');
```

---

For more examples, see the [docs/examples](.) directory.
