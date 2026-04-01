# Deployment Guide

This guide covers deploying TaskPilot AI in various environments.

## Local Development

### Quick Start

```bash
git clone https://github.com/jaganmohanraj/taskpilot-ai.git
cd taskpilot-ai
npm install
npm run build
```

To start the **web dashboard** (default, also used by Render):

```bash
npm start
```

To start the **MCP server** for use with Claude Desktop or other MCP clients:

```bash
npm run start:mcp
```

Database will be created at `./artifacts/taskpilot.db`.

### Development Mode

```bash
npm run dev              # MCP server with hot-reloading
npm run start:dashboard  # Web dashboard with hot-reloading (tsx)
```

Uses `tsx` for hot-reloading during development.

## Claude Desktop Integration

TaskPilot AI runs as an MCP server within Claude Desktop.

### Configuration

Add to `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "taskpilot-ai": {
      "command": "node",
      "args": ["/absolute/path/to/taskpilot-ai/dist/index.js"],
      "env": {
        "DATABASE_PATH": "./artifacts/taskpilot.db"
      }
    }
  }
}
```

### Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### Verify Installation

In Claude Desktop, check that TaskPilot AI tools appear in the MCP tools list.

## Production Deployment

### Render.com Deployment

TaskPilot AI can be deployed to Render.com using the included `render.yaml` configuration.

#### Prerequisites

- GitHub repository connected to Render
- Render account (free tier works)

#### Deployment Steps

1. **Connect your repository to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" and select "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

2. **Configuration**:
   The `render.yaml` file includes:
   - Build command: `npm install --include=dev && npm run build && npm prune --omit=dev`
   - Start command: `node dist/server.js` (runs the web dashboard)
   - Persistent disk for SQLite database at `/opt/render/project/src/artifacts`
   - Environment variables for production

3. **Deploy**:
   - Click "Apply" to deploy
   - Render will build and start your application
   - Access your dashboard at the provided URL

#### Manual Deployment

Alternatively, create a new Web Service manually:

- **Build Command**: `npm install --include=dev && npm run build && npm prune --omit=dev`
- **Start Command**: `node dist/server.js`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `DATABASE_PATH=./artifacts/taskpilot.db`
- **Disk**: Add a persistent disk mounted at `/opt/render/project/src/artifacts` (1GB)

#### Post-Deployment

- The web dashboard will be available at your Render URL
- Database persists across deployments in the mounted disk
- Auto-deploys on git push to main branch

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built files
COPY dist ./dist
COPY artifacts ./artifacts

# Create non-root user
RUN useradd -m -u 1001 taskpilot && \
    chown -R taskpilot:taskpilot /app

USER taskpilot

CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t taskpilot-ai .
docker run -it taskpilot-ai
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  taskpilot:
    build: .
    volumes:
      - ./artifacts:/app/artifacts
    environment:
      - DATABASE_PATH=/app/artifacts/taskpilot.db
      - NODE_ENV=production
    restart: unless-stopped
```

Run:

```bash
docker-compose up -d
```

### Kubernetes Deployment

Create `taskpilot-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taskpilot-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: taskpilot-ai
  template:
    metadata:
      labels:
        app: taskpilot-ai
    spec:
      containers:
      - name: taskpilot
        image: taskpilot-ai:latest
        volumeMounts:
        - name: data
          mountPath: /app/artifacts
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: taskpilot-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: taskpilot-data
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

Apply:

```bash
kubectl apply -f taskpilot-deployment.yaml
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `./artifacts/taskpilot.db` | Path to SQLite database |
| `NODE_ENV` | `development` | Environment (development/production) |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `MCP_DEBUG` | `false` | Enable MCP protocol debugging |

## Database Management

### Backup

```bash
# Create backup
sqlite3 artifacts/taskpilot.db ".backup artifacts/backup-$(date +%Y%m%d).db"

# Compressed backup
sqlite3 artifacts/taskpilot.db ".backup - | gzip > backup-$(date +%Y%m%d).db.gz"
```

### Restore

```bash
# From backup
cp artifacts/backup-20260331.db artifacts/taskpilot.db

# From compressed
gunzip -c backup-20260331.db.gz > artifacts/taskpilot.db
```

### Database Migrations

Currently no migration system. Future versions will include:

```bash
npm run migrate:up    # Apply pending migrations
npm run migrate:down  # Rollback last migration
```

## Performance Tuning

### SQLite Optimization

```typescript
// In production, consider:
db.pragma('journal_mode = WAL'); // Write-Ahead Logging
db.pragma('synchronous = NORMAL'); // Balance safety and speed
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('temp_store = MEMORY'); // Temp tables in memory
```

### Database Size Management

```bash
# Check database size
du -h artifacts/taskpilot.db

# Vacuum database (reclaim space)
sqlite3 artifacts/taskpilot.db "VACUUM;"

# Archive old projects
sqlite3 artifacts/taskpilot.db "UPDATE projects SET status = 'archived' WHERE updated_at < date('now', '-6 months');"
```

## Monitoring

### Health Checks

```bash
# Check if database is accessible
sqlite3 artifacts/taskpilot.db "SELECT COUNT(*) FROM projects;"

# Check for locked database
lsof artifacts/taskpilot.db
```

### Metrics to Track

- Database size
- Number of active projects
- Query performance (slow queries)
- Memory usage
- CPU usage

### Logging

Logs go to stdout/stderr. Capture with your logging infrastructure.

```bash
# Redirect to file
npm start > taskpilot.log 2>&1

# With log rotation
npm start | rotatelogs -n 10 taskpilot.log 100M
```

> **Note**: `npm start` runs the web dashboard (`dist/server.js`). To log the MCP server, replace `npm start` with `npm run start:mcp`.

## Security Hardening

See [security.md](security.md) for full details.

### File Permissions

```bash
chmod 700 artifacts
chmod 600 artifacts/taskpilot.db
```

### Firewall Rules

TaskPilot AI uses stdio, no network ports by default.

If adding web dashboard:
```bash
# Allow only specific IPs
ufw allow from 192.168.1.0/24 to any port 3000
```

## Troubleshooting

### Database Locked

```bash
# Check for locked database
lsof artifacts/taskpilot.db

# Force unlock (dangerous - only if no other process)
rm artifacts/taskpilot.db-shm artifacts/taskpilot.db-wal
```

### Corruption Recovery

```bash
# Check integrity
sqlite3 artifacts/taskpilot.db "PRAGMA integrity_check;"

# Dump and recreate
sqlite3 artifacts/taskpilot.db ".dump" | sqlite3 artifacts/repaired.db
mv artifacts/repaired.db artifacts/taskpilot.db
```

### Memory Issues

```bash
# Check Node memory usage
node --max-old-space-size=4096 dist/index.js

# Profile memory
node --inspect dist/index.js
```

## Scaling Considerations

### Single-User Limits

- SQLite handles ~100,000 projects easily
- Single writer at a time (WAL mode helps)
- Good for individual developers or small teams

### Multi-User Requirements

For multiple concurrent users:
- Consider PostgreSQL instead of SQLite
- Add authentication layer
- Implement row-level security
- Add connection pooling

### Future: Distributed Mode

Roadmap includes:
- Redis for caching
- Message queue for async operations
- Read replicas for analytics
- Multi-database support

## Updating

### Minor Updates

```bash
git pull
npm install
npm run build
# Restart service
```

### Major Updates

Check CHANGELOG.md for breaking changes.

May require database migrations.

## Support

- GitHub Issues: https://github.com/jaganmohanraj/taskpilot-ai/issues
- Documentation: https://github.com/jaganmohanraj/taskpilot-ai/tree/main/docs

---

**Version**: 0.4.0

**Last Updated**: 2026-03-31
