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

  initElements() {
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.chatMessages = document.getElementById('chatMessages');
    this.statusEl = document.getElementById('status');
    this.projectsList = document.getElementById('projectsList');
    this.modal = document.getElementById('modal');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalBody = document.getElementById('modalBody');
  }

  initEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAction(e.target.dataset.action));
    });

    document.querySelector('.close').addEventListener('click', () => {
      this.modal.classList.remove('active');
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.modal.classList.remove('active');
      }
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
        this.addMessage(data.content, 'bot', true);
        break;
      case 'progress':
        this.updateProgress(data);
        break;
      case 'complete':
        this.handleProjectComplete(data.project);
        break;
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
      setTimeout(() => messageDiv.remove(), 3000);
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
        break;
      case 'web':
        this.messageInput.value = 'Создай веб-сайт: ';
        this.messageInput.focus();
        break;
      case 'build':
        this.addMessage('Выберите проект для сборки из списка', 'bot');
        break;
      case 'publish':
        this.addMessage('Выберите собранный проект для публикации', 'bot');
        break;
    }
  }
}

const client = new AgentClient();
