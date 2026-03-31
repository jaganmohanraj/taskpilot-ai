# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :x:                |
| < 0.2   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. Do Not Open a Public Issue

Please **do not** open a public GitHub issue for security vulnerabilities. Public disclosure could put users at risk.

### 2. Report Privately

Send your report to: **security@taskpilot-ai.dev** (or create a private security advisory on GitHub)

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 1 week
- **Fix Timeline**: Depends on severity (see below)

### 4. Severity Levels

#### Critical (Fix within 24-48 hours)
- Remote code execution
- SQL injection
- Authentication bypass
- Data leakage of sensitive information

#### High (Fix within 1 week)
- XSS vulnerabilities
- CSRF vulnerabilities
- Privilege escalation
- Significant denial of service

#### Medium (Fix within 2 weeks)
- Information disclosure (non-sensitive)
- Minor denial of service
- Moderate security misconfigurations

#### Low (Fix in next release)
- Security best practice violations
- Minor information leaks

## Security Best Practices for Users

### Database Security

TaskPilot AI uses a local SQLite database. To keep it secure:

1. **File Permissions**: Ensure `artifacts/taskpilot.db` has restricted permissions
   ```bash
   chmod 600 artifacts/taskpilot.db
   ```

2. **Backup Encryption**: Encrypt database backups if stored remotely

3. **Access Control**: Limit access to the database file to authorized users only

### MCP Server Security

The MCP server runs locally and communicates with Claude Desktop:

1. **No Network Exposure**: By default, the server doesn't expose network ports
2. **Local Only**: Intended for single-user, local development use
3. **No Authentication**: Current version assumes trusted local environment

### Environment Variables

If using `.env` files:

1. **Never Commit**: Add `.env` to `.gitignore`
2. **Sensitive Data**: Don't store API keys or secrets in the database
3. **Example File**: Use `.env.example` for documentation only

### Dependencies

We monitor dependencies for known vulnerabilities:

1. **Regular Updates**: Keep dependencies up-to-date
2. **npm audit**: Run `npm audit` regularly
3. **Automated Scanning**: GitHub Dependabot alerts enabled

## Known Security Considerations

### Current Limitations (v0.3.x)

1. **No Authentication**: Single-user system with no auth layer
   - **Status**: By design for local use
   - **Mitigation**: Run in trusted environment only

2. **No Encryption**: Database is not encrypted at rest
   - **Status**: Planned for future release
   - **Mitigation**: Use OS-level encryption

3. **SQL Injection**: Uses parameterized queries
   - **Status**: Protected
   - **Coverage**: All database operations

4. **Input Validation**: Zod validation on all MCP tool inputs
   - **Status**: Protected
   - **Coverage**: All user inputs

### Future Security Enhancements

- [ ] Database encryption at rest
- [ ] Multi-user authentication and authorization
- [ ] API rate limiting
- [ ] Audit logging for security events
- [ ] End-to-end encryption for sensitive data
- [ ] Role-based access control (RBAC)

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. **Private Disclosure**: Security researchers should report privately
2. **Coordinated Release**: We coordinate fixes with reporters
3. **Public Disclosure**: After fix is released and users have time to update
4. **Credit**: We credit reporters (unless they prefer to remain anonymous)

## Security Update Process

When a security issue is confirmed:

1. **Assess**: Evaluate severity and impact
2. **Fix**: Develop and test patch
3. **Release**: Publish security update
4. **Notify**: Alert users via GitHub Security Advisories
5. **Document**: Update CHANGELOG with security notice

## Security Checklist for Contributors

When contributing code:

- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user inputs
- [ ] Parameterized queries (no string concatenation)
- [ ] Proper error handling (don't leak sensitive info)
- [ ] No eval() or similar dangerous functions
- [ ] Dependencies are up-to-date
- [ ] Tests cover security-critical paths

## Contact

For security concerns:
- **Email**: security@taskpilot-ai.dev
- **GitHub**: Private Security Advisory
- **Response Time**: Within 48 hours

## Acknowledgments

We thank the security research community for helping keep TaskPilot AI secure. Security researchers who responsibly disclose vulnerabilities will be acknowledged in our Hall of Fame (unless they prefer anonymity).

---

**Last Updated**: 2026-03-31
**Version**: 1.0
