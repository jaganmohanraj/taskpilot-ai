# Security

TaskPilot AI takes security seriously. This document outlines security considerations, best practices, and threat models.

## Security Model

### Architecture Security

**Local-First Design**
- SQLite database stored locally (no network exposure by default)
- No external API calls unless explicitly configured
- Data never leaves your machine without your explicit action

**MCP Protocol Security**
- Communication via stdio (standard input/output)
- No network sockets opened by default
- Runs as subprocess of host application (Claude Desktop)

### Threat Models

#### 1. **SQL Injection** - MITIGATED ✅

**Threat**: Malicious input could manipulate database queries.

**Mitigation**:
- All database queries use parameterized statements
- No string concatenation in SQL
- SQLite prepared statements prevent injection

**Example**:
```typescript
// ✅ SAFE: Parameterized query
db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

// ❌ UNSAFE: String concatenation (NOT USED)
db.exec(`SELECT * FROM projects WHERE id = '${projectId}'`);
```

#### 2. **Command Injection** - MITIGATED ✅

**Threat**: Malicious input could execute system commands.

**Mitigation**:
- No shell command execution based on user input
- No use of `eval()` or dynamic code execution
- All operations go through validated APIs

#### 3. **Path Traversal** - MITIGATED ✅

**Threat**: Malicious paths could access files outside intended directory.

**Mitigation**:
- Database path is controlled (artifacts/ directory)
- No file operations based on user input
- All file paths are internally managed

#### 4. **Denial of Service** - PARTIAL MITIGATION ⚠️

**Threat**: Malicious input could cause excessive resource consumption.

**Current Mitigations**:
- SQLite AUTOCOMMIT prevents long-running transactions
- No recursive operations without limits
- Database size naturally limited by disk space

**Recommendations**:
- Monitor database size
- Set filesystem quotas if needed
- Add project count limits for production deployments

#### 5. **Data Tampering** - MITIGATED ✅

**Threat**: Direct database modification bypasses validation.

**Mitigation**:
- State transition validation enforces legal transitions
- Verifier enforcement prevents invalid project closure
- Evidence validation checks quality
- All changes logged in state_history table

**Auditability**:
```typescript
// Every state change is recorded:
{
  entityType: 'project',
  entityId: 'proj_123',
  oldStatus: 'in_progress',
  newStatus: 'done',
  reason: 'Audit passed',
  changedAt: '2026-03-31T22:30:00Z'
}
```

#### 6. **Information Disclosure** - MITIGATED ✅

**Threat**: Sensitive data leaked through logs or error messages.

**Mitigation**:
- No passwords or secrets stored
- Error messages don't expose internal paths
- Logs controlled by application

**Best Practices**:
- Don't log sensitive data to memory entries
- Use `.env` for any API keys (if added)
- Add `.env` to `.gitignore`

### Input Validation

All external inputs are validated:

#### 1. **Project Creation**
```typescript
// Validated inputs:
- title: string (any length, but empty check recommended)
- objective: string (drift detector flags if < 20 chars)
- acceptanceCriteria: string (validator checks testability)
```

#### 2. **Task Creation**
```typescript
// Validated inputs:
- title: string
- details: string
- priority: number
- dependsOn: optional string (validated to exist)
```

#### 3. **Evidence Logging**
```typescript
// Validated inputs:
- title: string (< 5 chars triggers warning)
- content: string (< 20 chars triggers warning)
// Suspicious patterns detected:
- Single words like "done", "ok"
- Emoji-only content
```

#### 4. **State Transitions**
```typescript
// Valid transitions enforced:
VALID_PROJECT_TRANSITIONS = {
  draft: ['planned', 'archived'],
  planned: ['in_progress', 'blocked', 'archived'],
  in_progress: ['blocked', 'awaiting_verification', 'archived'],
  // ... etc
}

// Invalid transitions throw errors
```

### Database Security

#### File Permissions

```bash
# artifacts/ directory should be readable/writable only by user
chmod 700 artifacts/
chmod 600 artifacts/taskpilot.db
```

#### Backup Security

```bash
# Backup with encryption (if needed)
sqlite3 artifacts/taskpilot.db ".backup - | gpg -c > backup.db.gpg"

# Restore
gpg -d backup.db.gpg | sqlite3 artifacts/taskpilot.db
```

#### Data at Rest

- SQLite does not encrypt by default
- For encryption, use: SQLite Encryption Extension (SEE) or sqlcipher
- Or encrypt the entire filesystem

### MCP Security

#### Host Application Trust

TaskPilot AI trusts the host application (e.g., Claude Desktop):
- Host manages authentication
- Host controls MCP server lifecycle
- Host decides when to call tools

#### Tool Permissions

MCP tools have full database access:
- Can create/update/delete any project
- Can modify any task or memory
- No row-level security within SQLite

**Recommendation**: Run each user with separate database files if multi-user access is needed.

### Production Deployment Security

For production use:

#### 1. **Network Isolation**
```bash
# Don't expose SQLite over network
# If REST API is added, use proper authentication
```

#### 2. **Rate Limiting**
```typescript
// If building web dashboard, add rate limiting:
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

#### 3. **Authentication**
```typescript
// If multi-user, add authentication:
// - JWT tokens
// - OAuth 2.0
// - API keys
// Never store passwords in plain text
```

#### 4. **HTTPS Only**
```typescript
// If exposing over network:
// - Use TLS 1.3
// - Valid certificates (Let's Encrypt)
// - HSTS headers
```

#### 5. **Input Sanitization**
```typescript
// Already implemented:
// - Parameterized SQL queries
// - Evidence validation
// - State transition validation

// Additional recommendations:
// - Limit string lengths
// - Validate email formats (if added)
// - Sanitize HTML (if rendering user content)
```

#### 6. **Logging & Monitoring**
```typescript
// Log security events:
// - Failed state transitions
// - Low-quality evidence submissions
// - Unusual access patterns
// - Database errors
```

### Dependency Security

#### Automated Scanning

CI/CD pipeline includes:
```yaml
# npm audit
npm audit --audit-level=moderate

# Snyk (if configured)
snyk test
```

#### Keeping Dependencies Updated

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update to latest (breaking changes possible)
npm install <package>@latest
```

#### Known Vulnerabilities

Monitor security advisories:
- https://github.com/advisories
- https://snyk.io/vuln
- npm audit reports

### Secure Coding Practices

#### 1. **No Eval**
Never use `eval()`, `Function()`, or `vm.runInContext()` with user input.

#### 2. **No Shell Execution**
Avoid `child_process.exec()` with user input. Use `child_process.spawn()` with array arguments if needed.

#### 3. **Type Safety**
Use TypeScript strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

#### 4. **Error Handling**
```typescript
// Don't expose internal errors
try {
  // operation
} catch (error) {
  console.error('Internal error:', error); // Log internally
  throw new Error('Operation failed'); // Generic message to user
}
```

### Reporting Security Issues

**Do NOT open public GitHub issues for security vulnerabilities.**

Instead, email security concerns to the maintainers privately.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours.

### Security Checklist for Contributors

- [ ] No SQL string concatenation (use prepared statements)
- [ ] No `eval()` or dynamic code execution
- [ ] No shell command execution with user input
- [ ] Input validation for all external data
- [ ] Error messages don't leak sensitive info
- [ ] Tests include security test cases
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets not committed to repository

### Security Updates

Check CHANGELOG.md for security fixes.

Security releases will be marked with `[SECURITY]` prefix.

---

**Last Updated**: 2026-03-31

**Version**: 0.4.0
