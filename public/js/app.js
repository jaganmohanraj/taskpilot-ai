/**
 * TaskPilot AI Dashboard
 * Frontend application for project management and monitoring
 */

class TaskPilotApp {
  constructor() {
    this.currentView = 'overview';
    this.currentProjectId = null;
    this.currentTab = 'tasks';
    this.projects = [];
    this.socket = null;
    this.init();
  }

  async init() {
    this.setupWebSocket();
    this.setupEventListeners();
    await this.loadProjects();
    this.renderOverview();
  }

  setupWebSocket() {
    // Connect to WebSocket server
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Real-time project updates
    this.socket.on('project:created', (project) => {
      this.projects.push(project);
      if (this.currentView === 'overview') {
        this.renderOverview();
      }
    });

    this.socket.on('project:updated', (project) => {
      const index = this.projects.findIndex(p => p.id === project.id);
      if (index !== -1) {
        this.projects[index] = project;
      }
      if (this.currentView === 'overview') {
        this.renderOverview();
      }
      if (this.currentProjectId === project.id) {
        this.openProject(project.id);
      }
    });

    this.socket.on('project:status-changed', ({ projectId, status }) => {
      if (this.currentView === 'overview') {
        this.renderOverview();
      }
    });

    // Real-time task updates
    this.socket.on('task:created', (task) => {
      if (this.currentProjectId === task.projectId && this.currentTab === 'tasks') {
        this.openProject(this.currentProjectId);
      }
    });

    this.socket.on('task:updated', (task) => {
      if (this.currentProjectId === task.projectId && this.currentTab === 'tasks') {
        this.openProject(this.currentProjectId);
      }
    });

    // Real-time memory and evidence updates
    this.socket.on('memory:added', () => {
      if (this.currentTab === 'memory') {
        this.openProject(this.currentProjectId);
      }
    });

    this.socket.on('evidence:added', () => {
      if (this.currentTab === 'evidence') {
        this.openProject(this.currentProjectId);
      }
    });

    // Verification completed
    this.socket.on('verification:completed', (result) => {
      this.showNotification(
        result.passed ? 'Verification Passed' : 'Verification Failed',
        result.summary,
        result.passed ? 'success' : 'error'
      );
    });
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.switchView(view);
      });
    });

    // New project button
    document.getElementById('newProjectBtn').addEventListener('click', () => {
      this.openNewProjectModal();
    });

    // Modal close
    document.getElementById('modalClose').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('modalCancel').addEventListener('click', () => {
      this.closeModal();
    });

    // Create project form
    document.getElementById('createProjectBtn').addEventListener('click', () => {
      this.createProject();
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refresh();
    });
  }

  async loadProjects() {
    try {
      const response = await fetch('/api/projects');
      this.projects = await response.json();
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.showError('Failed to load projects');
    }
  }

  switchView(view) {
    this.currentView = view;

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(viewEl => {
      viewEl.classList.toggle('active', viewEl.id === `${view}View`);
    });

    if (view === 'overview') {
      this.renderOverview();
    }
  }

  async renderOverview() {
    await this.loadProjects();

    // Calculate stats
    const stats = {
      total: this.projects.length,
      active: this.projects.filter(p => p.status === 'in_progress').length,
      completed: this.projects.filter(p => p.status === 'done').length,
      avgHealth: this.projects.length > 0
        ? Math.round(this.projects.reduce((sum, p) => sum + (p.healthScore || 0), 0) / this.projects.length)
        : 0
    };

    // Render stats
    document.getElementById('totalProjects').textContent = stats.total;
    document.getElementById('activeProjects').textContent = stats.active;
    document.getElementById('completedProjects').textContent = stats.completed;
    document.getElementById('avgHealth').textContent = `${stats.avgHealth}%`;

    // Render projects list
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';

    if (this.projects.length === 0) {
      projectsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">No projects yet</div>
        </div>
      `;
      return;
    }

    this.projects.forEach(project => {
      const card = this.createProjectCard(project);
      projectsList.appendChild(card);
    });
  }

  createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card fade-in';
    card.style.borderLeftColor = this.getStatusColor(project.status);
    card.onclick = () => this.openProject(project.id);

    const progress = project.completenessScore || 0;
    const health = project.healthScore || 0;

    card.innerHTML = `
      <div class="project-card-header">
        <h3 class="project-card-title">${this.escapeHtml(project.title)}</h3>
        <span class="status-badge status-${project.status}">${project.status}</span>
      </div>
      <div class="project-card-body">
        ${this.escapeHtml(project.objective || 'No objective specified')}
      </div>
      <div class="project-card-footer">
        <div style="flex: 1;">
          <div style="font-size: 0.75rem; color: var(--gray-600); margin-bottom: 0.25rem;">Progress</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: var(--gray-600);">Health</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: ${this.getHealthColor(health)};">
            ${health}%
          </div>
        </div>
      </div>
    `;

    return card;
  }

  async openProject(projectId) {
    this.currentProjectId = projectId;
    this.switchView('project');

    // Subscribe to WebSocket updates for this project
    if (this.socket) {
      this.socket.emit('subscribe:project', projectId);
    }

    // Load project data
    const [project, tasks, memory, evidence, timeline, audit, nextAction] = await Promise.all([
      fetch(`/api/projects/${projectId}`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/tasks`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/memory`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/evidence`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/timeline`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/audit`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/next-action`).then(r => r.json())
    ]);

    // Render project header
    document.getElementById('projectTitle').textContent = project.title;
    document.getElementById('projectStatus').className = `status-badge status-${project.status}`;
    document.getElementById('projectStatus').textContent = project.status;

    // Render health metrics
    const health = project.healthScore || 0;
    const completeness = project.completenessScore || 0;

    document.getElementById('projectHealth').textContent = `${health}%`;
    document.getElementById('healthMeter').style.width = `${health}%`;
    document.getElementById('healthMeter').className = `meter-fill ${this.getHealthClass(health)}`;

    document.getElementById('projectCompleteness').textContent = `${completeness}%`;
    document.getElementById('completenessMeter').style.width = `${completeness}%`;

    // Render tabs
    this.renderTasks(tasks);
    this.renderMemory(memory);
    this.renderEvidence(evidence);
    this.renderAudit(audit);
    this.renderTimeline(timeline);

    // Render next action
    this.renderNextAction(nextAction);

    // Switch to tasks tab by default
    this.switchTab('tasks');
  }

  renderTasks(tasks) {
    const container = document.getElementById('tasksList');
    container.innerHTML = '';

    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No tasks yet</div></div>';
      return;
    }

    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item fade-in';
      item.innerHTML = `
        <div class="task-item-header">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <span class="status-badge status-${task.status}">${task.status}</span>
        </div>
        <div class="task-details">
          Priority: ${task.priority} ${task.dependsOn ? `• Depends on: ${task.dependsOn}` : ''}
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderMemory(memory) {
    const container = document.getElementById('memoryList');
    container.innerHTML = '';

    if (memory.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No memory entries</div></div>';
      return;
    }

    memory.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'memory-item fade-in';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <strong style="text-transform: uppercase; color: var(--primary); font-size: 0.875rem;">
            ${entry.kind}
          </strong>
          ${entry.is_resolved ? '<span class="status-badge status-done">Resolved</span>' : ''}
        </div>
        <div style="color: var(--gray-700);">${this.escapeHtml(entry.content)}</div>
        <div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 0.5rem;">
          ${new Date(entry.created_at).toLocaleString()}
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderEvidence(evidence) {
    const container = document.getElementById('evidenceList');
    container.innerHTML = '';

    if (evidence.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No evidence logged</div></div>';
      return;
    }

    evidence.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'evidence-item fade-in';
      item.innerHTML = `
        <div style="font-weight: 600; color: var(--gray-900); margin-bottom: 0.5rem;">
          ${this.escapeHtml(entry.title)}
        </div>
        <div style="color: var(--gray-700); margin-bottom: 0.5rem;">
          ${this.escapeHtml(entry.content)}
        </div>
        <div style="font-size: 0.75rem; color: var(--gray-600);">
          ${new Date(entry.created_at).toLocaleString()}
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderAudit(audit) {
    const container = document.getElementById('auditPanel');

    const passIcon = audit.pass ? '✅' : '❌';
    const passText = audit.pass ? 'PASS' : 'FAIL';
    const passColor = audit.pass ? 'var(--success)' : 'var(--danger)';

    container.innerHTML = `
      <div style="background: white; padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <div style="font-size: 2rem;">${passIcon}</div>
          <div>
            <div style="font-size: 1.5rem; font-weight: 700; color: ${passColor};">${passText}</div>
            <div style="color: var(--gray-600); font-size: 0.875rem;">Completion Audit</div>
          </div>
        </div>
      </div>

      <div style="background: white; padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
        <h4 style="margin-bottom: 1rem; font-weight: 600;">Findings</h4>
        ${audit.findings.map(finding => `
          <div style="padding: 0.75rem; background: var(--gray-50); border-radius: 6px; margin-bottom: 0.5rem;">
            ${this.escapeHtml(finding)}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderTimeline(timeline) {
    const container = document.getElementById('timelinePanel');
    container.innerHTML = '';

    if (timeline.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No timeline events</div></div>';
      return;
    }

    timeline.forEach(event => {
      const item = document.createElement('div');
      item.className = 'timeline-item fade-in';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div style="font-weight: 600; color: var(--gray-900);">
            ${event.entityType}: ${this.escapeHtml(event.entityId)}
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${event.oldStatus ? `<span class="status-badge status-${event.oldStatus}">${event.oldStatus}</span>` : ''}
            <span>→</span>
            <span class="status-badge status-${event.newStatus}">${event.newStatus}</span>
          </div>
        </div>
        ${event.reason ? `<div style="color: var(--gray-700); font-size: 0.875rem; margin-bottom: 0.5rem;">${this.escapeHtml(event.reason)}</div>` : ''}
        <div style="font-size: 0.75rem; color: var(--gray-600);">
          ${new Date(event.timestamp).toLocaleString()}
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderNextAction(action) {
    const container = document.getElementById('nextActionCard');

    if (!action || !action.action) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="next-action-title">NEXT BEST ACTION</div>
      <div class="next-action-text">${this.escapeHtml(action.action)}</div>
      <div class="next-action-reason">${this.escapeHtml(action.reason)}</div>
    `;
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}Panel`);
    });
  }

  openNewProjectModal() {
    document.getElementById('projectModal').classList.add('active');
    document.getElementById('projectTitle').value = '';
    document.getElementById('projectObjective').value = '';
    document.getElementById('projectCriteria').value = '';
  }

  closeModal() {
    document.getElementById('projectModal').classList.remove('active');
  }

  async createProject() {
    const title = document.getElementById('projectTitle').value.trim();
    const objective = document.getElementById('projectObjective').value.trim();
    const acceptanceCriteria = document.getElementById('projectCriteria').value.trim();

    if (!title) {
      this.showError('Project title is required');
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, objective, acceptanceCriteria })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const project = await response.json();
      this.closeModal();
      await this.loadProjects();
      this.renderOverview();
      this.openProject(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      this.showError('Failed to create project');
    }
  }

  async refresh() {
    if (this.currentView === 'overview') {
      await this.renderOverview();
    } else if (this.currentView === 'project' && this.currentProjectId) {
      await this.openProject(this.currentProjectId);
    }
  }

  getStatusColor(status) {
    const colors = {
      draft: 'var(--gray-300)',
      planned: '#3b82f6',
      in_progress: '#f59e0b',
      blocked: '#ef4444',
      awaiting_verification: '#8b5cf6',
      verified: '#10b981',
      done: '#10b981',
      archived: 'var(--gray-400)'
    };
    return colors[status] || 'var(--gray-300)';
  }

  getHealthColor(health) {
    if (health >= 70) return 'var(--success)';
    if (health >= 40) return 'var(--warning)';
    return 'var(--danger)';
  }

  getHealthClass(health) {
    if (health >= 70) return '';
    if (health >= 40) return 'warning';
    return 'danger';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    this.showNotification('Error', message, 'error');
  }

  showNotification(title, message, type = 'info') {
    // Create notification element if it doesn't exist
    let container = document.getElementById('notificationContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationContainer';
      container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
      document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: white;
      border-left: 4px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 6px;
      box-shadow: var(--shadow);
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 0.25rem;">${this.escapeHtml(title)}</div>
      <div style="font-size: 0.875rem; color: var(--gray-700);">${this.escapeHtml(message)}</div>
    `;

    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TaskPilotApp();
});
