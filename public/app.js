class AgentClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.initElements();
    this.initEventListeners();
    this.connectWebSocket();
    this.loadProjects();
  }

  // Initialize all DOM elements
  initElements() {
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.chatMessages = document.getElementById('chatMessages');
    this.statusEl = document.getElementById('status');
    this.projectsList = document.getElementById('projectsList');
    this.modal = document.getElementById('projectModal');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalBody = document.getElementById('modalBody');
    this.previewFrame = document.getElementById('previewFrame');
    this.previewPlaceholder = document.getElementById('previewPlaceholder');
    this.previewUrl = document.getElementById('previewUrl');
    this.fileSelect = document.getElementById('fileSelect');
    this.codeDisplay = document.getElementById('codeDisplay');
    this.filesTree = document.getElementById('filesTree');
    this.typingIndicator = null;
    this.currentProject = null;
    this.projectFiles = [];
    this.currentFile = null;
  }

  initEventListeners() {
    // Send button and textarea
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Ctrl+Enter to send, auto-resize
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Auto-resize textarea
    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto';
      this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    });

    // Chip buttons (quick actions)
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.messageInput.value = chip.dataset.prompt;
        this.messageInput.focus();
        // Trigger resize
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
      });
    });

    // Preview buttons
    document.getElementById('refreshPreview')?.addEventListener('click', () => {
      if (this.currentProject) {
        this.previewFrame.src = `/preview/${this.currentProject.id}?t=${Date.now()}`;
      }
    });
    
    document.getElementById('openPreview')?.addEventListener('click', () => {
      if (this.currentProject) {
        window.open(`/preview/${this.currentProject.id}`, '_blank');
      }
    });

    // Code buttons
    document.getElementById('copyCode')?.addEventListener('click', () => {
      if (this.currentFile) {
        navigator.clipboard.writeText(this.currentFile.content);
        this.showToast('Код скопирован!');
      }
    });
    
    document.getElementById('downloadCode')?.addEventListener('click', () => {
      if (this.currentFile) {
        const blob = new Blob([this.currentFile.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentFile.path.split('/').pop();
        a.click();
        URL.revokeObjectURL(url);
      }
    });
    
    // File select
    document.getElementById('fileSelect')?.addEventListener('change', (e) => {
      this.loadFileContent(e.target.value);
    });

    // Modal close
    document.querySelector('.close')?.addEventListener('click', () => {
      this.modal?.classList.remove('active');
    });

    // New project button
    document.getElementById('newProjectBtn')?.addEventListener('click', () => {
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
      this.messageInput.focus();
      this.addMessage('Начните новый проект! Опишите что хотите создать.', 'bot');
    });

    // Tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.updateStatus('online');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.updateStatus('offline');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  showTypingIndicator() {
    if (this.typingIndicator) return;
    
    this.typingIndicator = document.createElement('div');
    this.typingIndicator.className = 'message bot typing-indicator';
    this.typingIndicator.id = 'typing-indicator';
    this.typingIndicator.innerHTML = `
      <div class="message-content">
        <span class="typing-text">🤔 Думаю</span>
        <span class="typing-dots">
          <span class="dot">.</span>
          <span class="dot">.</span>
          <span class="dot">.</span>
        </span>
      </div>
    `;
    this.chatMessages.appendChild(this.typingIndicator);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  hideTypingIndicator() {
    if (this.typingIndicator) {
      this.typingIndicator.remove();
      this.typingIndicator = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connectWebSocket(), 2000 * this.reconnectAttempts);
    }
  }

  updateStatus(status) {
    this.statusEl.textContent = status === 'online' ? '● Онлайн' : '● Офлайн';
    this.statusEl.className = `status ${status}`;
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'thinking':
        this.showTypingIndicator();
        break;
      case 'progress':
        this.updateProgress(data);
        break;
      case 'project_created':
        this.hideTypingIndicator();
        if (data.project && data.previewUrl) {
          this.handleProjectCreated(data.project, data.previewUrl);
        }
        break;
      case 'complete':
        this.hideTypingIndicator();
        this.handleProjectComplete(data.project);
        break;
      case 'chat':
        this.hideTypingIndicator();
        this.addMessage(data.content, 'bot');
        break;
      case 'deployed':
        this.hideTypingIndicator();
        this.addMessage(data.content, 'bot');
        break;
      case 'error':
        this.hideTypingIndicator();
        this.addMessage(`❌ ${data.content}`, 'bot');
        break;
      default:
        // Handle any other message types
        console.log('WebSocket message:', data);
    }
  }

  async sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content) return;

    this.addMessage(content, 'user');
    this.messageInput.value = '';

    if (this.connected) {
      this.ws.send(JSON.stringify({ type: 'chat', content }));
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        });
        
        const data = await response.json();
        this.handleResponse(data.response);
      } catch (error) {
        this.addMessage('Ошибка соединения. Попробуйте позже.', 'bot');
      }
    }
  }

  handleResponse(response) {
    switch (response.type) {
      case 'project_created':
        this.addMessage(`${response.content}\n\nID проекта: ${response.projectId}`, 'bot');
        this.loadProjects();
        break;
      case 'build_complete':
        this.addMessage(response.content, 'bot');
        break;
      case 'published':
        this.addMessage(`✅ ${response.content}\nPackage: ${response.packageName}`, 'bot');
        break;
      case 'error':
        this.addMessage(`❌ ${response.content}`, 'bot');
        break;
      case 'status':
        this.addMessage(`${response.content}\n\n${response.projects.map(p => `- ${p.name} (${p.type}): ${p.status}`).join('\n')}`, 'bot');
        break;
      default:
        this.addMessage(response.content, 'bot');
    }
  }

  addMessage(content, sender, thinking = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender} ${thinking ? 'thinking' : ''}`;
    messageDiv.innerHTML = `<div class="message-content">${this.formatMessage(content)}</div>`;
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    if (thinking) {
      setTimeout(() => {
        if (messageDiv.parentNode === this.chatMessages) {
          messageDiv.remove();
        }
      }, 3000);
    }
  }

  formatMessage(content) {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  updateProgress(data) {
    if (data.step === 'generating') {
      this.addMessage(`⏳ ${data.content}`, 'bot', true);
    }
  }

  handleProjectComplete(project) {
    this.addMessage(`✅ Проект "${project.name}" создан!\nСтатус: ${project.status}`, 'bot');
    this.loadProjects();
  }

  async loadProjects() {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      this.renderProjects(data.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  renderProjects(projects) {
    if (!projects || projects.length === 0) {
      this.projectsList.innerHTML = '<div class="empty">Нет активных проектов</div>';
      return;
    }

    this.projectsList.innerHTML = projects.map(p => `
      <div class="project-item" data-id="${p.id}">
        <div class="name">${p.name}</div>
        <div class="meta">${p.type} • ${new Date(p.createdAt).toLocaleDateString()}</div>
        <span class="status ${p.status}">${this.translateStatus(p.status)}</span>
      </div>
    `).join('');

    this.projectsList.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', () => this.showProjectDetails(item.dataset.id));
    });
  }

  translateStatus(status) {
    const translations = {
      generating: 'Генерация...',
      ready: 'Готов',
      building: 'Сборка...',
      built: 'Собран',
      build_failed: 'Ошибка сборки'
    };
    return translations[status] || status;
  }

  async showProjectDetails(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      const p = data.project;
      
      this.modalTitle.textContent = p.name;
      this.modalBody.innerHTML = `
        <p><strong>ID:</strong> ${p.id}</p>
        <p><strong>Тип:</strong> ${p.type}</p>
        <p><strong>Статус:</strong> ${this.translateStatus(p.status)}</p>
        <p><strong>Создан:</strong> ${new Date(p.createdAt).toLocaleString()}</p>
        <p><strong>Описание:</strong> ${p.description}</p>
        <p><strong>Файлы:</strong> ${p.files?.length || 0}</p>
        
        <div style="margin-top: 20px;">
          ${p.build?.apk ? `<a href="/api/projects/${p.id}/download?type=apk" class="action-btn" download>Скачать APK</a>` : ''}
          ${p.build?.aab ? `<a href="/api/projects/${p.id}/download?type=aab" class="action-btn" download>Скачать AAB</a>` : ''}
        </div>
        
        ${p.status === 'ready' ? `
          <button class="action-btn" onclick="client.buildProject('${p.id}')">🔨 Собрать проект</button>
        ` : ''}
        
        ${p.status === 'built' ? `
          <button class="action-btn" onclick="client.publishProject('${p.id}')">🚀 Опубликовать</button>
        ` : ''}
      `;
      
      this.modal.classList.add('active');
    } catch (error) {
      console.error('Failed to load project details:', error);
    }
  }

  async buildProject(projectId) {
    this.modal.classList.remove('active');
    this.addMessage('🔨 Начинаю сборку проекта...', 'bot', true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/build`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.addMessage('✅ Сборка завершена!', 'bot');
        this.loadProjects();
      } else {
        this.addMessage(`❌ Ошибка сборки: ${data.error}`, 'bot');
      }
    } catch (error) {
      this.addMessage('❌ Ошибка при сборке', 'bot');
    }
  }

  async publishProject(projectId) {
    this.modal.classList.remove('active');
    this.addMessage('🚀 Публикуем в Google Play...', 'bot', true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.addMessage(`✅ Опубликовано!\nPackage: ${data.packageName}\nVersion: ${data.versionCode}`, 'bot');
      } else {
        this.addMessage(`❌ Ошибка публикации: ${data.error}`, 'bot');
      }
    } catch (error) {
      this.addMessage('❌ Ошибка при публикации', 'bot');
    }
  }

  handleAction(action) {
    switch (action) {
      case 'android':
        this.messageInput.value = 'Создай Android приложение: ';
        this.messageInput.focus();
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
        break;
      case 'web':
        this.messageInput.value = 'Создай веб-сайт: ';
        this.messageInput.focus();
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
        break;
      case 'build':
        this.addMessage('Выберите проект для сборки из списка справа', 'bot');
        break;
      case 'publish':
        this.addMessage('Выберите собранный проект для публикации', 'bot');
        break;
    }
  }

  // Show toast notification
  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--success);color:white;padding:12px 20px;border-radius:8px;z-index:1000;font-size:0.9rem;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // Load and display project files
  async loadProjectFiles(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`);
      const data = await response.json();
      this.projectFiles = data.files || [];
      
      // Update file select
      this.fileSelect.innerHTML = '<option>Выберите файл...</option>';
      this.projectFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file.path;
        option.textContent = file.path;
        this.fileSelect.appendChild(option);
      });
      
      // Auto-select first file and display
      if (this.projectFiles.length > 0) {
        this.currentFile = this.projectFiles[0];
        this.fileSelect.value = this.currentFile.path;
        this.loadFileContent(this.currentFile.path);
      }
      
      // Render file tree
      this.renderFilesTree();
      
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  // Load file content into code editor
  loadFileContent(filePath) {
    const file = this.projectFiles.find(f => f.path === filePath);
    if (file) {
      this.currentFile = file;
      this.codeDisplay.textContent = file.content;
    }
  }

  // Render file tree
  renderFilesTree() {
    if (this.projectFiles.length === 0) {
      this.filesTree.innerHTML = '<div class="files-empty"><p>Нет файлов</p></div>';
      return;
    }

    const tree = {};
    this.projectFiles.forEach(file => {
      const parts = file.path.split('/');
      let current = tree;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          current[part] = { type: 'file', path: file.path };
        } else {
          if (!current[part]) current[part] = { type: 'folder', children: {} };
          current = current[part].children;
        }
      });
    });

    this.filesTree.innerHTML = this.renderTreeNode(tree, '');
    
    // Add click handlers
    this.filesTree.querySelectorAll('.file-tree-item[data-path]').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        this.loadFileContent(path);
        this.fileSelect.value = path;
        // Switch to code tab
        this.switchTab('code');
      });
    });
  }

  renderTreeNode(node, prefix) {
    let html = '';
    for (const [name, data] of Object.entries(node)) {
      if (data.type === 'file') {
        html += `<div class="file-tree-item" data-path="${data.path}"><span class="file-icon">📄</span>${name}</div>`;
      } else {
        html += `<div class="file-tree-item folder"><span class="file-icon">📁</span>${name}</div>`;
        html += `<div style="padding-left: 16px;">${this.renderTreeNode(data.children, prefix + name + '/')}</div>`;
      }
    }
    return html;
  }

  // Switch tab
  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    const tab = document.querySelector(`[data-tab="${tabName}"]`);
    if (tab) tab.classList.add('active');
    
    const panel = document.getElementById(tabName + 'Panel');
    if (panel) panel.classList.add('active');
  }

  // Handle project creation - update preview
  async handleProjectCreated(project, previewUrl) {
    this.currentProject = project;
    this.addMessage(`✅ Проект создан: ${project.name}`, 'bot');
    
    // Update preview
    if (this.previewPlaceholder) {
      this.previewPlaceholder.classList.add('hidden');
    }
    if (this.previewFrame) {
      this.previewFrame.src = previewUrl;
    }
    if (this.previewUrl) {
      this.previewUrl.textContent = previewUrl;
    }
    
    // Load files
    await this.loadProjectFiles(project.id);
    
    // Switch to preview tab
    this.switchTab('preview');
    
    // Update projects list
    this.loadProjects();
  }

  // Update status badge
  updateStatus(status) {
    if (this.statusEl) {
      this.statusEl.textContent = status === 'online' ? '● Онлайн' : '● Офлайн';
      this.statusEl.className = `status-badge ${status}`;
    }
  }
}

const client = new AgentClient();
