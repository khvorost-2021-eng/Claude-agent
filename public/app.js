class AgentClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.sessionId = localStorage.getItem('agent_session_id') || 'session_' + Date.now();
    localStorage.setItem('agent_session_id', this.sessionId);
    
    // Chat management - multiple chats
    this.chats = {};
    this.currentChatId = null;
    
    this.initElements();
    this.initEventListeners();
    this.connectWebSocket();
    this.loadProjects();
    this.initChats();
  }
  
  async initChats() {
    this.chats = await this.loadAllChats();
    this.currentChatId = localStorage.getItem('agent_current_chat_id') || this.createNewChat();
    this.loadCurrentChat();
  }

  // ===== CHAT MANAGEMENT =====
  
  async loadAllChats() {
    // Try loading from server first (persistent)
    try {
      const response = await fetch(`/api/chat-history/${this.sessionId}`);
      const data = await response.json();
      if (data.success && data.history && data.history.length > 0) {
        console.log('Loaded chats from server:', data.history.length);
        // Convert array to object format
        const chats = {};
        data.history.forEach(chat => {
          chats[chat.id] = chat;
        });
        return chats;
      }
    } catch (e) {
      console.log('Server load failed, using localStorage');
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem('agent_all_chats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load chats');
      }
    }
    return {};
  }
  
  async saveAllChats() {
    // Save to localStorage (immediate)
    localStorage.setItem('agent_all_chats', JSON.stringify(this.chats));
    localStorage.setItem('agent_current_chat_id', this.currentChatId);
    
    // Save to server (persistent across sessions)
    try {
      const chatsArray = Object.values(this.chats);
      await fetch(`/api/chat-history/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatsArray })
      });
    } catch (e) {
      console.log('Server save failed (will retry later)');
    }
  }
  
  async createNewChat(title = 'Новый чат') {
    const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.chats[chatId] = {
      id: chatId,
      title: title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.currentChatId = chatId;
    await this.saveAllChats();
    return chatId;
  }
  
  async switchToChat(chatId) {
    if (this.chats[chatId]) {
      this.currentChatId = chatId;
      await this.saveAllChats();
      this.loadCurrentChat();
      this.showToast(`Переключено на: ${this.chats[chatId].title}`);
    }
  }
  
  async deleteChat(chatId) {
    if (this.chats[chatId]) {
      delete this.chats[chatId];
      await this.saveAllChats();
      if (this.currentChatId === chatId) {
        const remainingChats = Object.keys(this.chats);
        if (remainingChats.length > 0) {
          await this.switchToChat(remainingChats[0]);
        } else {
          await this.createNewChat();
          this.loadCurrentChat();
        }
      }
    }
  }
  
  async addMessageToCurrentChat(content, role, metadata = {}) {
    if (!this.chats[this.currentChatId]) {
      await this.createNewChat();
    }
    
    const chat = this.chats[this.currentChatId];
    chat.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    });
    chat.updatedAt = new Date().toISOString();
    
    // Update title based on first user message
    if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1) {
      chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }
    
    await this.saveAllChats();
  }
  
  loadCurrentChat() {
    const chat = this.chats[this.currentChatId];
    if (!chat) return;
    
    // Clear and render messages
    this.chatMessages.innerHTML = '';
    
    // Add welcome message if empty
    if (chat.messages.length === 0) {
      this.addMessage('Привет! Я Claude Dev Agent. Чем могу помочь?', 'bot', false, false);
    } else {
      chat.messages.forEach(msg => {
        if (msg.type === 'image') {
          this.addImageMessage(msg.imageUrl, msg.prompt, false);
        } else if (msg.type === 'media') {
          this.addMediaMessage(msg.files, false);
        } else {
          this.addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false, false);
        }
      });
    }
  }
  
  getAllChatsList() {
    return Object.values(this.chats).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
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
    this.fileInput = document.getElementById('fileInput');
    this.attachBtn = document.getElementById('attachBtn');
    this.pendingFiles = [];
    this.codeDisplay = document.getElementById('codeDisplay');
    this.filesTree = document.getElementById('filesTree');
    this.fileSelect = document.getElementById('fileSelect');
    this.typingIndicator = null;
    this.currentProject = null;
    this.projectFiles = [];
    this.currentFile = null;
  }

  initEventListeners() {
    // Send button and textarea
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Enter to send, Shift+Enter for new line
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
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

    // New chat button - clear chat and start fresh
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
      this.createNewChat();
      this.loadCurrentChat();
      this.showToast('Новый чат создан');
    });

    // History button
    document.getElementById('historyChatBtn')?.addEventListener('click', () => {
      this.showChatHistory();
    });

    document.getElementById('closeChatHistory')?.addEventListener('click', () => {
      document.getElementById('chatHistoryModal')?.classList.remove('active');
    });

    // Delete chat button - clear all messages
    document.getElementById('deleteChatBtn')?.addEventListener('click', () => {
      if (confirm('Очистить весь чат?')) {
        this.chatMessages.innerHTML = '';
        localStorage.removeItem('agent_chat_history');
        this.addMessage('Чат очищен. Чем могу помочь?', 'bot');
        this.showToast('Чат очищен');
      }
    });

    // File attachment
    this.attachBtn?.addEventListener('click', () => this.fileInput?.click());
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

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
      
      // Send session initialization with our saved sessionId
      this.ws.send(JSON.stringify({
        type: 'init_session',
        sessionId: this.sessionId
      }));
    };

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      await this.handleWebSocketMessage(data);
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

  async handleWebSocketMessage(data) {
    switch (data.type) {
      case 'session_init':
        // Save session ID from server
        if (data.sessionId) {
          this.sessionId = data.sessionId;
          localStorage.setItem('agent_session_id', this.sessionId);
        }
        // Restore history from server if available
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          // Clear current messages and restore from server
          this.chatMessages.innerHTML = '';
          data.history.forEach(msg => {
            this.addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false, false);
          });
        }
        break;
      case 'thinking':
        this.showTypingIndicator();
        break;
      case 'progress':
        this.updateProgress(data);
        break;
      case 'project_created':
        this.hideTypingIndicator();
        this.addMessage(data.content, 'bot');
        if (data.project && data.previewUrl) {
          this.handleProjectCreated(data.project, data.previewUrl);
        }
        break;
      case 'project_modified':
        this.hideTypingIndicator();
        this.addMessage(data.content, 'bot');
        if (data.projectId && data.previewUrl) {
          this.handleProjectModified(data.projectId, data.previewUrl);
        }
        break;
      case 'complete':
        this.hideTypingIndicator();
        this.handleProjectComplete(data.project);
        break;
      case 'media_received':
        this.hideTypingIndicator();
        this.displayMedia(data.files, 'bot');
        break;
      case 'image_generated':
        this.hideTypingIndicator();
        this.addMessage(data.content, 'bot');
        if (data.imageUrl) {
          this.addImageMessage(data.imageUrl, data.prompt);
        } else {
          this.addMessage(data.content, 'bot');
        }
        break;
      case 'video_generated':
        this.hideTypingIndicator();
        if (data.videoUrl) {
          this.addVideoMessage(data.videoUrl, data.prompt, data.isImageSequence, data.downloadUrl);
        } else {
          this.addMessage(data.content, 'bot');
        }
        break;
      case 'chat':
        this.hideTypingIndicator();
        this.addMessage(data.content, 'bot');
        break;
      case 'deployed':
        this.hideTypingIndicator();
        await this.addMessage(data.content, 'bot');
        break;
      case 'error':
        this.hideTypingIndicator();
        await this.addMessage(`❌ ${data.content}`, 'bot');
        break;
      default:
        // Handle any other message types
        console.log('WebSocket message:', data);
    }
  }

  async sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content) return;

    await this.addMessage(content, 'user');
    await this.saveLocalHistory(); // Save after adding user message
    this.messageInput.value = '';

    if (this.connected) {
      this.ws.send(JSON.stringify({ type: 'chat', content, sessionId: this.sessionId }));
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
        await this.saveLocalHistory();
      } catch (error) {
        await this.addMessage('Ошибка соединения. Попробуйте позже.', 'bot');
      }
    }
  }

  async handleResponse(response) {
    switch (response.type) {
      case 'project_created':
        await this.addMessage(`${response.content}\n\nID проекта: ${response.projectId}`, 'bot');
        this.loadProjects();
        break;
      case 'build_complete':
        await this.addMessage(response.content, 'bot');
        break;
      case 'published':
        await this.addMessage(`✅ ${response.content}\nPackage: ${response.packageName}`, 'bot');
        break;
      case 'error':
        await this.addMessage(`❌ ${response.content}`, 'bot');
        break;
      case 'status':
        await this.addMessage(`${response.content}\n\n${response.projects.map(p => `- ${p.name} (${p.type}): ${p.status}`).join('\n')}`, 'bot');
        break;
      default:
        await this.addMessage(response.content, 'bot');
    }
  }

  async addMessage(content, sender, thinking = false, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender} ${thinking ? 'thinking' : ''}`;
    messageDiv.innerHTML = `<div class="message-content">${this.formatMessage(content)}</div>`;
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    // Save to current chat
    if (save && !thinking) {
      const role = sender === 'user' ? 'user' : 'assistant';
      await this.addMessageToCurrentChat(content, role);
    }
    
    if (thinking) {
      setTimeout(() => {
        if (messageDiv.parentNode === this.chatMessages) {
          messageDiv.remove();
        }
      }, 3000);
    }
  }
  
  async addImageMessage(imageUrl, prompt = '', save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    const imgId = 'img_' + Date.now();
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>🎨 Сгенерировано изображение:</p>
        <div class="image-wrapper" style="margin-top: 8px; border-radius: 8px; overflow: hidden; background: var(--bg2); min-height: 200px; cursor: zoom-in;" onclick="window.openImageModal('${proxyUrl}', '${prompt.replace(/'/g, "\\'")}')">
          <img id="${imgId}" src="${proxyUrl}" alt="${prompt}" 
               style="width: 100%; max-height: 400px; object-fit: contain; display: block;"
               onload="document.getElementById('loading_${imgId}').style.display='none';"
               onerror="document.getElementById('loading_${imgId}').innerHTML='⚠️ Ошибка загрузки';">
          <div id="loading_${imgId}" style="padding: 40px; text-align: center; color: var(--text2);">
            <div style="width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
            Генерация...
          </div>
        </div>
        <p style="font-size: 0.8rem; color: var(--text2); margin-top: 8px;">${prompt}</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">
          <a href="${imageUrl}" download style="display: inline-block; padding: 6px 12px; background: var(--accent); color: white; text-decoration: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">⬇ Скачать</a>
          <button onclick="window.openImageModal('${proxyUrl}', '${prompt.replace(/'/g, "\\'")}')" style="display: inline-block; padding: 6px 12px; background: var(--bg3); color: var(--text); border: none; border-radius: 4px; font-size: 0.75rem; margin-left: 8px; cursor: pointer;">🔍 Увеличить</button>
        </p>
      </div>
    `;
    
    if (!document.getElementById('spin-style')) {
      const style = document.createElement('style');
      style.id = 'spin-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    if (save) {
      await this.addMessageToCurrentChat(prompt, 'assistant', { type: 'image', imageUrl, prompt });
    }
  }
  
  async addVideoMessage(videoUrl, prompt = '', isImageSequence = false, downloadUrl = null, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    const isRealVideo = videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4');
    const label = isRealVideo ? '🎬 Сгенерировано видео:' : '🖼️ Кадр (для видео нужен API ключ):';
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(videoUrl)}`;
    
    if (isRealVideo) {
      // Real MP4 video
      messageDiv.innerHTML = `
        <div class="message-content">
          <p>${label} "${prompt}"</p>
          <video 
            src="${videoUrl}" 
            controls 
            preload="metadata"
            style="width: 100%; max-height: 400px; border-radius: 8px; margin-top: 8px;"
          ></video>
          <p style="font-size: 0.8rem; color: var(--text2); margin-top: 8px;">${prompt}</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">
            <a href="${videoUrl}" download style="display: inline-block; padding: 6px 12px; background: var(--bg3); color: var(--text); text-decoration: none; border-radius: 4px; font-size: 0.75rem;">⬇ Скачать</a>
          </p>
        </div>
      `;
    } else {
      // Static image (no API keys available)
      messageDiv.innerHTML = `
        <div class="message-content">
          <p>${label} "${prompt}"</p>
          <div style="position: relative; max-width: 100%; border-radius: 8px; overflow: hidden; margin-top: 8px; background: var(--bg2);">
            <img 
              src="${proxyUrl}" 
              alt="${prompt}" 
              style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; display: block;"
            >
          </div>
          <p style="font-size: 0.8rem; color: var(--text2); margin-top: 8px;">${prompt}</p>
          <p style="font-size: 0.75rem; color: var(--text2); margin-top: 8px; padding: 8px; background: var(--bg3); border-radius: 4px;">
            💡 Для генерации реального видео добавьте API ключ: RUNWAY_API_KEY, REPLICATE_API_KEY или LUMA_API_KEY в файл .env
          </p>
          <p style="font-size: 0.8rem; margin-top: 4px;">
            <a href="${videoUrl}" download style="display: inline-block; padding: 6px 12px; background: var(--bg3); color: var(--text); text-decoration: none; border-radius: 4px; font-size: 0.75rem;">⬇ Скачать кадр</a>
          </p>
        </div>
      `;
    }
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    if (save) {
      await this.addMessageToCurrentChat(prompt, 'assistant', { type: 'video', videoUrl, prompt, isImageSequence, downloadUrl });
    }
  }
  
  async addMediaMessage(files, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    
    let mediaHtml = '<div class="message-media-container">';
    files.forEach(file => {
      if (file.type === 'image') {
        mediaHtml += `<div class="message-media"><img src="${file.url}" alt="${file.filename}" onclick="window.open('${file.url}', '_blank')"></div>`;
      } else if (file.type === 'video') {
        mediaHtml += `<div class="message-media"><video src="${file.url}" controls></video></div>`;
      } else {
        mediaHtml += `<div class="message-file">📎 <a href="${file.url}" target="_blank" download>${file.filename}</a></div>`;
      }
    });
    mediaHtml += '</div>';
    
    messageDiv.innerHTML = mediaHtml;
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    if (save) {
      await this.addMessageToCurrentChat('Media files', 'user', { type: 'media', files });
    }
  }

  formatMessage(content) {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  updateProgress(data) {
    // Create or update progress message
    let progressDiv = document.getElementById('active-progress');
    
    if (!progressDiv) {
      progressDiv = document.createElement('div');
      progressDiv.id = 'active-progress';
      progressDiv.className = 'message bot progress-message';
      this.chatMessages.appendChild(progressDiv);
    }
    
    const progressPercent = data.progress || 0;
    const progressBar = progressPercent > 0 
      ? `<div style="background: var(--bg3); border-radius: 4px; height: 6px; margin: 8px 0; overflow: hidden;"><div style="background: linear-gradient(90deg, var(--accent), var(--accent2)); height: 100%; width: ${progressPercent}%; transition: width 0.3s;"></div></div>` 
      : '';
    
    const stepIcon = {
      'analyzing': '🔍',
      'content': '📝',
      'generating': '🏗️',
      'page': '📄',
      'file_created': '✅',
      'pages': '📑',
      'image': '🎨',
      'styling': '🎨',
      'js': '⚡',
      'metadata': '📝',
      'complete': '🎉'
    }[data.step] || '⏳';
    
    progressDiv.innerHTML = `
      <div class="message-content">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${stepIcon}</span>
          <span>${data.content || data.message || 'Обработка...'}</span>
          ${progressPercent > 0 ? `<span style="margin-left: auto; font-size: 0.85rem; color: var(--accent);">${progressPercent}%</span>` : ''}
        </div>
        ${progressBar}
      </div>
    `;
    
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    // Remove progress message when complete
    if (data.step === 'complete' || data.progress === 100) {
      setTimeout(() => {
        if (progressDiv && progressDiv.parentNode) {
          progressDiv.remove();
        }
      }, 3000);
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
      item.addEventListener('click', () => {
        const projectId = item.dataset.id;
        // Load project into preview on click
        this.loadProjectIntoPreview(projectId);
        // Also update active state
        this.projectsList.querySelectorAll('.project-item').forEach(p => p.classList.remove('active'));
        item.classList.add('active');
      });
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

  // Handle project modification - update preview
  async handleProjectModified(projectId, previewUrl) {
    this.addMessage(`✅ Проект доработан`, 'bot');
    
    // Update preview
    if (this.previewFrame) {
      // Force refresh by adding timestamp
      this.previewFrame.src = previewUrl + '?t=' + Date.now();
    }
    if (this.previewUrl) {
      this.previewUrl.textContent = previewUrl;
    }
    
    // Reload files
    await this.loadProjectFiles(projectId);
    
    // Switch to preview tab
    this.switchTab('preview');
    
    // Update projects list
    this.loadProjects();
    
    this.showToast('Проект успешно доработан!');
  }

  async handleProjectCreated(project, previewUrl) {
    this.currentProject = project;
    this.addMessage(`✅ Проект создан: ${project.name}`, 'bot');
    
    // Update preview - ALWAYS hide placeholder and show iframe
    if (this.previewPlaceholder) {
      this.previewPlaceholder.style.display = 'none';
    }
    if (this.previewFrame) {
      this.previewFrame.style.display = 'block';
      this.previewFrame.src = previewUrl || `/preview/${project.id}`;
    }
    if (this.previewUrl) {
      this.previewUrl.textContent = previewUrl || `/preview/${project.id}`;
    }
    
    // Load files
    await this.loadProjectFiles(project.id);
    
    // Switch to preview tab
    this.switchTab('preview');
    
    // Update projects list
    this.loadProjects();
    
    this.showToast('Проект создан и загружен в превью!');
  }

  // Manual load project into preview (for when auto-load fails)
  async loadProjectIntoPreview(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      const project = data.project;
      
      if (!project) {
        this.showToast('Проект не найден');
        return;
      }
      
      this.currentProject = project;
      const previewUrl = `/preview/${project.id}`;
      
      // Show preview
      if (this.previewPlaceholder) {
        this.previewPlaceholder.style.display = 'none';
      }
      if (this.previewFrame) {
        this.previewFrame.style.display = 'block';
        this.previewFrame.src = previewUrl + '?t=' + Date.now();
      }
      if (this.previewUrl) {
        this.previewUrl.textContent = previewUrl;
      }
      
      // Load files
      await this.loadProjectFiles(project.id);
      
      // Switch to preview
      this.switchTab('preview');
      
      this.showToast(`Проект "${project.name}" загружен`);
    } catch (error) {
      console.error('Failed to load project:', error);
      this.showToast('Ошибка загрузки проекта');
    }
  }

  // Update status badge
  updateStatus(status) {
    if (this.statusEl) {
      this.statusEl.textContent = status === 'online' ? '● Онлайн' : '● Офлайн';
      this.statusEl.className = `status-badge ${status}`;
    }
  }

  // Display media files in chat
  displayMedia(files, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    let mediaHtml = '<div class="message-content">';
    
    files.forEach(file => {
      if (file.type === 'image') {
        mediaHtml += `<div class="message-media"><img src="${file.url}" alt="${file.filename}" onclick="window.open('${file.url}', '_blank')"></div>`;
      } else if (file.type === 'video') {
        mediaHtml += `<div class="message-media"><video src="${file.url}" controls></video></div>`;
      } else {
        mediaHtml += `<div class="message-file">📎 <a href="${file.url}" target="_blank" download>${file.filename}</a></div>`;
      }
    });
    
    mediaHtml += '</div>';
    messageDiv.innerHTML = mediaHtml;
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    this.saveLocalHistory();
  }

  // Show chat history - now shows list of all chats
  showChatHistory() {
    const modal = document.getElementById('chatHistoryModal');
    const body = document.getElementById('chatHistoryBody');
    
    const chats = this.getAllChatsList();
    
    if (chats.length === 0) {
      body.innerHTML = '<p>Нет сохраненных чатов</p>';
    } else {
      body.innerHTML = `
        <div class="chats-list">
          ${chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
              <div class="chat-item-header">
                <span class="chat-title">${chat.title}</span>
                <span class="chat-date">${new Date(chat.updatedAt).toLocaleDateString()}</span>
              </div>
              <div class="chat-preview">${chat.messages.length} сообщений</div>
              ${chat.id === this.currentChatId ? '<span class="current-badge">Текущий</span>' : ''}
              <button class="delete-chat-btn" data-chat-id="${chat.id}" title="Удалить чат">×</button>
            </div>
          `).join('')}
        </div>
        <button id="newChatBtn" class="btn-primary" style="margin-top: 15px; width: 100%;">+ Новый чат</button>
      `;
      
      // Click to switch chat
      body.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.classList.contains('delete-chat-btn')) {
            this.switchToChat(item.dataset.chatId);
            modal.classList.remove('active');
          }
        });
      });
      
      // Delete chat button
      body.querySelectorAll('.delete-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Удалить этот чат?')) {
            this.deleteChat(btn.dataset.chatId);
            this.showChatHistory(); // Refresh
          }
        });
      });
      
      // New chat button
      document.getElementById('newChatBtn')?.addEventListener('click', () => {
        this.createNewChat();
        this.loadCurrentChat();
        modal.classList.remove('active');
        this.showToast('Создан новый чат');
      });
    }
    
    modal?.classList.add('active');
  }

  // File handling methods
  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Show file preview in input area
    this.pendingFiles = files;
    const fileNames = files.map(f => f.name).join(', ');
    this.showToast(`Выбрано файлов: ${files.length}`);
    
    // Add visual indicator
    this.addMessage(`📎 Прикреплено: ${fileNames}`, 'user', false, false);
  }

  async uploadAndSendFiles() {
    if (this.pendingFiles.length === 0) return;

    const formData = new FormData();
    this.pendingFiles.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      // Send files via WebSocket
      if (this.connected) {
        this.ws.send(JSON.stringify({
          type: 'media',
          files: data.files,
          sessionId: this.sessionId
        }));
      }

      // Clear pending files
      this.pendingFiles = [];
      this.fileInput.value = '';
      
      return data.files;
    } catch (error) {
      console.error('File upload error:', error);
      this.addMessage('❌ Ошибка загрузки файлов', 'bot');
      return null;
    }
  }

  // Override sendMessage to handle files
  async sendMessage() {
    const content = this.messageInput.value.trim();
    
    // Upload files first if any
    let uploadedFiles = null;
    if (this.pendingFiles.length > 0) {
      uploadedFiles = await this.uploadAndSendFiles();
    }

    if (!content && !uploadedFiles) return;

    // Add text message if content exists
    if (content) {
      this.addMessage(content, 'user');
    }
    
    this.messageInput.value = '';
    this.messageInput.style.height = 'auto';

    // Send via WebSocket
    if (this.connected) {
      this.ws.send(JSON.stringify({ 
        type: 'chat', 
        content: content || '[Файлы]', 
        files: uploadedFiles,
        sessionId: this.sessionId 
      }));
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: content,
            files: uploadedFiles 
          })
        });
        
        const data = await response.json();
        this.handleResponse(data.response);
        this.saveLocalHistory();
      } catch (error) {
        this.addMessage('Ошибка соединения. Попробуйте позже.', 'bot');
      }
    }
  }
}

// Global function for image modal
window.openImageModal = function(imageUrl, prompt) {
  // Create modal if doesn't exist
  let modal = document.getElementById('imageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 10000; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      cursor: zoom-out;
    `;
    modal.onclick = () => modal.style.display = 'none';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="position: relative; max-width: 95%; max-height: 90%;">
      <img src="${imageUrl}" style="max-width: 100%; max-height: 85vh; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <p style="color: white; text-align: center; margin-top: 15px; font-size: 1rem; max-width: 800px;">${prompt || ''}</p>
    </div>
  `;
  modal.style.display = 'flex';
};

const client = new AgentClient();
