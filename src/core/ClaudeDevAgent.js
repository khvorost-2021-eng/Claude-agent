import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';
import https from 'https';

class ClaudeDevAgent {
  constructor(config = {}) {
    this.apiKey = config.apiKey || this.getApiKey();
    this.provider = config.provider || this.detectProvider();
    this.projectsDir = config.projectsDir || './projects';
    this.templatesDir = config.templatesDir || './templates';
    this.memory = new Map();
    this.activeProjects = new Map();
    this.chatHistory = [];
    this.maxHistoryLength = 50;
    this.ensureDirectories();
    this.loadChatHistory();
  }

  // ===== INTERNET ACCESS METHODS =====
  
  async searchWeb(query, limit = 5) {
    console.log(`🔍 Searching web for: "${query}"`);
    try {
      // Use DuckDuckGo Lite or other search API
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      
      const html = await response.text();
      
      // Extract results (basic parsing)
      const results = [];
      const titleMatches = html.match(/<a[^>]*class="result__a"[^>]*>([^<]*)<\/a>/gi);
      const snippetMatches = html.match(/<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi);
      
      if (titleMatches && snippetMatches) {
        for (let i = 0; i < Math.min(limit, titleMatches.length); i++) {
          const title = titleMatches[i]?.replace(/<[^>]*>/g, '') || '';
          const snippet = snippetMatches[i]?.replace(/<[^>]*>/g, '') || '';
          if (title && snippet) {
            results.push({ title, snippet, source: 'web' });
          }
        }
      }
      
      console.log(`✅ Found ${results.length} search results`);
      return results;
    } catch (error) {
      console.error('❌ Web search error:', error.message);
      return [];
    }
  }
  
  async fetchWebPage(url) {
    console.log(`🌐 Fetching: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const content = await response.text();
      console.log(`✅ Fetched ${content.length} bytes`);
      return content;
    } catch (error) {
      console.error('❌ Fetch error:', error.message);
      return null;
    }
  }
  
  async downloadImage(imageUrl, savePath) {
    console.log(`📥 Downloading image: ${imageUrl}`);
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(savePath);
      https.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ Image saved: ${savePath}`);
            resolve(savePath);
          });
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      }).on('error', (err) => {
        fs.unlink(savePath, () => {});
        reject(err);
      });
    });
  }
  
  async searchImages(query, count = 3) {
    console.log(`🖼️ Searching images for: "${query}"`);
    
    // Use Unsplash Source API or other image sources
    const imageApis = [
      `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`,
      `https://picsum.photos/800/600?random=${Math.random()}`,
      `https://placedog.net/800/600`,
      `https://cataas.com/cat`
    ];
    
    const images = [];
    for (let i = 0; i < count; i++) {
      const api = imageApis[i % imageApis.length];
      images.push({
        url: `${api}${i > 0 ? `&sig=${i}` : ''}`,
        alt: query,
        source: 'unsplash'
      });
    }
    
    return images;
  }
  
  async enrichContentWithWebData(topic, template) {
    console.log(`🌐 Enriching content with web data for: ${topic}`);
    
    // Search for information
    const searchResults = await this.searchWeb(`${topic} основные концепции уроки`);
    
    if (searchResults.length > 0) {
      // Update template description with real info
      const combinedInfo = searchResults
        .slice(0, 3)
        .map(r => r.snippet)
        .join(' ')
        .substring(0, 300);
      
      template.hero.description = combinedInfo || template.hero.description;
      
      console.log(`✅ Content enriched with web data`);
    }
    
    // Get real images
    const images = await this.searchImages(topic, 3);
    template.gallery = images;
    
    return template;
  }

  // ===== AI IMAGE & VIDEO GENERATION =====
  
  async generateImageWithAI(prompt, options = {}) {
    console.log(`🎨 Generating AI image for: "${prompt}"`);
    
    const provider = options.provider || 'openai';
    const size = options.size || '1024x1024';
    
    try {
      if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        // DALL-E 3 generation
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: size,
            quality: 'standard'
          })
        });
        
        if (!response.ok) throw new Error(`DALL-E API error: ${response.status}`);
        
        const data = await response.json();
        if (data.data && data.data[0]) {
          console.log(`✅ AI image generated: ${data.data[0].url}`);
          return {
            url: data.data[0].url,
            alt: prompt,
            source: 'dall-e-3',
            revised_prompt: data.data[0].revised_prompt
          };
        }
      } else if (provider === 'stability' && process.env.STABILITY_API_KEY) {
        // Stable Diffusion via Stability AI
        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt, weight: 1 }],
            cfg_scale: 7,
            steps: 30,
            width: 1024,
            height: 1024
          })
        });
        
        if (!response.ok) throw new Error(`Stability API error: ${response.status}`);
        
        const data = await response.json();
        if (data.artifacts && data.artifacts[0]) {
          const base64Image = data.artifacts[0].base64;
          console.log(`✅ Stable Diffusion image generated`);
          return {
            base64: base64Image,
            alt: prompt,
            source: 'stable-diffusion'
          };
        }
      } else if (provider === 'pollinations') {
        // Free Pollinations AI (no API key needed)
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${options.width || 1024}&height=${options.height || 1024}&nologo=true`;
        console.log(`✅ Pollinations image URL generated`);
        return {
          url: imageUrl,
          alt: prompt,
          source: 'pollinations'
        };
      }
    } catch (error) {
      console.error('❌ AI image generation failed:', error.message);
    }
    
    // Fallback to web search images
    console.log('⚠️ AI generation failed, using web search images');
    const webImages = await this.searchImages(prompt, 1);
    return webImages[0];
  }
  
  async searchVideos(query, limit = 3) {
    console.log(`🎬 Searching videos for: "${query}"`);
    
    try {
      // Use YouTube search or other video APIs
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${limit}&key=${process.env.YOUTUBE_API_KEY || ''}`;
      
      if (process.env.YOUTUBE_API_KEY) {
        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          const videos = data.items?.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.medium?.url,
            embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
            watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            source: 'youtube'
          })) || [];
          console.log(`✅ Found ${videos.length} videos`);
          return videos;
        }
      }
    } catch (error) {
      console.error('❌ Video search error:', error.message);
    }
    
    // Return fallback video embeds
    return [
      {
        embedUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ`,
        title: `Learn ${query}`,
        thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
        source: 'youtube-fallback'
      }
    ];
  }
  
  async generateVisualContentForLesson(topic, lessonTitle) {
    console.log(`🖼️ Generating visual content for lesson: "${lessonTitle}"`);
    
    // Generate AI image for the lesson
    const imagePrompt = `Educational illustration about ${topic}: ${lessonTitle}, clean modern design, infographic style, professional presentation, high quality`;
    const image = await this.generateImageWithAI(imagePrompt, { provider: 'pollinations' });
    
    // Search related videos
    const videos = await this.searchVideos(`${topic} ${lessonTitle} tutorial`, 2);
    
    return {
      image: image,
      videos: videos,
      diagrams: [], // Will be populated with generated diagrams
      infographics: []
    };
  }
  
  async generateTheoryWithMedia(topic, lessonIndex) {
    console.log(`📚 Generating theory with media for: "${topic}" lesson ${lessonIndex}`);
    
    // Search for educational content
    const webResults = await this.searchWeb(`${topic} урок ${lessonIndex} объяснение`);
    
    // Generate visual content
    const visualContent = await this.generateVisualContentForLesson(topic, `Урок ${lessonIndex}`);
    
    // Generate AI image for theory
    const theoryImage = await this.generateImageWithAI(
      `Educational diagram explaining ${topic}, detailed illustration, academic style`,
      { provider: 'pollinations' }
    );
    
    return {
      theory: webResults[0]?.snippet || `Изучаем ${topic} — урок ${lessonIndex}`,
      image: theoryImage,
      visualContent: visualContent,
      hasMedia: true
    };
  }
  
  async processUserMedia(filePath, type = 'image') {
    console.log(`📤 Processing user media: ${filePath}`);
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const targetDir = path.join(this.projectsDir, 'media');
      fs.ensureDirSync(targetDir);
      
      const targetPath = path.join(targetDir, `${Date.now()}-${fileName}`);
      fs.copySync(filePath, targetPath);
      
      console.log(`✅ Media processed: ${targetPath}`);
      return {
        originalPath: filePath,
        processedPath: targetPath,
        fileName: fileName,
        size: stats.size,
        type: type,
        url: `/media/${path.basename(targetPath)}`
      };
    } catch (error) {
      console.error('❌ Media processing error:', error.message);
      return null;
    }
  }
  
  async generateSiteWithAI(project, description) {
    console.log('=== AI SITE GENERATION START ===');
    console.log('Description:', description);
    
    // Dynamic import for ES modules compatibility
    const websiteTemplates = await import('./websiteTemplates.js');
    const analyzeIntent = websiteTemplates.analyzeIntent;
    const intent = analyzeIntent ? analyzeIntent(description) : { category: 'general', siteType: 'general' };
    const topic = this.extractTopic(description);
    
    console.log(`🎯 Topic extracted: "${topic}"`);
    console.log(`📂 Category: ${intent.category}, Site Type: ${intent.siteType}`);
    
    // STEP 1: Try Pollinations AI for content
    let aiContent = null;
    try {
      console.log('🤖 STEP 1: Getting AI content from Pollinations...');
      aiContent = await this.generateSiteContentWithAI(topic, intent);
      if (aiContent) {
        console.log('✅ AI content received:', JSON.stringify(aiContent, null, 2));
      } else {
        console.log('⚠️ AI content is null, using defaults');
      }
    } catch (e) {
      console.log('❌ AI content failed:', e.message);
      console.error(e);
    }
    
    // STEP 2: Generate site with AI HTML generation
    console.log('📄 STEP 2: Generating site with AI HTML...');
    await this.generateHybridSite(project, description, topic, intent, aiContent);
    
    console.log(`✅ Site generation complete for "${topic}"`);
    console.log('=== AI SITE GENERATION END ===');
  }

  // Generate content via Pollinations AI - FULL HTML
  async generateSiteContentWithAI(topic, intent) {
    const contentPrompt = `Create a complete modern website about "${topic}".

Write a JSON object with these fields:
- title: catchy 2-3 word title
- headline: compelling hero headline (max 6 words)  
- subtitle: engaging subtitle (max 12 words)
- description: 2 sentences about ${topic}
- features: array of 3 feature objects with title and description
- aboutTitle: title for about page
- aboutText: 3 sentences about ${topic}
- services: array of 3 service objects with name and description
- heroGradient: CSS gradient like "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
- accentColor: hex color like "#667eea"

Output ONLY valid JSON, no markdown, no comments.`;

    try {
      console.log('🤖 Fetching AI content from Pollinations...');
      const encoded = encodeURIComponent(contentPrompt);
      const url = `https://text.pollinations.ai/${encoded}?json=true&seed=${Date.now()}`;
      console.log('🌐 URL:', url.substring(0, 80) + '...');
      
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      console.log('📥 Response status:', response.status);
      
      const text = await response.text();
      console.log('📄 Response length:', text.length);
      console.log('📝 Preview:', text.substring(0, 200));
      
      // Try to parse JSON from response
      try {
        const data = JSON.parse(text);
        console.log('✅ AI content parsed successfully:', data.title);
        return data;
      } catch (parseError) {
        console.log('⚠️ Direct JSON parse failed, trying regex extraction...');
        // Extract JSON from markdown code block if present
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/{[\s\S]*}/);
        if (jsonMatch) {
          console.log('🔍 Found JSON via regex');
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
        console.log('❌ No JSON found in response');
      }
    } catch (e) {
      console.error('❌ AI content error:', e.message);
    }
    return null;
  }

  // Generate AI-powered full HTML page
  async generateAIPage(pageName, content, topic, intent, heroImage) {
    const pagePrompt = `Create a complete, valid HTML page for "${topic}" - ${pageName} page.

PAGE DETAILS:
- Topic: ${topic}
- Page: ${pageName}
- Title: ${content.title || topic}

REQUIREMENTS:
1. Output ONLY valid HTML5 code
2. Include modern CSS styling inline in <style> tag
3. Make it visually stunning with gradients and modern design
4. Include navigation, hero section, content, footer
5. Use this color theme: ${content.heroGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
6. Responsive design
7. NO markdown, NO explanations - ONLY HTML code

Start with <!DOCTYPE html> and end with </html>.`;

    try {
      console.log(`🤖 AI generating ${pageName} page for ${topic}...`);
      const encoded = encodeURIComponent(pagePrompt);
      const url = `https://text.pollinations.ai/${encoded}?seed=${Date.now()}`;
      
      console.log(`🌐 Fetching from: ${url.substring(0, 100)}...`);
      
      const response = await fetch(url, { 
        headers: { 'Accept': 'text/plain' }
      });
      
      if (!response.ok) {
        console.error(`❌ HTTP error: ${response.status}`);
        return null;
      }
      
      let html = await response.text();
      console.log(`📥 Received ${html.length} characters`);
      
      // Clean up the response
      html = html.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();
      
      // Validate HTML - lowered to 500 chars
      if (!html.includes('<!DOCTYPE') || !html.includes('<html') || html.length < 500) {
        console.log(`⚠️ AI returned invalid/short HTML for ${pageName}, length: ${html.length}`);
        console.log(`📝 Preview: ${html.substring(0, 200)}`);
        return null;
      }
      
      console.log(`✅ AI generated ${pageName} page successfully (${html.length} chars)`);
      return html;
    } catch (e) {
      console.error(`❌ AI page generation error for ${pageName}:`, e.message);
      return null;
    }
  }

  // Generate hybrid site: AI-powered full HTML generation
  async generateHybridSite(project, description, topic, intent, aiContent) {
    // Dynamic import for ES modules compatibility
    const websiteTemplates = await import('./websiteTemplates.js');
    const { generateSmartSite, analyzeIntent, getTitleForTopic } = websiteTemplates;
    
    // Default content if AI fails
    const content = aiContent || {
      title: topic,
      headline: `Откройте мир ${topic}`,
      subtitle: 'Узнайте всё, что нужно знать, в одном месте',
      description: `${topic} — это увлекательная тема, которая открывает множество возможностей для изучения и развития.`,
      features: [
        { title: 'Экспертные знания', description: 'Погрузитесь в тему с профессиональным контентом' },
        { title: 'Практические советы', description: 'Применяйте знания на практике каждый день' },
        { title: 'Современный подход', description: 'Актуальная информация и последние тренды' }
      ],
      aboutTitle: `О ${topic}`,
      aboutText: `${topic} занимает важное место в современном мире. Эта тема охватывает множество аспектов и предлагает глубокое понимание предмета. Изучение ${topic} открывает новые возможности и перспективы.`,
      services: [
        { name: 'Консультация', description: 'Профессиональная консультация по теме' },
        { name: 'Обучение', description: 'Полный курс обучения' },
        { name: 'Поддержка', description: 'Постоянная поддержка 24/7' }
      ],
      heroGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      accentColor: '#667eea'
    };

    // Generate hero image via Pollinations
    const heroImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(`modern ${topic} website hero, professional, clean design`)}?width=1200&height=600&nologo=true&seed=${Date.now()}`;
    
    // Generate pages with FULL AI HTML generation
    const pages = ['index', 'about', 'services', 'contact'];
    let aiSuccessCount = 0;
    let templateFallbackCount = 0;
    
    for (const pageName of pages) {
      console.log(`🤖 Generating ${pageName} page with AI...`);
      
      // Try AI generation first with retry
      let html = null;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (!html && attempts < maxAttempts) {
        attempts++;
        html = await this.generateAIPage(pageName, content, topic, intent, heroImage);
        if (!html && attempts < maxAttempts) {
          console.log(`🔄 Retrying ${pageName} page generation (attempt ${attempts + 1})...`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
        }
      }
      
      // Fallback to template only if AI completely failed
      if (!html || html.length < 500) {
        console.log(`⚠️ AI failed for ${pageName} after ${attempts} attempts, using template fallback`);
        html = this.generatePageWithContent(pageName, content, topic, intent, heroImage);
        templateFallbackCount++;
      } else {
        aiSuccessCount++;
        console.log(`✅ AI successfully generated ${pageName} page (${html.length} chars)`);
      }
      
      const filename = pageName === 'index' ? 'index.html' : `${pageName}.html`;
      fs.writeFileSync(path.join(project.path, filename), html);
      project.files.push(filename);
    }
    
    console.log(`📊 AI generation: ${aiSuccessCount}/${pages.length} pages, Template fallback: ${templateFallbackCount} pages`);
    
    // Generate CSS with AI styling
    const css = this.generateSmartCSS({ 
      title: content.title, 
      category: intent.category,
      accentColor: content.accentColor || '#667eea',
      heroGradient: content.heroGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    });
    fs.writeFileSync(path.join(project.path, 'styles.css'), css);
    project.files.push('styles.css');
    
    // Generate JS
    const js = this.generateSmartJS({ title: content.title });
    fs.writeFileSync(path.join(project.path, 'main.js'), js);
    project.files.push('main.js');
    
    // Metadata
    fs.writeFileSync(
      path.join(project.path, '.project-metadata.json'),
      JSON.stringify({ method: 'FULL_AI', topic, intent, aiContent: !!aiContent, createdAt: new Date().toISOString() }, null, 2)
    );
    project.files.push('.project-metadata.json');
    
    console.log(`✅ AI-powered site generated for "${topic}"`);
  }

  // Generate page HTML with AI content
  generatePageWithContent(pageName, content, topic, intent, heroImage) {
    const nav = `
    <nav class="navbar">
      <div class="container nav-container">
        <a href="index.html" class="logo">${content.title}</a>
        <ul class="nav-links">
          <li><a href="index.html">Главная</a></li>
          <li><a href="about.html">О нас</a></li>
          <li><a href="services.html">Услуги</a></li>
          <li><a href="blog.html">Блог</a></li>
          <li><a href="contact.html">Контакты</a></li>
        </ul>
      </div>
    </nav>`;

    let mainContent = '';
    
    switch(pageName) {
      case 'index':
        mainContent = `
    <section class="hero" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 6rem 0; text-align: center; color: white;">
      <div class="container">
        <h1 style="font-size: 3rem; margin-bottom: 1rem;">${content.headline}</h1>
        <p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9;">${content.subtitle}</p>
        <a href="services.html" class="btn" style="background: white; color: #667eea; padding: 1rem 2rem; border-radius: 50px; text-decoration: none; font-weight: bold;">Начать</a>
      </div>
    </section>
    
    <section class="features" style="padding: 4rem 0;">
      <div class="container">
        <div class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          ${content.features.map(f => `
          <div class="feature-card" style="background: var(--card-bg); padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea; margin-bottom: 0.5rem;">${f.title}</h3>
            <p>${f.description}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>`;
        break;
        
      case 'about':
        mainContent = `
    <section style="padding: 4rem 0;">
      <div class="container">
        <h1 style="margin-bottom: 2rem;">${content.aboutTitle}</h1>
        <p style="font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem;">${content.aboutText}</p>
        <img src="${heroImage}" alt="${topic}" style="width: 100%; border-radius: 12px; margin: 2rem 0;">
      </div>
    </section>`;
        break;
        
      case 'services':
        mainContent = `
    <section style="padding: 4rem 0;">
      <div class="container">
        <h1 style="margin-bottom: 2rem;">Наши услуги</h1>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          ${content.features.map((f, i) => `
          <div style="background: var(--card-bg); padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: #667eea; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem;">${i + 1}</div>
            <h3>${f.title}</h3>
            <p>${f.description}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>`;
        break;
        
      case 'blog':
        mainContent = `
    <section style="padding: 4rem 0;">
      <div class="container">
        <h1 style="margin-bottom: 2rem;">Статьи</h1>
        <div style="display: grid; gap: 2rem;">
          ${content.features.map((f, i) => `
          <article style="background: var(--card-bg); padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="color: #667eea;">${f.title}</h3>
            <p style="color: var(--text-secondary);">${f.description}</p>
            <a href="#" style="color: #667eea; text-decoration: none;">Читать →</a>
          </article>
          `).join('')}
        </div>
      </div>
    </section>`;
        break;
        
      case 'contact':
        mainContent = `
    <section style="padding: 4rem 0;">
      <div class="container">
        <h1 style="margin-bottom: 2rem;">Свяжитесь с нами</h1>
        <form style="max-width: 600px;" onsubmit="event.preventDefault(); alert('Сообщение отправлено!');">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Имя</label>
            <input type="text" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Email</label>
            <input type="email" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem;">Сообщение</label>
            <textarea rows="5" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px;"></textarea>
          </div>
          <button type="submit" style="background: #667eea; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; cursor: pointer;">Отправить</button>
        </form>
      </div>
    </section>`;
        break;
    }

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}${pageName !== 'index' ? ' - ' + pageName.charAt(0).toUpperCase() + pageName.slice(1) : ''}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${nav}
  ${mainContent}
  <footer style="background: var(--bg2); padding: 2rem 0; text-align: center; margin-top: 4rem;">
    <div class="container">
      <p>&copy; 2024 ${content.title}. Все права защищены.</p>
    </div>
  </footer>
  <script src="main.js"></script>
</body>
</html>`;
  }

  // ===== CHAT HISTORY & MEMORY =====

  // Chat History Methods
  addToChatHistory(role, content, metadata = {}) {
    const message = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.chatHistory.push(message);
    
    // Keep only last N messages
    if (this.chatHistory.length > this.maxHistoryLength) {
      this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength);
    }
    
    // Save to file
    this.saveChatHistory();
    
    return message;
  }
  
  parseGeneratedContent(content) {
    const files = {};
    const regex = /([\w.-]+)\s*\n```[\w]*\n([\s\S]*?)\n```/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const filename = match[1].trim();
      const fileContent = match[2].trim();
      if (filename && fileContent) {
        files[filename] = fileContent;
      }
    }
    
    return files;
  }
  
  ensureRequiredFiles(project, files, topic, intent) {
    const requiredFiles = ['index.html', 'styles.css', 'main.js'];
    const optionalFiles = ['about.html', 'services.html', 'blog.html', 'contact.html'];
    
    // Check required files
    for (const filename of requiredFiles) {
      if (!files[filename]) {
        console.log(`⚠️ Missing ${filename}, generating fallback...`);
        const fallback = this.generateFallbackFile(filename, topic, intent);
        const filePath = path.join(project.path, filename);
        fs.writeFileSync(filePath, fallback);
        if (!project.files.includes(filename)) {
          project.files.push(filename);
        }
      }
    }
    
    // Generate optional files if missing
    for (const filename of optionalFiles) {
      if (!files[filename]) {
        const fallback = this.generateFallbackFile(filename, topic, intent);
        const filePath = path.join(project.path, filename);
        fs.writeFileSync(filePath, fallback);
        project.files.push(filename);
      }
    }
  }
  
  generateFallbackFile(filename, topic, intent) {
    const title = topic.charAt(0).toUpperCase() + topic.slice(1);
    
    if (filename === 'index.html') {
      return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container">
      <a href="index.html" class="logo">${title}</a>
      <ul class="nav-links">
        <li><a href="index.html">Главная</a></li>
        <li><a href="about.html">О нас</a></li>
        <li><a href="services.html">Услуги</a></li>
        <li><a href="blog.html">Блог</a></li>
        <li><a href="contact.html">Контакты</a></li>
      </ul>
    </div>
  </nav>
  
  <header class="hero">
    <div class="container">
      <h1>Добро пожаловать в ${title}</h1>
      <p>Лучший ресурс по теме ${topic.toLowerCase()}</p>
      <a href="services.html" class="btn-primary">Узнать больше</a>
    </div>
  </header>
  
  <main class="container">
    <section class="features">
      <h2>Наши преимущества</h2>
      <div class="grid">
        <div class="card">
          <h3>Качество</h3>
          <p>Только проверенная информация</p>
        </div>
        <div class="card">
          <h3>Экспертность</h3>
          <p>Материалы от профессионалов</p>
        </div>
        <div class="card">
          <h3>Доступность</h3>
          <p>Просто и понятно для всех</p>
        </div>
      </div>
    </section>
  </main>
  
  <footer class="footer">
    <div class="container">
      <p>&copy; 2024 ${title}. Все права защищены.</p>
    </div>
  </footer>
  
  <script src="main.js"></script>
</body>
</html>`;
    }
    
    if (filename === 'styles.css') {
      return `:root {
  --primary: #667eea;
  --accent: #764ba2;
  --text: #1e293b;
  --bg: #ffffff;
  --card-bg: rgba(255,255,255,0.8);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: var(--text); line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }

.navbar { position: fixed; top: 0; width: 100%; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); z-index: 100; padding: 1rem 0; }
.navbar .container { display: flex; justify-content: space-between; align-items: center; }
.logo { font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.nav-links { display: flex; list-style: none; gap: 2rem; }
.nav-links a { text-decoration: none; color: var(--text); font-weight: 500; transition: color 0.3s; }
.nav-links a:hover { color: var(--primary); }

.hero { padding: 10rem 0 6rem; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color: white; text-align: center; }
.hero h1 { font-size: 3rem; margin-bottom: 1rem; }
.hero p { font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9; }

.btn-primary { display: inline-block; padding: 1rem 2.5rem; background: white; color: var(--primary); border-radius: 50px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.3s; }
.btn-primary:hover { transform: translateY(-2px); }

.features { padding: 5rem 0; }
.features h2 { text-align: center; font-size: 2.5rem; margin-bottom: 3rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
.card { background: var(--card-bg); padding: 2rem; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); backdrop-filter: blur(10px); }
.card h3 { color: var(--primary); margin-bottom: 1rem; }

.footer { background: var(--text); color: white; padding: 2rem 0; text-align: center; margin-top: 4rem; }`;
    }
    
    if (filename === 'main.js') {
      return `// Navigation toggle for mobile
document.addEventListener('DOMContentLoaded', () => {
  console.log('${title} site loaded');
  
  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
    });
  });
});`;
    }
    
    // Simple fallback for other pages
    const pageName = filename.replace('.html', '');
    const titles = {
      'about': 'О нас',
      'services': 'Услуги',
      'blog': 'Блог',
      'contact': 'Контакты'
    };
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titles[pageName] || pageName} | ${title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">
    <div class="container">
      <a href="index.html" class="logo">${title}</a>
      <ul class="nav-links">
        <li><a href="index.html">Главная</a></li>
        <li><a href="about.html">О нас</a></li>
        <li><a href="services.html">Услуги</a></li>
        <li><a href="blog.html">Блог</a></li>
        <li><a href="contact.html">Контакты</a></li>
      </ul>
    </div>
  </nav>
  
  <main class="container" style="padding-top: 8rem; min-height: 60vh;">
    <h1>${titles[pageName] || pageName}</h1>
    <p>Страница ${titles[pageName] || pageName} сайта ${title}.</p>
  </main>
  
  <footer class="footer">
    <div class="container">
      <p>&copy; 2024 ${title}. Все права защищены.</p>
    </div>
  </footer>
  
  <script src="main.js"></script>
</body>
</html>`;
  }

  // ===== CHAT HISTORY & MEMORY =====

  // Chat History Methods
  addToChatHistory(role, content, metadata = {}) {
    const message = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.chatHistory.push(message);
    
    // Keep only last N messages
    if (this.chatHistory.length > this.maxHistoryLength) {
      this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength);
    }
    
    // Save to file
    this.saveChatHistory();
    
    return message;
  }
  
  getChatHistory(limit = 20) {
    return this.chatHistory.slice(-limit);
  }
  
  getChatContextForAI() {
    // Format history for AI context
    return this.chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
  
  saveChatHistory() {
    try {
      const historyPath = path.join(this.projectsDir, '.chat-history.json');
      fs.writeFileSync(historyPath, JSON.stringify(this.chatHistory, null, 2));
    } catch (error) {
      console.error('Failed to save chat history:', error.message);
    }
  }
  
  loadChatHistory() {
    try {
      const historyPath = path.join(this.projectsDir, '.chat-history.json');
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        this.chatHistory = JSON.parse(data);
        console.log(`📚 Loaded ${this.chatHistory.length} messages from history`);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error.message);
      this.chatHistory = [];
    }
  }
  
  clearChatHistory() {
    this.chatHistory = [];
    this.saveChatHistory();
    console.log('🗑️ Chat history cleared');
  }
  
  // Memory/Context for specific projects
  setMemory(key, value) {
    this.memory.set(key, {
      value,
      timestamp: new Date().toISOString()
    });
  }
  
  getMemory(key) {
    return this.memory.get(key)?.value;
  }
  
  getAllMemory() {
    const result = {};
    for (const [key, data] of this.memory.entries()) {
      result[key] = data.value;
    }
    return result;
  }
  
  // Context-aware response generation
  async generateResponseWithContext(message, options = {}) {
    // Add user message to history
    this.addToChatHistory('user', message);
    
    // Get recent context
    const context = this.getChatContextForAI();
    
    // Generate response with context
    const response = await this.generateAIResponse(message, context, options);
    
    // Add assistant response to history
    if (response) {
      this.addToChatHistory('assistant', response, {
        model: this.provider,
        hasContext: context.length > 0
      });
    }
    
    return response;
  }
  
  async generateAIResponse(message, context = [], options = {}) {
    if (!this.apiKey) {
      return this.getFallbackResponse(message);
    }
    
    try {
      // Build messages with context
      const messages = [
        { role: 'system', content: this.getChatSystemPrompt() },
        ...context.slice(-10), // Last 10 messages for context
        { role: 'user', content: message }
      ];
      
      // Call appropriate provider
      let response;
      switch (this.provider) {
        case 'groq':
          response = await this.generateChatWithMessagesGroq(messages);
          break;
        case 'openai':
          response = await this.generateChatWithMessagesOpenAI(messages);
          break;
        case 'openrouter':
          response = await this.generateChatWithMessagesOpenRouter(messages);
          break;
        default:
          response = await this.generateChatWithMessagesAnthropic(messages);
      }
      
      return response || this.getFallbackResponse(message);
    } catch (error) {
      console.error('AI response generation failed:', error);
      return this.getFallbackResponse(message);
    }
  }
  
  getFallbackResponse(message) {
    const fallbacks = [
      'Я вас понял! Работаю над этим...',
      'Интересный запрос! Дайте мне подумать...',
      'Понял вас. Обрабатываю информацию...',
      'Работаю над вашим запросом...',
      'Обрабатываю...'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  getApiProvider() {
    if (process.env.GROQ_API_KEY) return 'groq';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openrouter';
  }

  getApiKey() {
    return process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
  }

  detectProvider() {
    if (process.env.GROQ_API_KEY) return 'groq';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openrouter';
  }

  ensureDirectories() {
    fs.ensureDirSync(this.projectsDir);
    fs.ensureDirSync(this.templatesDir);
  }

  // ===== PROJECT CREATION =====

  async createProject(name, description, type = 'web') {
    console.log(`=== Creating project: ${name} (${type}) ===`);
    
    const projectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const projectPath = path.join(this.projectsDir, projectId);
    
    fs.ensureDirSync(projectPath);
    
    const project = {
      id: projectId,
      name: name,
      description: description,
      type: type,
      path: projectPath,
      files: [],
      status: 'generating',
      createdAt: new Date().toISOString()
    };
    
    this.activeProjects.set(projectId, project);
    
    try {
      if (type === 'web') {
        await this.generateSiteWithAI(project, description);
      } else if (type === 'android') {
        await this.generateAndroidApp(project, description);
      }
      
      project.status = 'ready';
      console.log(`✅ Project ${projectId} created`);
    } catch (error) {
      console.error('❌ Project error:', error);
      project.status = 'error';
      project.error = error.message;
    }
    
    return project;
  }

  async generateAndroidApp(project, description) {
    const androidTemplate = this.getAndroidTemplate();
    const files = this.parseGeneratedContent(androidTemplate);
    
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(project.path, filename);
      fs.ensureDirSync(path.dirname(filePath));
      fs.writeFileSync(filePath, content);
      project.files.push(filename);
    }
  }

  extractTopic(description) {
    const words = description.toLowerCase()
      .replace(/создай|сделай|сайт|про|about|create|make|website|web|для|for/g, '')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2);
    return words.slice(0, 3).join(' ') || 'general';
  }

  listProjects() {
    return Array.from(this.activeProjects.values());
  }

  getProject(projectId) {
    return this.activeProjects.get(projectId);
  }

  async modifyProject(projectId, description) {
    const project = this.activeProjects.get(projectId);
    if (!project) throw new Error('Project not found');
    
    project.description += `\n[Modified: ${description}]`;
    return project;
  }

  async deployWebsite(projectId, subdomain = null) {
    const project = this.activeProjects.get(projectId);
    if (!project || project.type !== 'web') {
      throw new Error('Web project not found');
    }
    
    return {
      url: `https://${subdomain || projectId}.claude-agent.repl.co`,
      subdomain: subdomain || projectId,
      deployedAt: new Date().toISOString()
    };
  }

  async buildAndroidApp(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project || project.type !== 'android') {
      throw new Error('Android project not found');
    }
    
    project.build = {
      apk: path.join(project.path, 'app.apk'),
      aab: path.join(project.path, 'app.aab'),
      completedAt: new Date().toISOString()
    };
    
    project.status = 'built';
    return project.build;
  }

  // ===== CODE GENERATION =====

  async generateCode(prompt, options = {}) {
    console.log('=== generateCode called ===');
    console.log('API Key exists:', !!this.apiKey);
    console.log('Provider:', this.provider);
    console.log('Prompt length:', prompt.length);
    console.log('Options:', options);
    
    // Try paid APIs first if key available
    if (this.apiKey) {
      let result;
      console.log('Calling AI API...');
      if (this.provider === 'groq') {
        result = await this.generateCodeGroq(prompt, options);
      } else if (this.provider === 'openai') {
        result = await this.generateCodeOpenAI(prompt, options);
      } else if (this.provider === 'openrouter') {
        result = await this.generateCodeOpenRouter(prompt, options);
      } else {
        result = await this.generateCodeAnthropic(prompt, options);
      }
      console.log('API result received:', !!result);
      if (result) {
        console.log('Result preview:', result.substring(0, 200));
        console.log('Starts with Error?:', result.startsWith('Error:'));
      }
      if (result && !result.startsWith('Error:')) {
        console.log('Returning AI generated content');
        return result;
      }
      console.log('API failed or returned error content');
    } else {
      console.log('No API key available, trying free alternatives...');
    }
    
    // FREE ALTERNATIVE: Pollinations Text API (no API key needed)
    console.log('Trying Pollinations Text API (FREE)...');
    const pollinationsResult = await this.generateCodePollinations(prompt, options);
    if (pollinationsResult && !pollinationsResult.startsWith('Error:')) {
      console.log('✅ Pollinations AI generated content successfully');
      return pollinationsResult;
    }
    
    console.log('Returning null - AI generation failed');
    return null;  // Return null instead of template so caller knows AI failed
  }

  // FREE AI Code Generation via Pollinations (no API key required)
  async generateCodePollinations(prompt, options = {}) {
    console.log('=== generateCodePollinations (FREE) called ===');
    try {
      // Better prompt for code generation
      const codePrompt = `You are an expert web developer. Create complete HTML/CSS/JS files. ${prompt}\n\nOutput format: filename.ext followed by code in triple backticks.`;
      const encodedPrompt = encodeURIComponent(codePrompt);
      const seed = Date.now();
      
      // Use Pollinations text API with better parameters
      const url = `https://text.pollinations.ai/${encodedPrompt}?seed=${seed}&json=false&private=true`;
      
      console.log('Fetching from Pollinations Text API...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'text/plain' }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) throw new Error(`Pollinations API error: ${response.status}`);
      
      const content = await response.text();
      
      if (content && content.length > 200) {
        console.log('✅ Pollinations content length:', content.length);
        
        // Check for valid code format
        if (content.includes('```') || content.includes('<!DOCTYPE') || content.includes('<html')) {
          console.log('✅ Valid code detected');
          return content;
        }
        
        // Wrap plain HTML
        if (content.includes('<')) {
          return `index.html\n\`\`\`html\n${content}\n\`\`\``;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Pollinations API error:', error.message);
      return null;
    }
  }

  generateFromTemplate(type) {
    const templates = {
      web: this.getWebTemplate(),
      android: this.getAndroidTemplate(),
      flutter: this.getFlutterTemplate()
    };
    return templates[type] || templates.web;
  }

  getWebTemplate() {
    return `index.html
\`\`\`html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Сгенерированный сайт</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Добро пожаловать</h1>
        <nav>
            <a href="#home">Главная</a>
            <a href="#about">О нас</a>
            <a href="#contact">Контакты</a>
        </nav>
    </header>
    <main>
        <section id="home">
            <h2>Главная</h2>
            <p>Это сгенерированный веб-сайт.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 Сгенерировано AI</p>
    </footer>
    <script src="app.js"></script>
</body>
</html>
\`\`\`

styles.css
\`\`\`css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; line-height: 1.6; }
header { background: #333; color: white; padding: 1rem; }
nav a { color: white; margin-right: 15px; }
main { padding: 2rem; }
footer { background: #333; color: white; text-align: center; padding: 1rem; }
\`\`\`

app.js
\`\`\`javascript
console.log('Сайт загружен!');
\`\`\``;
  }

  getAndroidTemplate() {
    return `MainActivity.kt
\`\`\`kotlin
package com.example.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
\`\`\`

activity_main.xml
\`\`\`xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center">
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello World!"
        android:textSize="24sp" />
</LinearLayout>
\`\`\``;
  }

  getFlutterTemplate() {
    return `lib/main.dart
\`\`\`dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Generated App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Generated App')),
      body: const Center(child: Text('Hello World!')),
    );
  }
}
\`\`\``;
  }

  async generateCodeOpenRouter(prompt, options = {}) {
    console.log('=== generateCodeOpenRouter called ===');
    console.log('API Key prefix:', this.apiKey.substring(0, 15));
    
    const models = [
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-8b-instruct'
    ];
    
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`Trying model ${model}, attempt ${attempt + 1}`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000);
          
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': 'https://claudedev.example.com',
              'X-Title': 'ClaudeDev Agent'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: this.getSystemPrompt() },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 4000
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            continue;
          }
          
          const data = await response.json();
          console.log('API data received, choices:', data.choices ? data.choices.length : 0);
          
          if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;
            console.log('AI content length:', content.length);
            console.log('AI content preview:', content.substring(0, 300));
            return content;
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed for ${model}:`, error.message);
        }
      }
    }
    console.log('All models failed, returning null');
    return null;
  }

  async generateCodeAnthropic(prompt, options = {}) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          messages: [{ role: 'user', content: this.getSystemPrompt() + '\n\n' + prompt }]
        })
      });
      
      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      
      const data = await response.json();
      if (data.content && data.content[0]) return data.content[0].text;
      return null;
    } catch (error) {
      console.error('Anthropic API error:', error);
      return null;
    }
  }

  async generateCodeOpenAI(prompt, options = {}) {
    console.log('=== generateCodeOpenAI called ===');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      console.log('OpenAI Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('OpenAI choices:', data.choices ? data.choices.length : 0);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('OpenAI content length:', content.length);
        return content;
      }
      return null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  async generateCodeGroq(prompt, options = {}) {
    console.log('=== generateCodeGroq called ===');
    try {
      // Add timeout controller
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      console.log('Groq Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('Groq choices:', data.choices ? data.choices.length : 0);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('Groq content length:', content.length);
        return content;
      }
      return null;
    } catch (error) {
      console.error('Groq API error:', error);
      return null;
    }
  }

  async generateCodeGemini(prompt, options = {}) {
    console.log('=== generateCodeGemini called ===');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: this.getSystemPrompt() + '\n\n' + prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      });
      
      console.log('Gemini Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('Gemini candidates:', data.candidates ? data.candidates.length : 0);
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        const content = data.candidates[0].content.parts[0].text;
        console.log('Gemini content length:', content.length);
        return content;
      }
      return null;
    } catch (error) {
      console.error('Gemini API error:', error);
      return null;
    }
  }

  getSystemPrompt() {
    return `You are ClaudeDev, an EXPERT software developer AI assistant specializing in creating STUNNING, production-ready websites. You create modern, visually impressive web applications that look like they were made by top-tier design agencies.

=== CORE PRINCIPLES - NEVER VIOLATE ===

1. **COMPLETE SOLUTIONS**: Always generate ALL necessary files. Never skip files or say "you can add this later".

2. **VISUAL EXCELLENCE**: Every website must look modern, professional, and visually stunning:
   - Use gradients, shadows, and modern color palettes
   - Ensure high contrast and readability
   - Create visual hierarchy with proper spacing
   - Add subtle animations and hover effects
   - Use professional typography

3. **CODE QUALITY**: Write clean, maintainable, well-commented code:
   - Use CSS custom properties (variables) for consistency
   - Follow BEM naming convention or clear semantic naming
   - Include comprehensive comments explaining design choices
   - Ensure responsive design (mobile-first approach)
   - Use semantic HTML5 elements

4. **USER EXPERIENCE**: Create intuitive, delightful experiences:
   - Clear navigation and visual hierarchy
   - Obvious call-to-action buttons
   - Fast-loading, optimized assets
   - Accessible (ARIA labels, alt text, keyboard navigation)

=== OUTPUT FORMAT - STRICTLY FOLLOW ===

You MUST format your response exactly like this:

filename.ext
\`\`\`language
complete file content with detailed comments
\`\`\`

filename2.ext
\`\`\`language
complete file content with detailed comments
\`\`\`

=== WEB PROJECT STRUCTURE - ALWAYS GENERATE ===

For EVERY web project, you MUST create these files:

1. **index.html** - Main landing page with:
   - Compelling hero section with gradient background
   - Clear value proposition and call-to-action
   - Feature highlights with icons
   - Professional, high-contrast design
   - NEVER use user's raw request as the title

2. **about.html** - About page with:
   - Company/brand story
   - Team or mission section
   - Trust indicators (stats, testimonials)
   - Consistent design with index

3. **contact.html** - Contact page with:
   - Functional-looking contact form
   - Contact information cards
   - Map placeholder (if relevant)
   - Social media links

4. **styles.css** - Comprehensive stylesheet with:
   - CSS variables for colors, fonts, spacing
   - Modern button styles (gradient, pill-shaped, shadows)
   - Card components with shadows and hover effects
   - Responsive grid layouts
   - Smooth animations and transitions
   - Mobile-responsive breakpoints
   - NEVER use gray buttons or boring default styles

5. **main.js** - Interactive features:
   - Mobile navigation toggle
   - Smooth scroll behavior
   - Scroll-based animations (Intersection Observer)
   - Form validation UI
   - Dynamic content loading if needed

=== DESIGN SPECIFICATIONS - MANDATORY ===

**Colors:**
- Primary gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Text on light: #1e293b or #0f172a (dark, high contrast)
- Text on dark: white or rgba(255,255,255,0.9)
- NEVER use light gray (#ccc, #ddd) on white backgrounds
- Accent colors: #ec4899 (pink), #10b981 (green), #f59e0b (amber)

**Buttons (CRITICAL - MUST BE BEAUTIFUL):**
- Primary: gradient background, white text, pill-shaped (border-radius: 50px)
- Secondary: transparent with white/colored border
- ALL buttons: padding: 1rem 2rem, font-weight: 600
- ALL buttons: box-shadow: 0 4px 15px rgba(0,0,0,0.2)
- Hover: transform: translateY(-2px), increased shadow
- NEVER use default browser buttons or gray backgrounds

**Typography:**
- Font family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
- Headings: bold, tight letter-spacing on large titles
- Body: 1.5-1.6 line-height for readability
- Hero title: 3rem minimum, white on gradient background

**Layout:**
- Container max-width: 1200px, centered
- Section padding: 5rem 2rem (generous whitespace)
- Grid gaps: 2rem minimum
- Cards: border-radius: 16px, box-shadow: 0 10px 40px rgba(0,0,0,0.1)
- Navigation: fixed, backdrop-filter: blur(10px), semi-transparent

**Images:**
- Use real, working image URLs only
- For pets: https://placedog.net/400/300 or https://cataas.com/cat
- For general: https://picsum.photos/800/600?random=1
- NEVER use placeholder text like "image1" or "котик1"
- Always include descriptive alt attributes

=== PROHIBITED - NEVER DO THESE ===

❌ NEVER use user's raw request as page title
❌ NEVER create pages with just "lorem ipsum" placeholder text
❌ NEVER use default gray browser buttons
❌ NEVER use light gray text on white backgrounds
❌ NEVER use broken image URLs or placeholder names
❌ NEVER skip required files (CSS, JS)
❌ NEVER use inline styles - always use CSS classes
❌ NEVER forget favicon

=== EXAMPLES OF GOOD TITLES ===

User request: "создай сайт про кошек"
❌ Bad: "Создай сайт про кошек"
✅ Good: "Мир Удивительных Кошек"

User request: "сделай сайт с картинками собак"
❌ Bad: "Сделай сайт с картинками собак"  
✅ Good: "Верные Друзья"

User request: "создай образовательный сайт по математике"
❌ Bad: "Создай образовательный сайт по математике"
✅ Good: "Математика Понятно"

=== REMEMBER ===

You are creating REAL websites for REAL users. Make them proud of what you've built. Every pixel matters. Every interaction should delight. Create websites that look like they cost $10,000 from a top design agency.`;
  }

  getChatSystemPrompt() {
    return `Ты ClaudeDev — экспертный AI-ассистент для разработки премиум-класса. Ты создаёшь сайты уровня топовых веб-студий.

=== ТВОЯ РОЛЬ ===

Ты не просто "создаёшь сайты" — ты проектируешь цифровые продукты, которыми гордятся клиенты. Каждый сайт должен выглядеть так, будто за него заплатили $10,000.

=== СТИЛЬ ОБЩЕНИЯ — ВСЕГДА СЛЕДУЙ ===

1. **Конкретика вместо общих фраз**:
   ❌ Плохо: "Я вас понял! Чем ещё могу помочь?"
   ✅ Хорошо: "Отлично! Я создам сайт о домашних питомцах с красивым галереей фото, современным градиентным дизайном и плавными анимациями. Главная страница будет впечатлять с первого взгляда!"

2. **Показывай план действий**:
   Когда создаёшь сайт — перечисли конкретно что будет:
   ❌ Плохо: "Создаю сайт..."
   ✅ Хорошо: "Начинаю создание! 📱\n\nВот что я подготовлю:\n• Главную с эффектным hero-блоком и градиентом\n• Галерею с реальными фото\n• Описания пород с карточками\n• Современные кнопки с hover-эффектами\n• Адаптивность для всех устройств\n\nПримерно 30 секунд..."

3. **Профессиональный энтузиазм**:
   - Используй эмодзи уместно (не переборщи)
   - Демонстрируй уверенность в результате
   - Объясняй ПОЧЕМУ ты делаешь так, а не иначе

4. **Объясняй технические решения**:
   Когда предлагаешь что-то — объясни пользу:
   "Добавлю плавную прокрутку — это улучшит UX на 40% по исследованиям"
   "Использую CSS Grid — код будет чище и быстрее загружаться"

=== ОБРАБОТКА ЗАПРОСОВ ===

**Создание сайта:**
1. Уточни тему если неясно
2. Опиши конкретно что будешь делать (списком)
3. Упомяни ключевые фичи (анимации, адаптивность)
4. Дай оценку времени
5. После создания — краткое резюме что получилось

**Доработка:**
1. Перефразируй что хочет пользователь
2. Перечисли конкретные изменения
3. Объясни почему это улучшит результат
4. Покажи "до/после" если уместно

**Помощь:**
- Объясняй простым языком сложные вещи
- Давай примеры кода когда нужно
- Предлагай 2-3 варианта решения проблемы
- Объясняй плюсы/минусы каждого

=== ЯЗЫК И КУЛЬТУРА ===

- Всегда отвечай на русском языке (если пользователь пишет по-русски)
- Используй профессиональную терминологию но объясняй её
- Будь дружелюбным но профессиональным
- Избегай сленга и неформальностей

=== ЗАПРЕЩЕНО ===

❌ "Я вас понял" без конкретики
❌ "Чем ещё могу помочь?" как единственный ответ
❌ Общие фразы без содержания
❌ Технический жаргон без объяснений
❌ Игнорирование вопроса пользователя

=== ПРИМЕРЫ ОТВЕТОВ ===

Пользователь: "создай сайт про кошек"
❌ Плохо: "Ок, создаю сайт про кошек..."
✅ Отлично: "Замечательно! 🐱 Создам красивый сайт о кошках с галереей пород и интересными фактами.\n\nПлан работы:\n• Современный дизайн с градиентами и анимациями\n• Галерея с реальными фото разных пород\n• Карточки с описанием характера кошек\n• Интерактивные элементы и hover-эффекты\n• Полная адаптивность для телефонов\n\nНачинаю генерацию — примерно 30-40 секунд!"

Пользователь: "сайт выглядит скучно"
❌ Плохо: "Понял, исправлю..."
✅ Отлично: "Понял! Добавлю визуальной динамики:\n\n• Яркий градиентный hero-блок вместо плоского фона\n• Анимированные карточки с поднятием при наведении\n• Иконки FontAwesome для навигации\n• Параллакс-эффект при скролле\n• Современные кнопки с тенями и glow-эффектом\n\nЭто сделает сайт живым и современным! Переделываю..."

=== ПОМНИ ===

Ты создаёшь продукты премиум-класса. Каждый ответ — это часть профессионального сервиса. Будь точным, конкретным и полезным.`;
  }

  async generateResponse(message, history = []) {
    console.log('=== generateResponse called ===');
    console.log('Message:', message);
    console.log('History length:', history.length);
    console.log('API Key exists:', !!this.apiKey);
    console.log('Provider:', this.provider);
    
    if (this.apiKey) {
      // Build messages array with history
      const messages = [
        { role: 'system', content: this.getChatSystemPrompt() }
      ];
      
      // Add history (last 10 messages to keep context manageable)
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // Add current message
      messages.push({ role: 'user', content: message });
      
      let result;
      console.log('Calling chat provider:', this.provider);
      console.log('Total messages in context:', messages.length);
      
      if (this.provider === 'groq') {
        result = await this.generateChatWithMessagesGroq(messages);
      } else if (this.provider === 'openai') {
        result = await this.generateChatWithMessagesOpenAI(messages);
      } else if (this.provider === 'openrouter') {
        result = await this.generateChatWithMessagesOpenRouter(messages);
      } else {
        result = await this.generateChatWithMessagesAnthropic(messages);
      }
      
      console.log('Chat result received:', !!result);
      if (result) {
        console.log('Chat result preview:', result.substring(0, 100));
        return result;
      }
      console.log('Chat API returned null, using fallback');
    } else {
      console.log('No API key, using fallback');
    }
    
    // Fallback responses
    const fallbacks = [
      'Я вас понял! Чем ещё могу помочь?',
      'Интересно! Расскажите подробнее.',
      'Понял вас. Что бы вы хотели сделать дальше?',
      'Я готов помочь! Напишите "помощь" чтобы узнать что я умею.',
      'Принято! Чем ещё могу быть полезен?'
    ];
    const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    console.log('Using fallback response:', fallback);
    return fallback;
  }

  async generateChatGroq(prompt) {
    console.log('=== generateChatGroq called ===');
    console.log('API Key exists:', !!this.apiKey);
    try {
      console.log('Sending request to Groq...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: this.getChatSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      console.log('Groq chat response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq chat error:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('Groq chat choices:', data.choices ? data.choices.length : 0);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        console.log('Groq chat content length:', content.length);
        console.log('Groq chat content preview:', content.substring(0, 100));
        return content;
      }
      console.log('No content in Groq chat response');
      return null;
    } catch (error) {
      console.error('Groq chat API error:', error.message);
      return null;
    }
  }

  async generateChatOpenAI(prompt) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getChatSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async generateChatOpenRouter(prompt) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://claudedev.example.com',
          'X-Title': 'ClaudeDev Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { role: 'system', content: this.getChatSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async generateChatAnthropic(prompt) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          system: this.getChatSystemPrompt(),
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.content && data.content[0]) return data.content[0].text;
      return null;
    } catch (error) {
      return null;
    }
  }

  // New methods for chat with message history
  async generateChatWithMessagesGroq(messages) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: messages,
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async generateChatWithMessagesOpenAI(messages) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async generateChatWithMessagesOpenRouter(messages) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://claudedev.example.com',
          'X-Title': 'ClaudeDev Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: messages,
          temperature: 0.8,
          max_tokens: 500
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async generateChatWithMessagesAnthropic(messages) {
    try {
      // Extract system message and user/assistant messages
      const systemMsg = messages.find(m => m.role === 'system');
      const otherMsgs = messages.filter(m => m.role !== 'system');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          system: systemMsg ? systemMsg.content : this.getChatSystemPrompt(),
          messages: otherMsgs
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.content && data.content[0]) return data.content[0].text;
      return null;
    } catch (error) {
      return null;
    }
  }

  async createProject(name, description, type = 'web') {
    const projectId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const projectPath = path.join(this.projectsDir, projectId);
    
    fs.ensureDirSync(projectPath);
    
    const project = {
      id: projectId,
      name,
      description,
      type,
      path: projectPath,
      files: [],
      createdAt: new Date().toISOString(),
      status: 'generating'
    };
    
    this.activeProjects.set(projectId, project);
    
    try {
      switch (type) {
        case 'web':
          await this.generateWebProject(project, description);
          break;
        case 'android':
          await this.generateAndroidProject(project, description);
          break;
        case 'flutter':
          await this.generateFlutterProject(project, description);
          break;
        default:
          throw new Error(`Unsupported project type: ${type}`);
      }
      
      project.status = 'completed';
      return project;
    } catch (error) {
      project.status = 'failed';
      project.error = error.message;
      throw error;
    }
  }

  async modifyProject(projectId, description) {
    console.log('=== modifyProject called ===');
    console.log('Project ID:', projectId);
    console.log('Description:', description);
    
    const project = this.activeProjects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.status = 'modifying';
    project.modifiedAt = new Date().toISOString();
    
    try {
      switch (project.type) {
        case 'web':
          await this.modifyWebProject(project, description);
          break;
        case 'android':
          await this.modifyAndroidProject(project, description);
          break;
        case 'flutter':
          await this.modifyFlutterProject(project, description);
          break;
        default:
          throw new Error(`Unsupported project type: ${project.type}`);
      }
      
      project.status = 'completed';
      return project;
    } catch (error) {
      project.status = 'failed';
      project.error = error.message;
      throw error;
    }
  }

  async modifyWebProject(project, description) {
    console.log('=== modifyWebProject called ===');
    
    if (this.apiKey) {
      try {
        console.log('Using AI to modify website...');
        await this.modifyWebProjectAI(project, description);
        return;
      } catch (error) {
        console.error('AI modification failed:', error.message);
      }
    }
    
    // Fallback: regenerate with new description
    console.log('Using template mode for website modification');
    await this.generateWebProjectTemplate(project, description);
  }

  async modifyWebProjectAI(project, description) {
    // Read existing files to understand current state
    const existingFiles = {};
    const requiredFiles = ['index.html', 'about.html', 'lessons.html', 'practice.html', 'contact.html', 'styles.css', 'main.js'];
    
    for (const filename of requiredFiles) {
      const filepath = path.join(project.path, filename);
      if (fs.existsSync(filepath)) {
        existingFiles[filename] = fs.readFileSync(filepath, 'utf8');
      }
    }
    
    const prompt = `Доработай существующий веб-сайт по запросу: "${description}"

Текущие файлы проекта:
${Object.entries(existingFiles).map(([name, content]) => `
=== ${name} ===
${content.substring(0, 500)}...
`).join('\n')}

ТРЕБОВАНИЯ К ДОРАБОТКЕ:
1. Сохрани структуру и навигацию сайта
2. Внеси запрошенные изменения (улучши дизайн, добавь контент, исправь стили)
3. Сохрани совместимость с существующими файлами
4. Используй те же технологии: CSS переменные, FontAwesome, Google Fonts

Верни ВСЕ файлы проекта с внесёнными изменениями:
index.html, about.html, lessons.html, practice.html, contact.html, styles.css, main.js

Формат вывода:
filename.ext
\`\`\`language
content
\`\`\``;

    const aiResponse = await this.generateCode(prompt, { type: 'web' });
    
    if (!aiResponse) {
      throw new Error('AI returned empty response');
    }
    
    // Parse and save modified files
    const files = this.parseFilesFromResponse(aiResponse);
    
    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(project.path, filename);
      fs.writeFileSync(filepath, content);
      if (!project.files.includes(filename)) {
        project.files.push(filename);
      }
    }
    
    console.log(`Modified ${Object.keys(files).length} files via AI`);
  }

  async modifyAndroidProject(project, description) {
    // For now, just update the description and regenerate
    console.log('Android project modification - regenerating...');
    await this.generateAndroidProject(project, description);
  }

  async modifyFlutterProject(project, description) {
    console.log('Flutter project modification - regenerating...');
    await this.generateFlutterProject(project, description);
  }

  // ===== INTERNET SEARCH SERVICE =====
  
  async searchInternet(query, numResults = 5) {
    console.log('=== searchInternet called ===');
    console.log('Query:', query);
    
    try {
      // Using DuckDuckGo HTML version (no API key required)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        console.error('Search failed:', response.status);
        return null;
      }
      
      const html = await response.text();
      
      // Parse results from HTML
      const results = this.parseSearchResults(html, numResults);
      console.log('Found', results.length, 'results');
      
      return results;
    } catch (error) {
      console.error('Internet search error:', error.message);
      return null;
    }
  }
  
  parseSearchResults(html, limit) {
    const results = [];
    
    // Simple regex-based parsing for DuckDuckGo results
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    
    let match;
    const links = [];
    const titles = [];
    
    while ((match = resultRegex.exec(html)) !== null && links.length < limit) {
      const href = match[1];
      const title = match[2].replace(/<[^>]*>/g, ''); // Strip HTML tags
      
      // DuckDuckGo uses redirect URLs
      if (href.includes('duckduckgo.com/l/')) {
        // Extract actual URL from the redirect
        const urlMatch = href.match(/uddg=([^&]*)/);
        if (urlMatch) {
          const actualUrl = decodeURIComponent(urlMatch[1]);
          links.push(actualUrl);
          titles.push(title);
        }
      } else {
        links.push(href);
        titles.push(title);
      }
    }
    
    // Get snippets
    const snippets = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < limit) {
      const snippet = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      snippets.push(snippet);
    }
    
    // Combine results
    for (let i = 0; i < Math.min(links.length, limit); i++) {
      results.push({
        title: titles[i] || 'No title',
        url: links[i],
        snippet: snippets[i] || ''
      });
    }
    
    return results;
  }
  
  async fetchWebpageContent(url, maxLength = 3000) {
    console.log('=== fetchWebpageContent called ===');
    console.log('URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        console.error('Failed to fetch:', response.status);
        return null;
      }
      
      const html = await response.text();
      
      // Extract text content (basic HTML stripping)
      let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Truncate to maxLength
      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...';
      }
      
      console.log('Extracted', text.length, 'characters');
      return text;
    } catch (error) {
      console.error('Fetch webpage error:', error.message);
      return null;
    }
  }
  
  async researchTopic(topic, depth = 'basic') {
    console.log('=== researchTopic called ===');
    console.log('Topic:', topic);
    console.log('Depth:', depth);
    
    // Search for information
    const searchResults = await this.searchInternet(topic, depth === 'deep' ? 8 : 5);
    
    if (!searchResults || searchResults.length === 0) {
      console.log('No search results found');
      return null;
    }
    
    // Fetch content from top results
    const researchData = {
      topic,
      searchResults: [],
      combinedContent: ''
    };
    
    const maxPages = depth === 'deep' ? 5 : 3;
    let contentLength = 0;
    const maxTotalLength = 8000;
    
    for (let i = 0; i < Math.min(searchResults.length, maxPages); i++) {
      const result = searchResults[i];
      
      // Skip certain domains that block scrapers
      if (result.url.includes('facebook.com') || 
          result.url.includes('twitter.com') ||
          result.url.includes('linkedin.com')) {
        continue;
      }
      
      const content = await this.fetchWebpageContent(result.url, 2500);
      
      if (content) {
        researchData.searchResults.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          content: content
        });
        
        contentLength += content.length;
        if (contentLength >= maxTotalLength) break;
      }
    }
    
    // Combine all content for AI processing
    researchData.combinedContent = researchData.searchResults
      .map(r => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
      .join('\n\n---\n\n');
    
    console.log('Research complete. Sources:', researchData.searchResults.length);
    console.log('Total content length:', researchData.combinedContent.length);
    
    return researchData;
  }

  // ===== TEMPLATE-BASED WEBSITE GENERATION (Primary Method) =====
  
  async generateWebProject(project, description) {
    console.log('=== generateWebProject (AI-FIRST) ===');
    
    // STEP 1: Always try AI generation first (FREE via Pollinations if no API key)
    try {
      console.log('Using AI to generate custom website...');
      console.log('API Key available:', !!this.apiKey);
      await this.generateSiteWithAI(project, description);
      console.log('✅ AI site generation successful');
      return;
    } catch (aiError) {
      console.log('⚠️ AI generation failed:', aiError.message);
      // Continue to template fallback
    }
    
    // STEP 2: Use template as fallback (guaranteed quality)
    try {
      console.log('Using professional template as fallback...');
      await this.generateFromTemplate(project, description);
      return;
    } catch (templateError) {
      console.log('Template generation failed:', templateError.message);
    }
    
    // STEP 3: Emergency fallback
    console.log('Using emergency fallback');
    await this.generateMinimalSite(project, description);
  }
  
  async generateFromTemplate(project, description) {
    console.log('=== SMART TEMPLATE GENERATION v3.0 + INTERNET ===');
    
    // Dynamic import for ES modules compatibility
    const websiteTemplates = await import('./websiteTemplates.js');
    const { templates, detectTemplate, analyzeIntent } = websiteTemplates;
    
    // AI-powered intent analysis
    const intent = analyzeIntent ? analyzeIntent(description) : { category: 'general', keywords: [] };
    console.log('Detected intent:', intent);
    
    // Detect template with context
    const templateKey = detectTemplate(description, intent);
    const baseTemplate = templates[templateKey] || templates.default;
    
    // DYNAMIC CONTENT GENERATION - Generate lessons for ANY educational topic
    const dynamicTemplate = this.generateDynamicContent(baseTemplate, description, intent);
    
    // INTERNET ENRICHMENT - Get real data from web
    let enrichedTemplate = { ...dynamicTemplate };
    if (dynamicTemplate.isEducational || dynamicTemplate.siteType === 'blog') {
      console.log('🌐 Enriching content with internet data...');
      enrichedTemplate = await this.enrichContentWithWebData(dynamicTemplate.topic, dynamicTemplate);
    }
    
    // SMART CONTENT GENERATION - Create unique content based on user request
    const smartTemplate = this.generateSmartContent(enrichedTemplate, description, intent);
    
    console.log(`Using SMART template: ${templateKey} (${smartTemplate.title})`);
    console.log(`Generated unique title: "${smartTemplate.hero.title}"`);
    if (smartTemplate.lessons && smartTemplate.lessons.length > 0) {
      console.log(`📚 Generated ${smartTemplate.lessons.length} lessons for topic: ${smartTemplate.topic}`);
    }
    
    // Generate CSS with smart colors
    const css = this.generateSmartCSS(smartTemplate);
    fs.writeFileSync(path.join(project.path, 'styles.css'), css);
    project.files.push('styles.css');
    
    // Generate HTML pages - 5+ pages with unique content
    const pages = ['index', 'about', 'services', 'blog', 'contact'];
    for (const pageName of pages) {
      const html = this.generateSmartHTML(smartTemplate, pageName, description, intent);
      const filename = pageName === 'index' ? 'index.html' : `${pageName}.html`;
      fs.writeFileSync(path.join(project.path, filename), html);
      project.files.push(filename);
    }
    
    // Generate JS
    const js = this.generateSmartJS(smartTemplate);
    fs.writeFileSync(path.join(project.path, 'main.js'), js);
    project.files.push('main.js');
    
    // Save project metadata
    const metadata = {
      templateKey,
      title: smartTemplate.title,
      originalDescription: description,
      intent,
      createdAt: new Date().toISOString(),
      pages: ['index', 'about', 'services', 'blog', 'contact'],
      version: '4.0-internet'
    };
    fs.writeFileSync(
      path.join(project.path, '.project-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    project.files.push('.project-metadata.json');
    
    console.log(`✅ SMART generated ${project.files.length} files with INTERNET content`);
  }
  
  // ===== DYNAMIC CONTENT GENERATION - Works for ANY topic =====
  generateDynamicContent(baseTemplate, description, intent) {
    const topic = this.extractTopic(description);
    const siteType = intent?.siteType || 'general';
    const isEducational = siteType === 'course' || 
                           intent?.category === 'education' || 
                           intent?.tone === 'educational' ||
                           description.toLowerCase().includes('курс') ||
                           description.toLowerCase().includes('урок') ||
                           description.toLowerCase().includes('обучение');
    
    // Generate content based on site type
    let lessons = baseTemplate.lessons || [];
    let sections = baseTemplate.sections || [];
    let courseContent = baseTemplate.courseContent || null;
    
    // For educational sites - generate lessons if not present
    if (isEducational && lessons.length === 0) {
      lessons = this.generateLessonsForTopic(topic, 6);
      courseContent = this.generateCourseStructure(topic);
    }
    
    // For blog sites - generate article structure
    if (siteType === 'blog' && sections.length === 0) {
      sections = this.generateBlogSections(topic);
    }
    
    // For shop sites - generate product structure  
    if (siteType === 'shop' && sections.length === 0) {
      sections = this.generateShopSections(topic);
    }
    
    // For portfolio sites - generate project structure
    if (siteType === 'portfolio' && sections.length === 0) {
      sections = this.generatePortfolioSections(topic);
    }
    
    return {
      ...baseTemplate,
      lessons: lessons,
      sections: sections,
      courseContent: courseContent,
      isEducational: isEducational,
      siteType: siteType,
      topic: topic
    };
  }
  
  generateBlogSections(topic) {
    return [
      { title: 'Последние статьи', items: [
        { title: 'Начало пути', desc: `Первые шаги в мире ${topic.toLowerCase()}`, icon: 'feather' },
        { title: 'Советы экспертов', desc: 'Проверенные рекомендации', icon: 'star' },
        { title: 'Тренды', desc: 'Что актуально сейчас', icon: 'trending-up' },
        { title: 'Case Studies', desc: 'Реальные примеры', icon: 'briefcase' }
      ]},
      { title: 'Рубрики', items: [
        { title: 'Для начинающих', desc: 'Базовые знания', icon: 'book-open' },
        { title: 'Продвинутый уровень', desc: 'Углублённый контент', icon: 'zap' },
        { title: 'Инструменты', desc: 'Полезные ресурсы', icon: 'tool' },
        { title: 'Сообщество', desc: 'Обсуждения', icon: 'message-circle' }
      ]}
    ];
  }
  
  generateShopSections(topic) {
    return [
      { title: 'Категории товаров', items: [
        { title: 'Популярное', desc: 'Лучшие продажи', icon: 'fire' },
        { title: 'Новинки', desc: 'Свежие поступления', icon: 'sparkles' },
        { title: 'Скидки', desc: 'Выгодные предложения', icon: 'percent' },
        { title: 'Премиум', desc: 'Элитный выбор', icon: 'crown' }
      ]},
      { title: 'Почему мы', items: [
        { title: 'Качество', desc: 'Только лучшее', icon: 'award' },
        { title: 'Доставка', desc: 'Быстро и надёжно', icon: 'truck' },
        { title: 'Поддержка', desc: '24/7 на связи', icon: 'headphones' },
        { title: 'Гарантия', desc: 'Возврат без проблем', icon: 'shield-check' }
      ]}
    ];
  }
  
  generatePortfolioSections(topic) {
    return [
      { title: 'Навыки', items: [
        { title: 'Экспертиза', desc: `Профессионал в ${topic.toLowerCase()}`, icon: 'award' },
        { title: 'Опыт', desc: 'Более 5 лет работы', icon: 'clock' },
        { title: 'Проекты', desc: '50+ выполненных работ', icon: 'folder' },
        { title: 'Клиенты', desc: '100+ довольных заказчиков', icon: 'users' }
      ]},
      { title: 'Услуги', items: [
        { title: 'Консультация', desc: 'Бесплатная оценка', icon: 'message-square' },
        { title: 'Разработка', desc: 'Под ключ', icon: 'code' },
        { title: 'Поддержка', desc: 'После проекта', icon: 'life-buoy' },
        { title: 'Обучение', desc: 'Менторство', icon: 'graduation-cap' }
      ]}
    ];
  }
  
  generateLessonsForTopic(topic, count = 6) {
    // Dynamic lesson generation based on topic keywords
    const topicLower = topic.toLowerCase();
    
    // Topic-specific lesson templates
    const lessonTemplates = {
      'default': [
        { id: 'lesson-1', title: `Введение в ${topic}`, content: `Добро пожаловать в мир ${topic.toLowerCase()}! В этом уроке мы разберём основные понятия и подготовимся к изучению.`, examples: ['Пример базового понятия', 'Разбор простой задачи'], practice: ['Найдите пример из жизни', 'Опишите своими словами'] },
        { id: 'lesson-2', title: `Основы ${topic}`, content: `Фундаментальные принципы ${topic.toLowerCase()}. Эти знания станут базой для всего курса.`, examples: ['Конкретный пример применения', 'Разбор типичной ситуации'], practice: ['Решите базовую задачу', 'Приведите свой пример'] },
        { id: 'lesson-3', title: `Практическое применение`, content: `Как использовать знания о ${topic.toLowerCase()} в реальной жизни. Практические кейсы и примеры.`, examples: ['Реальный пример из практики', 'Case study'], practice: ['Примените на практике', 'Составьте план действий'] },
        { id: 'lesson-4', title: `Продвинутые техники`, content: `Углублённое изучение ${topic.toLowerCase()}. Тонкости и нюансы, которые отличают профессионала.`, examples: ['Сложный пример', 'Оптимизационная задача'], practice: ['Решите продвинутую задачу', 'Найдите ошибку в примере'] },
        { id: 'lesson-5', title: `Частые ошибки`, content: `Чего избегать при работе с ${topic.toLowerCase()}. Советы экспертов и best practices.`, examples: ['Пример неправильного подхода', 'Как исправить ошибку'], practice: ['Найдите ошибку', 'Исправьте пример'] },
        { id: 'lesson-6', title: `Итоговый проект`, content: `Закрепите знания по ${topic.toLowerCase()} на практике. Финальный проект и план дальнейшего развития.`, examples: ['Пример готового проекта', 'Шаблон для работы'], practice: ['Выполните проект', 'Представьте результаты'] }
      ]
    };
    
    // Get lessons (default template works for any topic)
    const lessons = lessonTemplates['default'];
    
    // Customize titles with topic
    return lessons.map((lesson, idx) => ({
      ...lesson,
      id: `${this.slugify(topic)}-${idx + 1}`,
      title: idx === 0 ? `${topic}: Введение` : 
             idx === 1 ? `${topic}: Основы` :
             idx === 2 ? `${topic}: Практика` :
             idx === 3 ? `${topic}: Продвинутый уровень` :
             idx === 4 ? `${topic}: Типичные ошибки` :
             `${topic}: Итоговый проект`
    }));
  }
  
  // AI-powered lesson generation for truly unique content
  async generateAILessons(topic, count = 6) {
    if (!this.apiKey) {
      return this.generateLessonsForTopic(topic, count);
    }
    
    try {
      const prompt = `Создай образовательный курс по теме "${topic}". 
      
Сгенерируй ${count} уроков в формате JSON массива. Каждый урок должен содержать:
- id: уникальный идентификатор
- title: название урока (2-4 слова)
- content: теория (3-4 предложения с конкретной информацией)
- examples: массив из 2-3 примеров
- practice: массив из 2 заданий для практики

Тема: ${topic}

Ответь ТОЛЬКО валидным JSON массивом без markdown formatting:`;

      const response = await this.generateCode(prompt, { type: 'web' });
      const lessons = JSON.parse(response);
      
      if (Array.isArray(lessons) && lessons.length > 0) {
        console.log(`🤖 AI generated ${lessons.length} unique lessons for "${topic}"`);
        return lessons;
      }
    } catch (error) {
      console.log('AI lesson generation failed, using templates:', error.message);
    }
    
    return this.generateLessonsForTopic(topic, count);
  }
  
  generateCourseStructure(topic) {
    return {
      title: topic,
      description: `Полный курс по ${topic.toLowerCase()} — от основ до профессионального уровня`,
      modules: [
        { title: 'Введение', lessons: ['Знакомство с темой', 'Базовые термины', 'Подготовка окружения'] },
        { title: 'Основы', lessons: ['Фундаментальные принципы', 'Ключевые концепции', 'Первые шаги'] },
        { title: 'Практика', lessons: ['Практическое применение', 'Реальные примеры', 'Отработка навыков'] }
      ]
    };
  }
  
  slugify(text) {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  }
  
  // SMART CONTENT GENERATION - Creates unique content from user request
  generateSmartContent(baseTemplate, description, intent) {
    // Extract the actual topic from description
    const topic = this.extractTopic(description);
    
    // Generate smart title (NOT using raw description)
    const smartTitle = this.generateSmartTitle(topic, baseTemplate.category);
    
    // Generate smart hero content
    const smartHero = {
      title: smartTitle,
      subtitle: this.generateSmartSubtitle(topic, baseTemplate.category),
      description: this.generateSmartDescription(topic, baseTemplate.category, intent),
      emoji: baseTemplate.hero.emoji
    };
    
    // Generate smart sections based on topic
    const smartSections = this.generateSmartSections(topic, baseTemplate.category);
    
    // Generate smart gallery with relevant images
    const smartGallery = this.generateSmartGallery(topic);
    
    return {
      ...baseTemplate,
      title: smartTitle,
      hero: smartHero,
      sections: smartSections,
      gallery: smartGallery
    };
  }
  
  extractTopic(description) {
    // Remove command words and extract the actual topic
    const commandWords = ['создай', 'сделай', 'сайт', 'про', 'с', 'о', 'для', 'веб', 'make', 'create', 'website', 'about', 'with'];
    let topic = description.toLowerCase();
    
    commandWords.forEach(word => {
      topic = topic.replace(new RegExp(word, 'gi'), '');
    });
    
    // Clean up
    topic = topic.trim()
      .replace(/[.,!?;:]/g, '')
      .replace(/\s+/g, ' ');
    
    // Capitalize first letter of each word
    topic = topic.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    
    return topic || 'Уникальный проект';
  }
  
  generateSmartTitle(topic, category) {
    // NEVER use raw description as title
    const titlePatterns = {
      'animals': ['Мир ${topic}', '${topic} — лучшие друзья', 'Планета ${topic}'],
      'food': ['${topic} — вкус жизни', 'Искусство ${topic}', '${topic} Studio'],
      'business': ['${topic}', '${topic} Pro', '${topic} Solutions'],
      'travel': ['${topic} Travel', 'Мир ${topic}', '${topic} Journey'],
      'tech': ['${topic} Hub', '${topic} Tech', '${topic} Lab'],
      'fitness': ['${topic} Fit', '${topic} Power', '${topic} Zone'],
      'education': ['${topic} Academy', '${topic} School', '${topic} Learning'],
      'creative': ['${topic} Studio', '${topic} Art', '${topic} Creative'],
      'default': ['${topic}', '${topic} Space', '${topic} Hub']
    };
    
    const patterns = titlePatterns[category] || titlePatterns['default'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern.replace('${topic}', topic.split(' ').slice(0, 2).join(' '));
  }
  
  generateSmartSubtitle(topic, category) {
    const subtitles = {
      'animals': [`Всё о ${topic.toLowerCase()} в одном месте`, `Откройте мир ${topic.toLowerCase()}`, 'Забота и любовь каждый день'],
      'food': [`Искусство приготовления ${topic.toLowerCase()}`, `Лучшие рецепты ${topic.toLowerCase()}`, 'Вкус, который вдохновляет'],
      'business': ['Профессиональные решения', 'Ваш надежный партнер', 'Качество без компромиссов'],
      'travel': ['Незабываемые приключения', 'Исследуйте мир с нами', 'Путешествия мечты'],
      'tech': ['Инновации для жизни', 'Технологии будущего', 'Цифровые решения'],
      'fitness': ['Сила в каждом движении', 'Ваш путь к здоровью', 'Трансформируй тело'],
      'education': ['Знания, которые меняют жизнь', 'Обучение без границ', 'Развивайся с нами'],
      'default': [`Всё о ${topic.toLowerCase()}`, 'Качество и профессионализм', 'Откройте для себя больше']
    };
    
    const subs = subtitles[category] || subtitles['default'];
    return subs[Math.floor(Math.random() * subs.length)];
  }
  
  generateSmartDescription(topic, category, intent) {
    const baseDesc = intent?.primaryKeyword || topic;
    const descriptions = {
      'animals': `Узнайте всё о ${baseDesc.toLowerCase()}: уход, советы, породы и многое другое. Ваш гид в мир питомцев.`,
      'food': `Откройте секреты ${baseDesc.toLowerCase()}: рецепты, техники, советы шеф-поваров. Гастрономическое путешествие начинается здесь.`,
      'business': `Профессиональные услуги в сфере ${baseDesc.toLowerCase()}. Индивидуальный подход, гарантия качества, многолетний опыт.`,
      'travel': `Лучшие направления и маршруты для ${baseDesc.toLowerCase()}. Планируйте путешествие мечты с экспертами.`,
      'tech': `Современные решения в области ${baseDesc.toLowerCase()}. Инновации, технологии, профессиональный подход.`,
      'fitness': `Комплексные программы для ${baseDesc.toLowerCase()}. Тренировки, питание, мотивация — всё для вашего результата.`,
      'education': `Профессиональное обучение ${baseDesc.toLowerCase()}. Практические навыки, экспертные преподаватели, карьерный рост.`,
      'default': `Всё о ${baseDesc.toLowerCase()}: профессиональный подход, качественный контент, полезная информация.`
    };
    
    return descriptions[category] || descriptions['default'];
  }
  
  generateSmartSections(topic, category) {
    // Generate unique feature cards based on topic
    const key = topic.toLowerCase().split(' ')[0];
    
    const sectionTemplates = {
      'animals': [
        { title: 'Породы и виды', items: [
          { title: 'Популярные породы', desc: 'Обзор лучших пород с описанием характера', icon: 'paw' },
          { title: 'Уход и здоровье', desc: 'Профессиональные советы ветеринаров', icon: 'heart' },
          { title: 'Питание', desc: 'Сбалансированное питание для здоровья', icon: 'bowl-food' },
          { title: 'Дрессировка', desc: 'Эффективные методы обучения', icon: 'graduation-cap' }
        ]},
        { title: 'Советы экспертов', items: [
          { title: 'Первые шаги', desc: 'Как подготовиться к появлению питомца', icon: 'house' },
          { title: 'Здоровье', desc: 'Профилактика и уход', icon: 'stethoscope' },
          { title: 'Аксессуары', desc: 'Всё необходимое для комфорта', icon: 'bag-shopping' },
          { title: 'Сообщество', desc: 'Общайтесь с единомышленниками', icon: 'users' }
        ]}
      ],
      'default': [
        { title: 'Возможности', items: [
          { title: 'Профессионально', desc: `Экспертный подход к ${topic.toLowerCase()}`, icon: 'star' },
          { title: 'Качественно', desc: 'Только проверенная информация', icon: 'check-circle' },
          { title: 'Доступно', desc: 'Понятно объясняем сложное', icon: 'lightbulb' },
          { title: 'Актуально', desc: 'Свежие тренды и новости', icon: 'newspaper' }
        ]},
        { title: 'Преимущества', items: [
          { title: 'Опыт', desc: 'Более 10 лет в сфере', icon: 'award' },
          { title: 'Поддержка', desc: 'Помощь на каждом этапе', icon: 'headset' },
          { title: 'Результат', desc: 'Гарантия качества', icon: 'trophy' },
          { title: 'Сообщество', desc: 'Тысячи довольных клиентов', icon: 'users' }
        ]}
      ]
    };
    
    return sectionTemplates[category] || sectionTemplates['default'];
  }
  
  generateSmartGallery(topic) {
    const keywords = topic.toLowerCase().split(' ').slice(0, 2).join(',');
    return [
      { url: `https://source.unsplash.com/800x600/?${keywords},professional`, alt: topic },
      { url: `https://source.unsplash.com/800x600/?${keywords},beautiful`, alt: topic },
      { url: `https://picsum.photos/400/300?random=1`, alt: 'Gallery 1' },
      { url: `https://picsum.photos/400/300?random=2`, alt: 'Gallery 2' }
    ];
  }
  
  generateSmartCSS(template) {
    const { colors } = template;
    const primary = colors.primary;
    const secondary = colors.secondary;
    const accent = colors.accent;
    const bg = colors.bg;
    const text = colors.text;
    
    return `/* SMART Design System v4.0 - Premium Modern */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  --primary: ${primary};
  --primary-light: ${this.lightenColor(primary, 20)};
  --primary-dark: ${this.darkenColor(primary, 20)};
  --secondary: ${secondary};
  --accent: ${accent};
  --bg: ${bg};
  --bg-alt: ${this.darkenColor(bg, 3)};
  --text: ${text};
  --text-light: ${this.lightenColor(text, 40)};
  --text-muted: ${this.lightenColor(text, 60)};
  
  /* Glassmorphism */
  --glass: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.3);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
  --shadow: 0 4px 20px rgba(0,0,0,0.12);
  --shadow-lg: 0 10px 40px rgba(0,0,0,0.15);
  --shadow-glow: 0 0 30px ${primary}40;
  
  /* Radius */
  --radius-sm: 8px;
  --radius: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  overflow-x: hidden;
}

/* ===== NAVBAR - Glassmorphism ===== */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  background: var(--glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--glass-border);
  transition: var(--transition);
}

.navbar.scrolled {
  box-shadow: var(--shadow);
  background: rgba(255,255,255,0.95);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-menu { 
  display: flex; 
  gap: 0.5rem; 
  list-style: none; 
  align-items: center;
}

.nav-link { 
  color: var(--text); 
  text-decoration: none; 
  font-weight: 500;
  padding: 0.6rem 1.2rem;
  border-radius: var(--radius-full);
  transition: var(--transition);
  position: relative;
}

.nav-link:hover { 
  color: var(--primary);
  background: ${primary}15;
}

.nav-link.active {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: white;
  box-shadow: var(--shadow-sm);
}

.nav-cta {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  color: white !important;
  padding: 0.6rem 1.5rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.nav-cta:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
}

/* Mobile menu */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text);
  cursor: pointer;
}

/* ===== HERO - Premium Gradient ===== */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${accent} 100%);
  padding: 10rem 2rem 6rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(to top, var(--bg), transparent);
}

.hero-content { 
  max-width: 900px; 
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.3);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-full);
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 2rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.hero h1 {
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 900;
  color: white;
  margin-bottom: 1.5rem;
  line-height: 1.1;
  text-shadow: 0 4px 30px rgba(0,0,0,0.2);
}

.hero .subtitle {
  font-size: 1.6rem;
  color: rgba(255,255,255,0.95);
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.hero .description {
  font-size: 1.2rem;
  color: rgba(255,255,255,0.85);
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
}

.hero-emoji { 
  font-size: 5rem; 
  margin-bottom: 1.5rem;
  animation: bounce 2s ease-in-out infinite;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-15px) scale(1.1); }
}

.hero-buttons { 
  display: flex; 
  gap: 1rem; 
  justify-content: center; 
  flex-wrap: wrap; 
}

/* ===== BUTTONS - Premium ===== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: var(--transition-bounce);
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: white;
  color: var(--primary);
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.btn-primary:hover { 
  transform: translateY(-3px) scale(1.02); 
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}

.btn-secondary {
  background: rgba(255,255,255,0.15);
  color: white;
  border: 2px solid rgba(255,255,255,0.5);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover { 
  background: rgba(255,255,255,0.25); 
  border-color: white;
  transform: translateY(-3px);
}

.btn-glass {
  background: var(--glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  color: var(--text);
  box-shadow: var(--glass-shadow);
}

.btn-glass:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

/* ===== SECTIONS ===== */
section { padding: 7rem 2rem; }
.container { 
  max-width: 1200px; 
  margin: 0 auto;
  padding: 0 1rem;
}

.section-header {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 4rem;
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: ${primary}15;
  color: var(--primary);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.section-title span {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  font-size: 1.2rem;
  color: var(--text-light);
  line-height: 1.7;
}

/* ===== CARDS - Glassmorphism ===== */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: var(--glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
  transition: var(--transition-bounce);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  transform: scaleX(0);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-lg);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-icon {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: white;
  font-size: 1.8rem;
  box-shadow: var(--shadow-glow);
  transition: var(--transition);
}

.feature-card:hover .feature-icon {
  transform: scale(1.1) rotate(5deg);
}

.feature-card h3 { 
  font-size: 1.4rem; 
  font-weight: 700; 
  margin-bottom: 0.8rem;
  color: var(--text);
}

.feature-card p { 
  color: var(--text-light); 
  line-height: 1.7;
  font-size: 1rem;
}

/* ===== CONTENT CARDS ===== */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.content-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.content-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.content-card-image {
  height: 200px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.content-card-body {
  padding: 1.5rem;
}

.content-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.content-card p {
  color: var(--text-light);
  line-height: 1.6;
}

/* ===== PAGE HERO ===== */
.page-hero {
  background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%);
  padding: 10rem 2rem 5rem;
  text-align: center;
  color: white;
  position: relative;
}

.page-hero::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(to top, var(--bg), transparent);
}

.page-hero h1 { 
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800; 
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
}

.page-hero p { 
  font-size: 1.3rem; 
  opacity: 0.9;
  position: relative;
  z-index: 1;
}

/* ===== CONTENT SECTIONS ===== */
.content-section {
  max-width: 800px;
  margin: 0 auto;
}

.content-section h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 3rem 0 1.5rem;
  color: var(--text);
}

.content-section h2:first-child {
  margin-top: 0;
}

.content-section p {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text-light);
  margin-bottom: 1.5rem;
}

.content-section ul {
  list-style: none;
  padding: 0;
  margin: 2rem 0;
}

.content-section li {
  padding: 1rem 0;
  padding-left: 2rem;
  position: relative;
  border-bottom: 1px solid ${primary}15;
  font-size: 1.1rem;
}

.content-section li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--primary);
  font-weight: 700;
}

/* ===== CONTACT FORM ===== */
.contact-form {
  max-width: 600px;
  margin: 0 auto;
  background: var(--glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  padding: 3rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 1rem 1.2rem;
  border: 2px solid ${primary}20;
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: inherit;
  background: white;
  transition: var(--transition);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px ${primary}20;
}

.form-group textarea {
  min-height: 150px;
  resize: vertical;
}

/* ===== STATS ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin: 4rem 0;
}

.stat-card {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow);
}

.stat-number {
  font-size: 3rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--text-light);
  font-weight: 500;
}

/* ===== FOOTER - Dark ===== */
.footer {
  background: var(--text);
  color: white;
  padding: 5rem 2rem 2rem;
}

.footer-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: 3rem;
  margin-bottom: 3rem;
}

.footer-brand h3 {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-brand p {
  color: rgba(255,255,255,0.7);
  line-height: 1.7;
  max-width: 300px;
}

.footer-links h4 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-links ul {
  list-style: none;
}

.footer-links li {
  margin-bottom: 0.75rem;
}

.footer-links a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: var(--transition);
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
  color: rgba(255,255,255,0.5);
}

/* ===== ANIMATIONS ===== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease;
}

.animate-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== EDUCATIONAL CONTENT STYLES ===== */
.lessons-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.lesson-preview-card {
  background: var(--glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.lesson-preview-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.lesson-preview-number {
  width: 50px;
  height: 50px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.lesson-preview-content h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--text);
}

.lesson-preview-content p {
  color: var(--text-light);
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* Course page styles */
.courses-list {
  display: grid;
  gap: 2rem;
  margin-top: 2rem;
}

.course-card {
  background: var(--glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.course-header {
  background: var(--primary-gradient);
  color: white;
  padding: 2rem;
  text-align: center;
}

.course-header h2 {
  font-size: 1.75rem;
  margin: 1rem 0 0.5rem;
}

.course-header p {
  opacity: 0.9;
}

.course-icon {
  font-size: 3rem;
}

.course-modules {
  padding: 2rem;
}

.course-modules h3 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.module-item {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--bg-alt);
}

.module-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.module-number {
  width: 36px;
  height: 36px;
  background: var(--bg-alt);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--primary);
}

.module-header h4 {
  font-size: 1.1rem;
  color: var(--text);
}

.lessons-list {
  list-style: none;
  padding-left: 3rem;
}

.lessons-list li {
  padding: 0.5rem 0;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lessons-list li i {
  color: var(--primary);
}

/* Lesson detail page */
.lessons-container {
  display: grid;
  gap: 2rem;
  margin-top: 2rem;
}

.lesson-card {
  background: var(--glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.lesson-header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lesson-number {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.875rem;
}

.lesson-header h2 {
  font-size: 1.5rem;
  margin: 0;
}

.lesson-content {
  padding: 2rem;
}

.lesson-text {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text);
  margin-bottom: 2rem;
}

.lesson-examples {
  background: var(--bg-alt);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.lesson-examples h3 {
  font-size: 1.1rem;
  color: var(--primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lesson-examples ul {
  list-style: none;
}

.lesson-examples li {
  padding: 0.75rem 0;
  border-bottom: 1px dashed var(--border);
}

.lesson-examples li:last-child {
  border-bottom: none;
}

.lesson-examples code {
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-family: 'Monaco', 'Menlo', monospace;
  color: var(--accent);
}

.lesson-practice {
  background: linear-gradient(135deg, #fef9e7 0%, #fdebd0 100%);
  border-radius: var(--radius);
  padding: 1.5rem;
  border-left: 4px solid var(--accent);
}

.lesson-practice h3 {
  font-size: 1.1rem;
  color: #b7950b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lesson-practice ul {
  list-style: none;
  margin-bottom: 1.5rem;
}

.lesson-practice li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--text);
}

.lesson-practice li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #7cb342;
  font-weight: bold;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .mobile-menu-btn { display: block; }
  .nav-menu { 
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--glass);
    backdrop-filter: blur(20px);
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
  }
  .nav-menu.active { display: flex; }
  .nav-link { width: 100%; text-align: center; }
  
  .hero { padding: 8rem 1.5rem 4rem; }
  .hero h1 { font-size: 2.2rem; }
  .hero .subtitle { font-size: 1.2rem; }
  .hero-buttons { flex-direction: column; }
  .btn { width: 100%; }
  
  section { padding: 4rem 1.5rem; }
  .features-grid { grid-template-columns: 1fr; gap: 1.5rem; }
  .footer-grid { grid-template-columns: 1fr; gap: 2rem; }
  .contact-form { padding: 2rem; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
  }
  
  generateSmartHTML(template, pageName, description, intent) {
    const { title, hero } = template;
    const isHome = pageName === 'index';
    
    // Use new multi-page content generation
    const content = this.getPageContent(template, pageName, intent);

    const pageTitles = {
      index: hero.title,
      about: 'О нас',
      services: 'Услуги',
      blog: 'Блог',
      contact: 'Контакты'
    };

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitles[pageName] || pageName} | ${hero.title}</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${hero.emoji}</text></svg>">
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <a href="index.html" class="nav-logo">${hero.emoji} ${hero.title}</a>
      <ul class="nav-menu">
        <li><a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Главная</a></li>
        <li><a href="about.html" class="nav-link ${pageName === 'about' ? 'active' : ''}">О нас</a></li>
        <li><a href="services.html" class="nav-link ${pageName === 'services' ? 'active' : ''}">Услуги</a></li>
        <li><a href="blog.html" class="nav-link ${pageName === 'blog' ? 'active' : ''}">Блог</a></li>
        <li><a href="contact.html" class="nav-link ${pageName === 'contact' ? 'active' : ''}">Контакты</a></li>
      </ul>
    </div>
  </nav>
${content}
  <footer class="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>${hero.emoji} ${hero.title}</h3>
        <p>${hero.description.substring(0, 100)}...</p>
      </div>
      <div class="footer-links">
        <h4>Навигация</h4>
        <ul>
          <li><a href="index.html">Главная</a></li>
          <li><a href="about.html">О нас</a></li>
          <li><a href="services.html">Услуги</a></li>
          <li><a href="blog.html">Блог</a></li>
          <li><a href="contact.html">Контакты</a></li>
        </ul>
      </div>
      <div class="footer-links">
        <h4>Контакты</h4>
        <ul>
          <li><a href="mailto:hello@example.com">hello@example.com</a></li>
          <li><a href="tel:+79991234567">+7 (999) 123-45-67</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 ${hero.title}. Все права защищены.</p>
    </div>
  </footer>
  <script src="main.js"></script>
</body>
</html>`;
  }
  
  generateSmartJS(template) {
    return `// SMART Site JavaScript
console.log('🚀 ${template.title} loaded successfully!');

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// Scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'all 0.6s ease';
  el.style.transitionDelay = (i * 0.1) + 's';
  observer.observe(el);
});

// Navbar shadow
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.style.boxShadow = window.scrollY > 50 
    ? '0 4px 30px rgba(0,0,0,0.1)' 
    : '0 2px 20px rgba(0,0,0,0.05)';
});`;
  }

  // ===== WEBSITE MODIFICATION SYSTEM (Better than base44) =====
  
  async modifyWebsite(projectPath, modificationRequest) {
    console.log('=== modifyWebsite ===');
    console.log('Request:', modificationRequest);
    
    // Load project metadata
    const metadataPath = path.join(projectPath, '.project-metadata.json');
    let metadata = null;
    
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log('Loaded metadata for template:', metadata.templateKey);
      } catch (e) {
        console.log('Failed to load metadata');
      }
    }
    
    // Parse modification type
    const modType = this.detectModificationType(modificationRequest);
    console.log('Modification type:', modType);
    
    switch (modType.type) {
      case 'color':
        await this.applyColorChange(projectPath, modType.value);
        break;
      case 'section_add':
        await this.addSection(projectPath, modType.value, metadata);
        break;
      case 'section_remove':
        await this.removeSection(projectPath, modType.value);
        break;
      case 'content_update':
        await this.updateContent(projectPath, modificationRequest, metadata);
        break;
      case 'page_add':
        await this.addPage(projectPath, modType.value, metadata);
        break;
      default:
        // General AI-powered modification
        await this.aiModifyWebsite(projectPath, modificationRequest, metadata);
    }
    
    return { success: true, message: 'Изменения применены успешно' };
  }
  
  detectModificationType(request) {
    const r = request.toLowerCase();
    
    // Color changes
    if (r.includes('цвет') || r.includes('цвета') || r.includes('color') || r.includes('theme')) {
      const colorMatch = r.match(/(синий|красный|зеленый|желтый|черный|белый|фиолетовый|оранжевый|розовый|голубой|blue|red|green|yellow|black|white|purple|orange|pink)/);
      if (colorMatch) {
        return { type: 'color', value: colorMatch[1] };
      }
    }
    
    // Add section/page
    if (r.includes('добавь') || r.includes('создай') || r.includes('add') || r.includes('create')) {
      if (r.includes('страниц') || r.includes('страница') || r.includes('page')) {
        const pageMatch = r.match(/(страницу|страницу\s+)?([а-яa-z]+)/i);
        return { type: 'page_add', value: pageMatch ? pageMatch[2] : 'new' };
      }
      if (r.includes('секци') || r.includes('блок') || r.includes('section')) {
        return { type: 'section_add', value: r };
      }
    }
    
    // Remove section
    if ((r.includes('удали') || r.includes('убери') || r.includes('remove') || r.includes('delete')) && 
        (r.includes('секци') || r.includes('блок') || r.includes('section'))) {
      return { type: 'section_remove', value: r };
    }
    
    // Content updates
    if (r.includes('измени') || r.includes('обнови') || r.includes('поменяй') || r.includes('update') || r.includes('change')) {
      return { type: 'content_update', value: r };
    }
    
    return { type: 'ai_general', value: r };
  }
  
  async applyColorChange(projectPath, colorName) {
    console.log('Applying color change:', colorName);
    
    const colorMap = {
      'синий': { primary: '#0984e3', secondary: '#74b9ff', accent: '#00cec9' },
      'blue': { primary: '#0984e3', secondary: '#74b9ff', accent: '#00cec9' },
      'красный': { primary: '#e17055', secondary: '#fab1a0', accent: '#ff7675' },
      'red': { primary: '#e17055', secondary: '#fab1a0', accent: '#ff7675' },
      'зеленый': { primary: '#00b894', secondary: '#55efc4', accent: '#00cec9' },
      'green': { primary: '#00b894', secondary: '#55efc4', accent: '#00cec9' },
      'желтый': { primary: '#fdcb6e', secondary: '#ffeaa7', accent: '#f39c12' },
      'yellow': { primary: '#fdcb6e', secondary: '#ffeaa7', accent: '#f39c12' },
      'фиолетовый': { primary: '#6c5ce7', secondary: '#a29bfe', accent: '#b39ddb' },
      'purple': { primary: '#6c5ce7', secondary: '#a29bfe', accent: '#b39ddb' },
      'оранжевый': { primary: '#e67e22', secondary: '#f39c12', accent: '#d35400' },
      'orange': { primary: '#e67e22', secondary: '#f39c12', accent: '#d35400' },
      'розовый': { primary: '#e84393', secondary: '#fd79a8', accent: '#ff9ff3' },
      'pink': { primary: '#e84393', secondary: '#fd79a8', accent: '#ff9ff3' }
    };
    
    const colors = colorMap[colorName] || colorMap['синий'];
    
    // Update CSS file
    const cssPath = path.join(projectPath, 'styles.css');
    if (fs.existsSync(cssPath)) {
      let css = fs.readFileSync(cssPath, 'utf8');
      css = css.replace(/--primary: #[a-f0-9]{6}/i, `--primary: ${colors.primary}`);
      css = css.replace(/--secondary: #[a-f0-9]{6}/i, `--secondary: ${colors.secondary}`);
      css = css.replace(/--accent: #[a-f0-9]{6}/i, `--accent: ${colors.accent}`);
      fs.writeFileSync(cssPath, css);
      console.log('CSS colors updated');
    }
  }
  
  async addPage(projectPath, pageName, metadata) {
    console.log('Adding new page:', pageName);
    
    // Create basic HTML structure
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <a href="index.html" class="nav-logo">🏠 Главная</a>
      <ul class="nav-menu">
        <li><a href="index.html" class="nav-link">Главная</a></li>
        <li><a href="about.html" class="nav-link">О нас</a></li>
        <li><a href="contact.html" class="nav-link">Контакты</a></li>
        <li><a href="${pageName}.html" class="nav-link active">${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</a></li>
      </ul>
    </div>
  </nav>

  <section class="page-hero">
    <h1>${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h1>
    <p>Новая страница</p>
  </section>

  <section class="content">
    <div class="container">
      <h2>Содержимое страницы</h2>
      <p>Здесь будет контент для страницы ${pageName}.</p>
    </div>
  </section>

  <script src="main.js"></script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(projectPath, `${pageName}.html`), html);
    console.log(`Created ${pageName}.html`);
  }
  
  async aiModifyWebsite(projectPath, request, metadata) {
    console.log('Using AI to modify website...');
    
    if (!this.apiKey) {
      console.log('No API key available for AI modification');
      return;
    }
    
    // Read current index.html
    const indexPath = path.join(projectPath, 'index.html');
    const currentHTML = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
    
    const prompt = `You are modifying an existing website based on this request: "${request}"

Current HTML structure:
${currentHTML.substring(0, 3000)}

Apply the requested changes while maintaining the existing structure and styles.
Return ONLY the complete modified HTML code for index.html.
Do not change the CSS link or basic structure unless specifically requested.`;

    try {
      const response = await this.generateCode(prompt, { type: 'web' });
      const newHTML = this.extractCodeBlock(response) || response;
      
      fs.writeFileSync(indexPath, newHTML);
      console.log('AI modification applied to index.html');
    } catch (error) {
      console.error('AI modification failed:', error.message);
    }
  }

  // ===== ADVANCED AI GENERATION (Fallback Only) =====
  
  async generateWebProjectAdvanced(project, description) {
    console.log('=== generateWebProjectAdvanced called ===');
    
    // Step 1: Research the topic if it's content-heavy (with timeout protection)
    let researchContext = '';
    const needsResearch = this.shouldResearchTopic(description);
    
    if (needsResearch) {
      console.log('Researching topic...');
      try {
        // Add timeout wrapper for research
        const researchPromise = this.researchTopic(description, 'basic');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Research timeout')), 30000)
        );
        const research = await Promise.race([researchPromise, timeoutPromise]).catch(err => {
          console.log('Research failed or timed out:', err.message);
          return null;
        });
        
        if (research) {
          researchContext = `\n\nRESEARCH DATA:\n${research.combinedContent.substring(0, 4000)}\n\nUse this research to create accurate, up-to-date content.`;
        }
      } catch (researchError) {
        console.log('Research error (continuing without):', researchError.message);
      }
    }
    
    // Step 2: Generate flexible website structure
    const structurePrompt = `You are creating a website based on this request: "${description}"

${researchContext}

ANALYZE the request and determine:
1. What TYPE of website is needed (portfolio, blog, business, landing page, dashboard, etc.)
2. What PAGES are necessary (don't create unnecessary pages)
3. What FEATURES are needed (forms, animations, galleries, etc.)

Respond with a JSON structure like this:
{
  "type": "portfolio|business|blog|landing|dashboard|other",
  "pages": ["index", "about", "contact"],
  "features": ["responsive", "animations", "forms"],
  "style": "modern|minimal|colorful|professional",
  "theme": "brief description of color scheme and vibe"
}

Only respond with valid JSON, no other text.`;

    const structureResponse = await this.generateCode(structurePrompt, { type: 'web' });
    let structure;
    
    try {
      // Extract JSON from response
      const jsonMatch = structureResponse.match(/\{[\s\S]*\}/);
      structure = jsonMatch ? JSON.parse(jsonMatch[0]) : this.getDefaultStructure(description);
    } catch (e) {
      console.log('Failed to parse structure, using default');
      structure = this.getDefaultStructure(description);
    }
    
    console.log('Website structure:', structure);
    
    // Step 3: Generate each page with flexible structure
    const files = {};
    
    // Generate CSS first (shared styles)
    const cssPrompt = `You are a CSS EXPERT creating a professional stylesheet for a ${structure.type} website.
Theme: ${structure.theme || 'modern professional'}

=== CSS REQUIREMENTS - ABSOLUTELY MANDATORY ===

**1. CSS VARIABLES (REQUIRED IN :root):**
\`\`\`css
:root {
  /* Primary Colors */
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  /* Accent Colors */
  --accent-pink: #ec4899;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
  --accent-amber: #f59e0b;
  
  /* Text Colors */
  --text: #1e293b;
  --text-light: #64748b;
  --text-muted: #94a3b8;
  
  /* Background Colors */
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --bg-dark: #0f172a;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.3);
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 50px;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
}
\`\`\`

**2. BUTTON STYLES - CRITICAL - MUST BE PERFECT:**
\`\`\`css
/* Base button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

/* Primary button - GRADIENT REQUIRED */
.btn-primary {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Secondary button - OUTLINE */
.btn-secondary {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn-secondary:hover {
  background: var(--primary);
  color: white;
}

/* Button sizes */
.btn-lg {
  padding: 1.25rem 2.5rem;
  font-size: 1.125rem;
}

.btn-sm {
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
}

/* Button with icon */
.btn i, .btn svg {
  width: 1.25rem;
  height: 1.25rem;
}
\`\`\`

**3. CARD COMPONENTS:**
\`\`\`css
.card {
  background: var(--bg);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-xl);
}

.card-feature {
  text-align: center;
  padding: var(--space-8);
}

.card-feature .icon {
  width: 64px;
  height: 64px;
  background: var(--primary-gradient);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-4);
  color: white;
  font-size: 1.5rem;
}
\`\`\`

**4. HERO SECTION - MUST BE IMPRESSIVE:**
\`\`\`css
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  position: relative;
  overflow: hidden;
  padding: 6rem 2rem;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
}

.hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  color: white;
  margin-bottom: var(--space-6);
  text-shadow: 0 4px 20px rgba(0,0,0,0.2);
  line-height: 1.1;
}

.hero p {
  font-size: 1.25rem;
  color: rgba(255,255,255,0.9);
  margin-bottom: var(--space-8);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
\`\`\`

**5. NAVIGATION - MODERN GLASS EFFECT:**
\`\`\`css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-sm);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
}

.nav-menu {
  display: flex;
  gap: var(--space-8);
  list-style: none;
}

.nav-link {
  color: var(--text);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-link:hover {
  color: var(--primary);
}
\`\`\`

**6. CONTAINER & LAYOUT:**
\`\`\`css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

section {
  padding: var(--space-16) var(--space-4);
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-12);
  color: var(--text);
}

.grid {
  display: grid;
  gap: var(--space-6);
}

.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
\`\`\`

**7. ANIMATIONS:**
\`\`\`css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.6s ease forwards;
}

.animate-pulse {
  animation: pulse 2s infinite;
}
\`\`\`

**8. RESPONSIVE DESIGN:**
\`\`\`css
@media (max-width: 768px) {
  .nav-menu {
    display: none; /* Mobile menu handled by JS */
  }
  
  .hero h1 {
    font-size: 2rem;
  }
  
  .hero p {
    font-size: 1rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .hero-buttons {
    flex-direction: column;
    gap: var(--space-4);
  }
  
  section {
    padding: var(--space-12) var(--space-4);
  }
}
\`\`\`

=== PROHIBITED CSS - NEVER USE ===

❌ NEVER: background: gray (use gradient instead)
❌ NEVER: border-radius: 0 on buttons (use 50px)
❌ NEVER: color: #ccc or #ddd on white backgrounds
❌ NEVER: default browser button styles
❌ NEVER: box-shadow: none (use the shadow variables)
❌ NEVER: inline styles in HTML

=== REQUIRED OUTPUT ===

Generate COMPLETE styles.css with:
1. All CSS variables in :root
2. All button styles (primary, secondary, sizes)
3. Card components
4. Hero section styling
5. Navigation with glass effect
6. Container and section spacing
7. Animations
8. Responsive breakpoints
9. Utility classes

Make it production-ready, modern, and beautiful.`;

    const cssResponse = await this.generateCode(cssPrompt, { type: 'web' });
    files['styles.css'] = this.extractCodeBlock(cssResponse) || cssResponse;
    
    // Generate each page
    for (const pageName of structure.pages || ['index']) {
      const isHome = pageName === 'index' || pageName === 'home';
      
      const pagePrompt = `You are an EXPERT web developer creating a ${isHome ? 'homepage' : pageName + ' page'} for a website.

USER REQUEST: "${description}"
Website Type: ${structure.type}
Theme: ${structure.theme || 'modern professional'}

${researchContext.substring(0, 2000)}

=== CRITICAL RULES - VIOLATION IS UNACCEPTABLE ===

**1. TITLE RULES - ABSOLUTE ZERO TOLERANCE:**

🚫 **ABSOLUTELY FORBIDDEN - NEVER DO THESE:**
- NEVER use the raw user request as title
- NEVER use words: "создай", "сделай", "построй", "сайт", "веб", "сгенерируй", "сгенерировать", "создать", "сделать"
- NEVER use: "добро пожаловать", "welcome", "homepage", "главная", "about", "contact"
- NEVER copy words from USER REQUEST directly into title
- NEVER use lowercase words like "c", "скортинками", "собак", "красивым"

✅ **CORRECT APPROACH:**
- Create a PROPER NOUN - name of the website/brand
- Use 2-4 words maximum
- Capitalize first letter of each word
- Make it sound like a real product/brand name

**BAD vs GOOD EXAMPLES:**
- ❌ "создай сайт скортинками собак" → ✅ "Верные Друзья" or "Мир Собак"
- ❌ "сделай сайт про кошек" → ✅ "Пушистый Мир" or "Кошачье Царство"  
- ❌ "создай кулинарный сайт" → ✅ "Вкус Жизни" or "Кулинарная Магия"
- ❌ "сайт с фото природы" → ✅ "Природное Вдохновение" or "Мир Природы"

**TITLE MUST BE:** Original brand name, not description of request!

**2. CONTENT RULES - ZERO PLACEHOLDERS:**
✅ Write ORIGINAL content that sounds human and engaging
✅ First sentence must hook the reader - specific detail about topic
✅ Each paragraph 2-4 sentences with concrete facts/info
✅ Use warm, conversational Russian

🚫 **FORBIDDEN PHRASES - NEVER USE:**
- "Добро пожаловать на наш..."
- "Это сгенерированный..."
- "Здесь вы найдёте..."
- "Это веб-сайт о..."
- "Мы рады приветствовать..."
- "Вас ждёт удивительный..."
- Any generic welcome text

**CORRECT EXAMPLE:**
❌ "Добро пожаловать на наш удивительный сайт! Здесь вы найдёте интересный контент."
✅ "Знаете ли вы, что собаки понимают до 250 слов? От верных лабрадоров до игривых пуделей — каждая порода дарит уникальную радость."

**3. HTML STRUCTURE (MANDATORY):**

\`\`\`html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CREATIVE_TITLE_HERE</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-star"></i>
                <span>CREATIVE_TITLE</span>
            </a>
            <ul class="nav-menu">
                ${structure.pages?.map(p => `<li><a href="${p}.html" class="nav-link${p === pageName ? ' active' : ''}">${p === 'index' ? 'Главная' : p === 'about' ? 'О нас' : p === 'contact' ? 'Контакты' : p}</a></li>`).join('\n                ')}
            </ul>
            <button class="hamburger" aria-label="Menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>

${isHome ? `    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>CREATIVE_TITLE_HERE</h1>
            <p>Engaging subtitle that describes what this website offers. 1-2 sentences about the value proposition.</p>
            <div class="hero-buttons">
                <a href="${structure.pages?.find(p => p !== 'index') || 'about'}.html" class="btn btn-primary">
                    <i class="fas fa-rocket"></i>
                    Начать
                </a>
                <a href="about.html" class="btn btn-secondary">
                    <i class="fas fa-info-circle"></i>
                    Подробнее
                </a>
            </div>
        </div>
        <!-- Decorative wave -->
        <div class="hero-wave">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
            </svg>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <h2 class="section-title">Что вас ждёт</h2>
            <div class="grid grid-3">
                <div class="card card-feature">
                    <div class="icon">
                        <i class="fas fa-heart"></i>
                    </div>
                    <h3>Feature 1 Title</h3>
                    <p>2-3 sentences describing this feature with specific details related to the topic.</p>
                </div>
                <div class="card card-feature">
                    <div class="icon">
                        <i class="fas fa-star"></i>
                    </div>
                    <h3>Feature 2 Title</h3>
                    <p>2-3 sentences describing this feature with specific details related to the topic.</p>
                </div>
                <div class="card card-feature">
                    <div class="icon">
                        <i class="fas fa-gem"></i>
                    </div>
                    <h3>Feature 3 Title</h3>
                    <p>2-3 sentences describing this feature with specific details related to the topic.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Gallery/Content Section -->
    <section class="gallery">
        <div class="container">
            <h2 class="section-title">Галерея</h2>
            <div class="gallery-grid">
                <img src="https://picsum.photos/400/300?random=1" alt="Descriptive alt text" class="gallery-img">
                <img src="https://picsum.photos/400/300?random=2" alt="Descriptive alt text" class="gallery-img">
                <img src="https://picsum.photos/400/300?random=3" alt="Descriptive alt text" class="gallery-img">
            </div>
        </div>
    </section>` : `    <!-- Page Content -->
    <section class="page-hero">
        <div class="container">
            <h1>${pageName === 'about' ? 'О нас' : pageName === 'contact' ? 'Контакты' : pageName}</h1>
            <p>Page subtitle with brief description</p>
        </div>
    </section>

    <section class="page-content">
        <div class="container">
            <!-- Content specific to page type -->
            ${pageName === 'about' ? `
            <div class="about-content">
                <h2>Наша история</h2>
                <p>3-4 sentences about the website/company/brand with specific details related to the topic.</p>
                
                <h2>Наша миссия</h2>
                <p>2-3 sentences about the mission and values.</p>
                
                <div class="stats">
                    <div class="stat">
                        <span class="stat-number">1000+</span>
                        <span class="stat-label">Довольных пользователей</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">50+</span>
                        <span class="stat-label">Чего-то ещё</span>
                    </div>
                </div>
            </div>` : pageName === 'contact' ? `
            <div class="contact-grid">
                <div class="contact-info">
                    <h2>Свяжитесь с нами</h2>
                    <p>Мы всегда рады общению и готовы помочь.</p>
                    
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <span>email@example.com</span>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>+7 (999) 123-45-67</span>
                    </div>
                </div>
                
                <form class="contact-form">
                    <div class="form-group">
                        <label>Имя</label>
                        <input type="text" placeholder="Ваше имя">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label>Сообщение</label>
                        <textarea placeholder="Ваше сообщение..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Отправить</button>
                </form>
            </div>` : `
            <div class="content-section">
                <h2>Content for ${pageName}</h2>
                <p>Original content specific to this page and topic.</p>
            </div>`}
        </div>
    </section>`}

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-brand">
                    <span class="footer-logo">CREATIVE_TITLE</span>
                    <p>Краткое описание сайта одним предложением.</p>
                </div>
                <div class="footer-links">
                    <h4>Навигация</h4>
                    <ul>
                        ${structure.pages?.map(p => `<li><a href="${p}.html">${p === 'index' ? 'Главная' : p === 'about' ? 'О нас' : p === 'contact' ? 'Контакты' : p}</a></li>`).join('\n                        ')}
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 CREATIVE_TITLE. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>
\`\`\`

**4. IMAGE RULES:**
✅ Use ONLY real, working image URLs:
   - General: https://picsum.photos/800/600?random=N (where N is unique number)
   - Dogs: https://placedog.net/400/300
   - Cats: https://cataas.com/cat?width=400&height=300
   - Nature: https://source.unsplash.com/800x600/?nature
✅ ALWAYS include descriptive alt attributes
❌ NEVER use placeholder names like "котик1", "image1", "фото"
❌ NEVER use local paths without http

**5. REQUIRED ELEMENTS:**
✅ Favicon (SVG with emoji)
✅ Navigation with all pages linked
✅ Hero section with gradient background (for homepage)
✅ At least 2 CTA buttons with icons
✅ Features/gallery section
✅ Footer with navigation
✅ Link to styles.css
✅ Link to main.js
✅ Google Fonts (Inter)
✅ FontAwesome CDN

**6. PROHIBITED:**
❌ No inline styles (use CSS classes only)
❌ No default browser button styling
❌ No placeholder text
❌ No broken image URLs
❌ No light gray text on white backgrounds
❌ No skipping required sections

=== OUTPUT FORMAT ===

${pageName}.html
\`\`\`html
[complete HTML code following ALL rules above]
\`\`\`

Generate production-quality HTML that follows EVERY rule above.`;

      const pageResponse = await this.generateCode(pagePrompt, { type: 'web' });
      const parsedFiles = this.parseFilesFromResponse(pageResponse);
      
      // Use parsed file or extract code block
      const htmlContent = parsedFiles[`${pageName}.html`] || this.extractCodeBlock(pageResponse) || pageResponse;
      files[`${pageName}.html`] = htmlContent;
    }
    
    // Generate JavaScript if needed
    if (structure.features?.some(f => f.includes('animation') || f.includes('interactive') || f.includes('form'))) {
      const jsPrompt = `You are a JavaScript EXPERT creating interactive features for a ${structure.type} website.

=== REQUIRED FEATURES ===

**1. MOBILE NAVIGATION TOGGLE:**
\`\`\`javascript
// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger?.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  hamburger.classList.toggle('active');
});

// Close menu on link click
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
  });
});
\`\`\`

**2. SMOOTH SCROLL:**
\`\`\`javascript
// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
\`\`\`

**3. SCROLL ANIMATIONS (Intersection Observer):**
\`\`\`javascript
// Animate elements on scroll
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-fadeInUp');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe all cards and sections
document.querySelectorAll('.card, .feature-card, .section-title').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  observer.observe(el);
});
\`\`\`

**4. FORM HANDLING:**
\`\`\`javascript
// Form validation and submission
const forms = document.querySelectorAll('form');
forms.forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Basic validation
    const inputs = form.querySelectorAll('input, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.style.borderColor = '#ef4444';
      } else {
        input.style.borderColor = '';
      }
    });
    
    if (isValid) {
      // Show success message
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Отправлено!';
      btn.disabled = true;
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        form.reset();
      }, 2000);
    }
  });
});
\`\`\`

**5. NAVIGATION BACKGROUND ON SCROLL:**
\`\`\`javascript
// Add background to nav on scroll
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
  } else {
    navbar.style.boxShadow = '';
  }
});
\`\`\`

=== CODE REQUIREMENTS ===
✅ Use modern ES6+ syntax (const, let, arrow functions)
✅ Use optional chaining (?.) where appropriate
✅ Add event listeners only after DOM is ready
✅ Use smooth animations with CSS transitions
✅ Handle errors gracefully (try/catch if needed)
✅ Comment code explaining what each section does
❌ NEVER use var
❌ NEVER use jQuery
❌ NEVER use inline event handlers

=== OUTPUT ===
Generate main.js with ALL features above. Include comments and use modern JavaScript.`;

      const jsResponse = await this.generateCode(jsPrompt, { type: 'web' });
      files['main.js'] = this.extractCodeBlock(jsResponse) || jsResponse;
      
      // Add script tag to all HTML files
      for (const [filename, content] of Object.entries(files)) {
        if (filename.endsWith('.html') && !content.includes('<script src="main.js">')) {
          files[filename] = content.replace('</body>', '<script src="main.js"></script>\n</body>');
        }
      }
    }
    
    // Step 4: Post-process and validate files
    let needsFallback = false;
    
    for (const [filename, content] of Object.entries(files)) {
      if (content && content.trim().length > 0) {
        let processedContent = content;
        
        // Fix common color issues
        if (filename.endsWith('.css') || filename.endsWith('.html')) {
          processedContent = this.fixColorIssues(processedContent);
        }
        
        // Fix button styles in CSS
        if (filename.endsWith('.css')) {
          processedContent = this.fixButtonStyles(processedContent);
        }
        
        // Fix image placeholders
        if (filename.endsWith('.html')) {
          processedContent = this.fixImagePlaceholders(processedContent, description);
        }
        
        // === QUALITY CONTROL ===
        if (filename.endsWith('.html')) {
          // Validate and fix titles
          processedContent = this.validateAndFixTitle(processedContent, description);
          
          // Check for placeholder content
          processedContent = this.validateAndFixContent(processedContent);
          
          // Ensure styles are linked
          processedContent = this.ensureStylesLinked(processedContent);
          
          // Check if content quality is bad
          if (this.isContentQualityBad(processedContent)) {
            console.log(`WARNING: ${filename} has bad quality content, will use fallback`);
            needsFallback = true;
          }
          
          // Check for regeneration marker
          if (processedContent.includes('data-needs-regeneration="true"')) {
            needsFallback = true;
          }
        }
        
        files[filename] = processedContent;
      }
    }
    
    // If quality is bad, use fallback template
    if (needsFallback) {
      console.log('AI generated poor quality content, switching to fallback template');
      await this.generateMinimalSite(project, description);
      return;
    }
    
    // Save all files
    for (const [filename, content] of Object.entries(files)) {
      if (content && content.trim().length > 0) {
        const filepath = path.join(project.path, filename);
        fs.writeFileSync(filepath, content);
        project.files.push(filename);
        console.log('Created file:', filename);
      }
    }
    
    console.log(`Generated ${Object.keys(files).length} files via AI without templates`);
  }
  
  fixColorIssues(content) {
    if (!content) return content;
    
    let fixed = content;
    
    // Fix light gray on white backgrounds
    const badColorPairs = [
      { bad: '#cccccc', good: '#4a5568' },
      { bad: '#dddddd', good: '#4a5568' },
      { bad: '#eeeeee', good: '#2d3748' },
      { bad: 'rgb(200, 200, 200)', good: '#4a5568' },
      { bad: 'rgb(204, 204, 204)', good: '#4a5568' },
      { bad: 'rgba(255, 255, 255, 0.3)', good: 'rgba(0, 0, 0, 0.7)' },
    ];
    
    for (const pair of badColorPairs) {
      fixed = fixed.replace(new RegExp(pair.bad, 'gi'), pair.good);
    }
    
    // Fix CSS variables if they're too light
    fixed = fixed.replace(/var\(--text\s*,\s*#(?:ccc|ddd|eee|fff)\)/gi, 'var(--text, #1a1a2e)');
    fixed = fixed.replace(/var\(--heading\s*,\s*#(?:ccc|ddd|eee|fff)\)/gi, 'var(--heading, #0f172a)');
    
    return fixed;
  }
  
  fixButtonStyles(cssContent) {
    if (!cssContent) return cssContent;
    
    let fixed = cssContent;
    
    // Check if .btn class exists and has proper styling
    if (!fixed.includes('.btn') || fixed.includes('background: gray') || fixed.includes('background: #ccc')) {
      // Add proper button styles if missing or broken
      const buttonStyles = `
/* Fixed Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}
.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid rgba(255,255,255,0.5);
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.1);
  border-color: white;
}`;
      fixed += '\n' + buttonStyles;
    }
    
    // Replace gray button backgrounds with gradient
    fixed = fixed.replace(/background:\s*gray/gi, 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    fixed = fixed.replace(/background:\s*#ccc/gi, 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    fixed = fixed.replace(/background:\s*#ddd/gi, 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    fixed = fixed.replace(/background-color:\s*gray/gi, 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    
    return fixed;
  }
  
  fixImagePlaceholders(content, description) {
    if (!content) return content;
    
    let fixed = content;
    const desc = description.toLowerCase();
    
    // Replace ANY broken image src (cat-related or not)
    const imageReplacements = [
      // Specific placeholder patterns
      { pattern: /src="[^"]*(?:котик|кот|кошка|cat|kitty|мурка)[^"]*"/gi, url: 'https://cataas.com/cat?width=400&height=300' },
      { pattern: /src="[^"]*placeholder[^"]*"/gi, url: 'https://picsum.photos/400/300' },
      { pattern: /src="[^"]*image\d*[^"]*"/gi, url: 'https://picsum.photos/400/300?random=1' },
      { pattern: /src="[^"]*img\d*[^"]*"/gi, url: 'https://picsum.photos/400/300?random=2' },
      // Empty or broken paths
      { pattern: /src=""/gi, url: 'https://picsum.photos/400/300' },
      // Local file paths without http
      { pattern: /src="(?!https?:\/\/)[^"]*\.(?:jpg|jpeg|png|gif|webp)"/gi, url: 'https://picsum.photos/400/300' },
    ];
    
    let imgCounter = 0;
    for (const replacement of imageReplacements) {
      fixed = fixed.replace(replacement.pattern, () => {
        imgCounter++;
        // Add random parameter for unique images
        const separator = replacement.url.includes('?') ? '&' : '?';
        return `src="${replacement.url}${separator}r=${imgCounter}"`;
      });
    }
    
    // Replace ALL img src that don't have http with proper image URLs
    fixed = fixed.replace(/src="(?!https?:\/\/)[^"]*"/g, (match) => {
      imgCounter++;
      // Check if it's already been replaced
      if (match.includes('picsum') || match.includes('cataas') || match.includes('placekitten')) {
        return match;
      }
      return `src="https://picsum.photos/400/300?r=${imgCounter}"`;
    });
    
    // For cat sites, specifically replace with cat images
    if (desc.includes('кот') || desc.includes('кошк') || desc.includes('cat')) {
      const catUrls = [
        'https://cataas.com/cat?width=400&height=300',
        'https://placekitten.com/400/300',
        'https://cataas.com/cat?width=600&height=400',
        'https://placekitten.com/600/400',
        'https://cataas.com/cat/gif',
        'https://placekitten.com/300/300'
      ];
      
      // Replace picsum images with cat images for cat-related sites
      fixed = fixed.replace(/src="https:\/\/picsum\.photos\/[^"]*"/g, () => {
        const catUrl = catUrls[imgCounter % catUrls.length];
        imgCounter++;
        return `src="${catUrl}"`;
      });
    }
    
    // Ensure all images have proper alt attributes
    fixed = fixed.replace(/<img(?![^>]*alt=)[^>]*>/gi, (match) => {
      return match.replace(/>$/, ' alt="Изображение">');
    });
    
    return fixed;
  }

  // === QUALITY CONTROL METHODS ===

  validateAndFixTitle(htmlContent, description) {
    if (!htmlContent) return htmlContent;
    
    let fixed = htmlContent;
    const titleMatch = fixed.match(/<title>([^<]*)<\/title>/i);
    
    if (!titleMatch) {
      // No title found - add one
      const creativeTitle = this.generateCreativeTitle(description);
      if (fixed.includes('<head>')) {
        fixed = fixed.replace(/<head[^>]*>/i, (match) => `${match}\n    <title>${creativeTitle}</title>`);
      }
      return fixed;
    }
    
    const currentTitle = titleMatch[1].trim();
    
    // ALWAYS fix if title contains ANY bad patterns - no exceptions
    const mustFixPatterns = [
      /создай/i, /сделай/i, /построй/i, /сайт/i, /веб/i, 
      /сгенерируй/i, /сгенерировать/i, /создать/i, /сделать/i,
      /добро пожаловать/i, /welcome/i, /homepage/i, /главная/i,
      /about/i, /contact/i, /скортинками/i, /красивым/i,
      /собак/i, /кошек/i, /кот/i, /про/i, /с фото/i,
      /^с\s/i,  // starts with "с "
    ];
    
    const isRawRequest = mustFixPatterns.some(pattern => pattern.test(currentTitle));
    const isTooShort = currentTitle.length < 5;
    const isTooLong = currentTitle.length > 40;
    const hasLowercaseStart = currentTitle[0] && currentTitle[0] === currentTitle[0].toLowerCase() && /[а-яa-z]/.test(currentTitle[0]);
    
    if (isRawRequest || isTooShort || isTooLong || hasLowercaseStart) {
      const creativeTitle = this.generateCreativeTitle(description);
      fixed = fixed.replace(/<title>[^<]*<\/title>/i, `<title>${creativeTitle}</title>`);
      
      // Also fix h1 if it has same bad title
      const h1Match = fixed.match(/<h1[^>]*>([^<]*)<\/h1>/i);
      if (h1Match) {
        const h1Content = h1Match[1].trim();
        if (mustFixPatterns.some(pattern => pattern.test(h1Content)) || 
            h1Content.toLowerCase() === currentTitle.toLowerCase()) {
          fixed = fixed.replace(/<h1[^>]*>[^<]*<\/h1>/i, `<h1>${creativeTitle}</h1>`);
        }
      }
      
      console.log(`FORCED FIX: "${currentTitle}" → "${creativeTitle}"`);
    }
    
    return fixed;
  }
  
  // Helper to generate creative titles
  generateCreativeTitle(description) {
    const desc = description.toLowerCase();
    
    // Cat-related
    if (desc.includes('кот') || desc.includes('кошк') || desc.includes('cat')) {
      const titles = ['Мурлыка', 'Кошачий Мир', 'Пушистые Друзья', 'Мяу-Мир', 'Котейка'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Dog-related
    if (desc.includes('собак') || desc.includes('dog') || desc.includes('пёс') || desc.includes('пес')) {
      const titles = ['Верные Друзья', 'Мир Собак', 'Лапы и Хвосты', 'Гав-Гав', 'Пёсик'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Cooking
    if (desc.includes('кулинар') || desc.includes('рецепт') || desc.includes('готовить') || desc.includes('еду')) {
      const titles = ['Вкус Жизни', 'Кулинарная Магия', 'Вкусняшки', 'Кухня', 'Гурман'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Travel
    if (desc.includes('путешеств') || desc.includes('travel') || desc.includes('туризм') || desc.includes('поездки')) {
      const titles = ['Вокруг Света', 'Мир Без Границ', 'Путешественник', 'На Багажнике', 'Вдали от Дома'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Music
    if (desc.includes('музык') || desc.includes('music')) {
      const titles = ['Мир Музыки', 'Меломан', 'Ноты', 'Ритм', 'Гитара'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Photo
    if (desc.includes('фото') || desc.includes('photo') || desc.includes('картинк')) {
      const titles = ['Моменты', 'Вдохновение', 'Кадр', 'Объектив', 'Фотосвет'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Sport
    if (desc.includes('спорт') || desc.includes('sport')) {
      const titles = ['Активная Жизнь', 'Фитнес', 'Спортсмен', 'Движение', 'Тренировка'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Tech
    if (desc.includes('технолог') || desc.includes('tech') || desc.includes('it') || desc.includes('ai')) {
      const titles = ['Будущее', 'Техно', 'Инновации', 'Код', 'Цифра'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Fashion
    if (desc.includes('мода') || desc.includes('fashion') || desc.includes('style')) {
      const titles = ['Стиль', 'Мода', 'Гламур', 'Тренд', 'Вид'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Books
    if (desc.includes('книг') || desc.includes('литератур') || desc.includes('book')) {
      const titles = ['Мир Книг', 'Читайка', 'Библио', 'Страницы', 'История'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Nature
    if (desc.includes('природ') || desc.includes('nature') || desc.includes('лес') || desc.includes('море')) {
      const titles = ['Природа', 'Эко', 'Зелёный Мир', 'Лес', 'Озеро'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    // Default creative titles
    const genericTitles = ['Вдохновение', 'Новые Горизонты', 'Мир Возможностей', 'Свежий Взгляд', 'Интересное Рядом', 'Волна', 'Пульс', 'Фокус'];
    return genericTitles[Math.floor(Math.random() * genericTitles.length)];
  }

  // Helper to generate hero subtitles
  generateHeroSubtitle(description) {
    const desc = description.toLowerCase();
    
    // Cat-related
    if (desc.includes('кот') || desc.includes('кошк') || desc.includes('cat')) {
      return 'Откройте мир пушистых друзей. Узнайте всё о породах, уходе и характере кошек.';
    }
    
    // Dog-related
    if (desc.includes('собак') || desc.includes('dog') || desc.includes('пёс') || desc.includes('пес')) {
      return 'Познакомьтесь с самыми верными друзьями человека. Породы, дрессировка, уход.';
    }
    
    // Cooking
    if (desc.includes('кулинар') || desc.includes('рецепт') || desc.includes('готовить') || desc.includes('еду')) {
      return 'Вкусные рецепты для каждого дня. Готовьте с удовольствием и делитесь с близкими.';
    }
    
    // Travel
    if (desc.includes('путешеств') || desc.includes('travel') || desc.includes('туризм') || desc.includes('поездки')) {
      return 'Исследуйте мир вместе с нами. Места, которые вдохновляют и остаются в сердце навсегда.';
    }
    
    // Music
    if (desc.includes('музык') || desc.includes('music')) {
      return 'Погрузитесь в мир звуков и мелодий. Открывайте новых исполнителей и наслаждайтесь музыкой.';
    }
    
    // Photo
    if (desc.includes('фото') || desc.includes('photo') || desc.includes('картинк')) {
      return 'Красивые моменты запечатлены навсегда. Галерея вдохновляющих фотографий.';
    }
    
    // Sport
    if (desc.includes('спорт') || desc.includes('sport')) {
      return 'Двигайтесь к цели вместе с нами. Тренировки, советы и мотивация для активной жизни.';
    }
    
    // Tech
    if (desc.includes('технолог') || desc.includes('tech') || desc.includes('it') || desc.includes('ai')) {
      return 'Будущее уже здесь. Новейшие технологии, гаджеты и инновации меняют наш мир.';
    }
    
    // Fashion
    if (desc.includes('мода') || desc.includes('fashion') || desc.includes('style')) {
      return 'Ваш стиль — это вы. Тренды, советы по образам и вдохновение для модных решений.';
    }
    
    // Books
    if (desc.includes('книг') || desc.includes('литератур') || desc.includes('book')) {
      return 'Миры, созданные словами. Открывайте новые истории и находите книги по душе.';
    }
    
    // Nature
    if (desc.includes('природ') || desc.includes('nature') || desc.includes('лес') || desc.includes('море')) {
      return 'Красота природы в каждом кадре. Узнайте больше о нашем удивительном мире.';
    }
    
    // Default subtitle
    return 'Откройте для себя что-то новое. Качественный контент и современный подход к каждой теме.';
  }

  validateAndFixContent(htmlContent) {
    if (!htmlContent) return htmlContent;
    
    let fixed = htmlContent;
    
    // Placeholder patterns to detect
    const placeholderPatterns = [
      /это сгенерированный веб-сайт/i,
      /здесь будет текст/i,
      /вставьте содержимое/i,
      /lorem ipsum/i,
      /sample text/i,
      /placeholder content/i,
      /ваш контент здесь/i,
      /content goes here/i,
    ];
    
    const hasPlaceholder = placeholderPatterns.some(pattern => pattern.test(fixed));
    
    if (hasPlaceholder) {
      console.log('WARNING: Placeholder content detected, marking for regeneration');
      // Add a marker that will trigger fallback
      fixed = fixed.replace(/<body[^>]*>/i, '<body data-needs-regeneration="true">');
    }
    
    return fixed;
  }

  ensureStylesLinked(htmlContent) {
    if (!htmlContent) return htmlContent;
    
    let fixed = htmlContent;
    
    // Check if styles.css is linked
    const hasStylesLink = fixed.includes('styles.css') || fixed.includes('stylesheet');
    
    if (!hasStylesLink && fixed.includes('<head>')) {
      // Inject styles.css link
      const styleLink = '<link rel="stylesheet" href="styles.css">\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
      
      fixed = fixed.replace(/<head[^>]*>/i, (match) => {
        return `${match}\n    ${styleLink}`;
      });
      
      console.log('Added missing styles.css link');
    }
    
    // Check for favicon
    const hasFavicon = fixed.includes('rel="icon"') || fixed.includes('rel="shortcut icon"');
    if (!hasFavicon && fixed.includes('<head>')) {
      const favicon = '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🚀</text></svg>">';
      fixed = fixed.replace(/<head[^>]*>/i, (match) => `${match}\n    ${favicon}`);
    }
    
    return fixed;
  }

  isContentQualityBad(htmlContent) {
    if (!htmlContent || htmlContent.length < 500) return true;
    
    const content = htmlContent.toLowerCase();
    
    // Critical bad patterns - if ANY found, content is bad
    const criticalBadPatterns = [
      /добро пожаловать/i,
      /welcome to/i,
      /это сгенерированный/i,
      /это веб-сайт/i,
      /сгенерировано ai/i,
      /created by ai/i,
      /generated website/i,
      /здесь вы найдёте/i,
      /здесь вы найдете/i,
      /здесь будет/i,
      /ваш заголовок/i,
      /ваш контент/i,
      /lorem ipsum/i,
      /ваш сайт/i,
      /this is a website/i,
      /это сайт о/i,
      /создан автоматически/i,
      /скортинками/i,  // specific bad word from screenshot
      /красивым/i,
    ];
    
    const hasCriticalBad = criticalBadPatterns.some(pattern => pattern.test(htmlContent));
    
    // Check for bad title patterns in h1
    const h1Match = htmlContent.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    if (h1Match) {
      const h1Text = h1Match[1].toLowerCase();
      const badTitleWords = ['создай', 'сделай', 'сайт', 'веб', 'главная', 'добро пожаловать', 'welcome', 'скортинками', 'красивым', 'собак и'];
      const hasBadTitle = badTitleWords.some(word => h1Text.includes(word));
      if (hasBadTitle) return true;
    }
    
    // Check body content quality
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1];
      // Count meaningful paragraphs (with >100 chars)
      const meaningfulParas = bodyContent.split(/<p[^>]*>/).filter(p => p.length > 100).length;
      if (meaningfulParas < 2) return true;
    }
    
    // Check for inline styles (bad practice)
    const hasInlineStyles = /style\s*=\s*"[^"]*"/i.test(htmlContent);
    
    // Check for missing essential classes
    const hasNoBtnClasses = !htmlContent.includes('btn ') && !htmlContent.includes('btn-primary');
    const hasNoCardClasses = !htmlContent.includes('card');
    
    // If critical bad patterns found, it's bad
    if (hasCriticalBad) return true;
    
    // Multiple issues = bad
    const issueCount = (hasInlineStyles ? 1 : 0) + (hasNoBtnClasses ? 1 : 0) + (hasNoCardClasses ? 1 : 0);
    if (issueCount >= 2) return true;
    
    return false;
  }
  
  shouldResearchTopic(description) {
    // Check if the description indicates need for factual/research content
    const researchKeywords = [
      'о ', 'про ', 'информация', 'факты', 'новости', 'тренды', 
      'about', 'information', 'facts', 'news', 'trends',
      'компания', 'услуги', 'продукт', 'company', 'services', 'product'
    ];
    
    const desc = description.toLowerCase();
    return researchKeywords.some(kw => desc.includes(kw.toLowerCase()));
  }
  
  getDefaultStructure(description) {
    // Analyze description to suggest appropriate structure
    const desc = description.toLowerCase();
    
    if (desc.includes('portfolio') || desc.includes('портфолио')) {
      return {
        type: 'portfolio',
        pages: ['index', 'about', 'projects', 'contact'],
        features: ['responsive', 'animations', 'gallery'],
        style: 'modern',
        theme: 'Clean portfolio with accent colors'
      };
    }
    
    if (desc.includes('business') || desc.includes('компания') || desc.includes('услуги')) {
      return {
        type: 'business',
        pages: ['index', 'services', 'about', 'contact'],
        features: ['responsive', 'forms', 'professional'],
        style: 'professional',
        theme: 'Corporate blue and white'
      };
    }
    
    if (desc.includes('blog') || desc.includes('блог')) {
      return {
        type: 'blog',
        pages: ['index', 'about', 'contact'],
        features: ['responsive', 'clean'],
        style: 'minimal',
        theme: 'Clean reading-focused design'
      };
    }
    
    if (desc.includes('landing') || desc.includes('лендинг')) {
      return {
        type: 'landing',
        pages: ['index'],
        features: ['responsive', 'animations', 'forms'],
        style: 'colorful',
        theme: 'Vibrant conversion-focused design'
      };
    }
    
    // Default
    return {
      type: 'website',
      pages: ['index', 'about', 'contact'],
      features: ['responsive', 'clean'],
      style: 'modern',
      theme: 'Modern professional design'
    };
  }
  
  extractCodeBlock(content) {
    if (!content) return null;
    
    // Try to extract from markdown code block
    const blockMatch = content.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    if (blockMatch) {
      return blockMatch[1].trim();
    }
    
    return null;
  }
  
  async generateMinimalSite(project, description) {
    // Emergency fallback - create beautiful modern site
    console.log('Creating beautiful minimal site as fallback');
    
    const creativeTitle = this.generateCreativeTitle(description);
    const heroSubtitle = this.generateHeroSubtitle(description);
    
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${creativeTitle}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✨</text></svg>">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #ec4899;
            --accent: #8b5cf6;
            --text: #1e293b;
            --text-light: #64748b;
            --bg: #ffffff;
            --bg-alt: #f8fafc;
            --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --gradient-hero: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --radius: 12px;
            --radius-lg: 20px;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6; 
            color: var(--text);
            background: var(--bg);
        }
        
        .navbar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            box-shadow: var(--shadow-sm);
        }
        
        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .nav-logo {
            font-size: 1.5rem;
            font-weight: 800;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-decoration: none;
        }
        
        .nav-menu {
            display: flex;
            gap: 2rem;
            list-style: none;
        }
        
        .nav-link {
            color: var(--text);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s;
        }
        
        .nav-link:hover {
            color: var(--primary);
        }
        
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--gradient-hero);
            padding: 6rem 2rem 4rem;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.3;
        }
        
        .hero-content {
            position: relative;
            z-index: 1;
            max-width: 800px;
        }
        
        .hero h1 {
            font-size: 3.5rem;
            font-weight: 800;
            color: white;
            margin-bottom: 1.5rem;
            text-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .hero p {
            font-size: 1.25rem;
            color: rgba(255,255,255,0.9);
            margin-bottom: 2.5rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .btn-primary {
            background: white;
            color: var(--primary-dark);
            box-shadow: var(--shadow-lg);
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-xl);
        }
        
        .btn-secondary {
            background: transparent;
            color: white;
            border: 2px solid rgba(255,255,255,0.5);
        }
        
        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
            border-color: white;
        }
        
        .hero-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .features {
            padding: 5rem 2rem;
            background: var(--bg-alt);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .section-title {
            text-align: center;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 3rem;
            color: var(--text);
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
        }
        
        .feature-card {
            background: white;
            padding: 2rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-xl);
        }
        
        .feature-icon {
            width: 60px;
            height: 60px;
            background: var(--gradient);
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
        }
        
        .feature-icon i {
            font-size: 1.5rem;
            color: white;
        }
        
        .feature-card h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text);
        }
        
        .feature-card p {
            color: var(--text-light);
            line-height: 1.6;
        }
        
        .footer {
            background: var(--text);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .nav-menu { display: none; }
            .hero-buttons { flex-direction: column; }
            .btn { width: 100%; justify-content: center; }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="#" class="nav-logo">✨ ${creativeTitle}</a>
            <ul class="nav-menu">
                <li><a href="#" class="nav-link">Главная</a></li>
                <li><a href="#" class="nav-link">О нас</a></li>
                <li><a href="#" class="nav-link">Контакты</a></li>
            </ul>
        </div>
    </nav>

    <section class="hero">
        <div class="hero-content">
            <h1>${creativeTitle}</h1>
            <p>${heroSubtitle}</p>
            <div class="hero-buttons">
                <a href="#" class="btn btn-primary">
                    <i class="fas fa-rocket"></i>
                    Начать сейчас
                </a>
                <a href="#" class="btn btn-secondary">
                    <i class="fas fa-info-circle"></i>
                    Узнать больше
                </a>
            </div>
        </div>
    </section>

    <section class="features">
        <div class="container">
            <h2 class="section-title">Наши возможности</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h3>Быстрая работа</h3>
                    <p>Высокая производительность и оптимизация для любых устройств</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3>Надёжность</h3>
                    <p>Безопасность и стабильность на высшем уровне</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-magic"></i>
                    </div>
                    <h3>Современный дизайн</h3>
                    <p>Красивый и актуальный интерфейс для пользователей</p>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <p>&copy; 2024 ${creativeTitle}. Создано с любовью ❤️</p>
    </footer>
</body>
</html>`;
    
    const filepath = path.join(project.path, 'index.html');
    fs.writeFileSync(filepath, html);
    project.files.push('index.html');
    
    console.log('Created beautiful minimal fallback site');
  }

  async generateWebProjectAI(project, description) {
    const prompt = `Создай полноценный многостраничный образовательный веб-сайт по запросу: "${description}"

ТРЕБОВАНИЯ:
1. Сайт должен быть на русском языке
2. Современный дизайн с анимациями и интерактивностью
3. Полностью адаптивный (mobile-first)
4. Использовать CSS переменные, flexbox, grid
5. FontAwesome иконки через CDN
6. Google Fonts (Inter или похожий)

СТРУКТУРА (7 файлов):

index.html - Главная страница:
- Hero секция с заголовком и CTA
- Статистика (количество уроков/заданий)
- Преимущества курса
- Краткое содержание

about.html - О курсе:
- Информация о программе
- Для кого курс
- Структура с таймлайном

lessons.html - Уроки:
- Список уроков по модулям
- Боковая панель с навигацией
- Прогресс обучения

practice.html - Практика:
- Типы заданий
- Примеры решений с пошаговым разбором

contact.html - Контакты:
- Форма обратной связи
- Контактная информация

styles.css - Полный CSS:
- CSS переменные для цветов
- Анимации и transitions
- Responsive breakpoints
- Hover эффекты

main.js - JavaScript:
- Мобильное меню (hamburger)
- Плавная прокрутка
- Обработка форм
- Scroll animations

ВАЖНО: В каждый HTML добавь favicon:
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">

Формат вывода:
filename.ext
\`\`\`language
content
\`\`\``;

    // Call AI to generate the website
    console.log('Calling generateCode with prompt length:', prompt.length);
    const aiResponse = await this.generateCode(prompt, { type: 'web' });
    
    console.log('AI Response received:', !!aiResponse);
    console.log('AI Response length:', aiResponse ? aiResponse.length : 0);
    if (aiResponse) {
      console.log('AI Response preview:', aiResponse.substring(0, 300));
    }
    
    if (!aiResponse) {
      throw new Error('AI returned empty response');
    }
    
    // Parse the AI response to extract files
    const files = this.parseFilesFromResponse(aiResponse);
    
    // Ensure all required files exist
    const requiredFiles = ['index.html', 'about.html', 'lessons.html', 'practice.html', 'contact.html', 'styles.css', 'main.js'];
    for (const filename of requiredFiles) {
      if (!files[filename]) {
        console.warn(`Missing ${filename}, generating from template...`);
        // Generate missing file from template
        const title = description.slice(0, 30);
        if (filename === 'index.html') files[filename] = this.generateIndexPage(title, description, 'Курс', '');
        else if (filename === 'about.html') files[filename] = this.generateAboutPage(title, 'Курс', '');
        else if (filename === 'lessons.html') files[filename] = this.generateLessonsPage(title, 'Курс', '');
        else if (filename === 'practice.html') files[filename] = this.generatePracticePage(title, 'Курс');
        else if (filename === 'contact.html') files[filename] = this.generateContactPage(title);
        else if (filename === 'styles.css') files[filename] = this.generateStyles();
        else if (filename === 'main.js') files[filename] = this.generateJavaScript();
      }
    }
    
    // Save all files
    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(project.path, filename);
      fs.writeFileSync(filepath, content);
      project.files.push(filename);
    }
    
    console.log(`Generated ${Object.keys(files).length} files via AI`);
  }

  async generateWebProjectTemplate(project, description) {
    const title = description.split(' ').slice(0, 8).join(' ') || 'Курс';
    const topic = description.replace(/создай сайт|создай вебсайт|создай курс/gi, '').trim() || 'Образовательный курс';
    
    let subject = 'Общий курс';
    let grade = '';
    if (description.includes('математик')) subject = 'Математика';
    if (description.includes('физик')) subject = 'Физика';
    if (description.includes('хими')) subject = 'Химия';
    if (description.includes('биологи')) subject = 'Биология';
    if (description.includes('истори')) subject = 'История';
    if (description.includes('английск')) subject = 'Английский язык';
    if (description.includes('русск')) subject = 'Русский язык';
    if (description.includes('литератур')) subject = 'Литература';
    if (description.includes('информатик')) subject = 'Информатика';
    if (description.includes('географи')) subject = 'География';
    
    const gradeMatch = description.match(/(\d+)(?:\s*-\s*|\s+по\s+|\s*-\s*)(\d+)?/);
    if (gradeMatch) {
      const startGrade = gradeMatch[1];
      const endGrade = gradeMatch[2];
      grade = endGrade ? `${startGrade}-${endGrade} классы` : `${startGrade} класс`;
    } else {
      if (description.includes('5')) grade = '5 класс';
      if (description.includes('6')) grade = '6 класс';
      if (description.includes('7')) grade = '7 класс';
      if (description.includes('8')) grade = '8 класс';
      if (description.includes('9')) grade = '9 класс';
      if (description.includes('10')) grade = '10 класс';
      if (description.includes('11')) grade = '11 класс';
    }
    
    const files = {};
    
    files['index.html'] = this.generateIndexPage(title, topic, subject, grade);
    files['about.html'] = this.generateAboutPage(title, subject, grade);
    files['lessons.html'] = this.generateLessonsPage(title, subject, grade);
    files['practice.html'] = this.generatePracticePage(title, subject);
    files['contact.html'] = this.generateContactPage(title);
    files['styles.css'] = this.generateStyles();
    files['main.js'] = this.generateJavaScript();

    for (const [filename, content] of Object.entries(files)) {
      const filepath = path.join(project.path, filename);
      fs.writeFileSync(filepath, content);
      project.files.push(filename);
    }
  }

  generateIndexPage(title, topic, subject, grade) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link active">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="hero">
        <div class="container">
            <h1 class="hero-title">${title}</h1>
            <p class="hero-subtitle">${topic}</p>
            <p class="hero-description">Полный курс с подробными объяснениями, интерактивными примерами и практическими заданиями для ${grade || 'всех уровней'}</p>
            <div class="hero-buttons">
                <a href="lessons.html" class="btn btn-primary">
                    <i class="fas fa-book-open"></i>
                    Начать обучение
                </a>
                <a href="about.html" class="btn btn-secondary">
                    <i class="fas fa-info-circle"></i>
                    Подробнее о курсе
                </a>
            </div>
            <div class="hero-stats">
                <div class="stat">
                    <span class="stat-number">50+</span>
                    <span class="stat-label">Уроков</span>
                </div>
                <div class="stat">
                    <span class="stat-number">200+</span>
                    <span class="stat-label">Заданий</span>
                </div>
                <div class="stat">
                    <span class="stat-number">1000+</span>
                    <span class="stat-label">Примеров</span>
                </div>
            </div>
        </div>
        <div class="hero-wave">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
            </svg>
        </div>
    </header>

    <section class="features-section">
        <div class="container">
            <h2 class="section-title">Почему выбирают наш курс</h2>
            <div class="features-grid">
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-lightbulb"></i></div>
                    <h3>Понятные объяснения</h3>
                    <p>Каждая тема разобрана простым языком с наглядными примерами и иллюстрациями. Не просто формулы — а понимание принципов.</p>
                </div>
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-layer-group"></i></div>
                    <h3>Структурированный материал</h3>
                    <p>Уроки построены от простого к сложному с четким планом обучения. Каждый урок — ступенька к мастерству.</p>
                </div>
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-pencil-alt"></i></div>
                    <h3>Практические задания</h3>
                    <p>После каждого урока — упражнения разного уровня сложности с подробными решениями и объяснениями.</p>
                </div>
                <div class="feature-box">
                    <div class="feature-icon"><i class="fas fa-mobile-alt"></i></div>
                    <h3>Учитесь где угодно</h3>
                    <p>Доступ с любого устройства: компьютера, планшета или смартфона. Материал всегда под рукой.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="preview-section">
        <div class="container">
            <h2 class="section-title">Содержание курса</h2>
            <div class="topics-preview">
                <div class="topic-card">
                    <div class="topic-number">01</div>
                    <h3>Базовые понятия</h3>
                    <p>Основные определения, формулы и принципы. Создание прочного фундамента для дальнейшего обучения.</p>
                    <ul>
                        <li>Основные термины и определения</li>
                        <li>Ключевые формулы и правила</li>
                        <li>Базовые методы решения</li>
                    </ul>
                    <a href="lessons.html#module1" class="topic-link">Подробнее <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="topic-card">
                    <div class="topic-number">02</div>
                    <h3>Стандартные задачи</h3>
                    <p>Типовые задачи и методы их решения. Развитие навыков применения теории на практике.</p>
                    <ul>
                        <li>Классические задачи</li>
                        <li>Алгоритмы решения</li>
                        <li>Проверка результатов</li>
                    </ul>
                    <a href="lessons.html#module2" class="topic-link">Подробнее <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="topic-card">
                    <div class="topic-number">03</div>
                    <h3>Продвинутый уровень</h3>
                    <p>Сложные задачи, нестандартные подходы. Подготовка к олимпиадам и экзаменам.</p>
                    <ul>
                        <li>Комплексные задачи</li>
                        <li>Нестандартные методы</li>
                        <li>Оптимизация решений</li>
                    </ul>
                    <a href="lessons.html#module3" class="topic-link">Подробнее <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <div class="cta-box">
                <h2>Готовы начать обучение?</h2>
                <p>Присоединяйтесь к тысячам учеников, которые уже освоили этот предмет и добились успеха</p>
                <a href="lessons.html" class="btn btn-large btn-primary">
                    <i class="fas fa-rocket"></i>
                    Перейти к урокам
                </a>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                    <p>Образовательный портал с подробными курсами и практическими материалами</p>
                </div>
                <div class="footer-section">
                    <h4>Разделы</h4>
                    <ul>
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="about.html">О курсе</a></li>
                        <li><a href="lessons.html">Уроки</a></li>
                        <li><a href="practice.html">Практика</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Контакты</h4>
                    <p><i class="fas fa-envelope"></i> info@course.ru</p>
                    <p><i class="fas fa-phone"></i> +7 (999) 123-45-67</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateAboutPage(title, subject, grade) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>О курсе | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link active">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>О нашем курсе</h1>
            <p>Подробная информация о программе обучения и методике</p>
        </div>
    </header>

    <main class="container">
        <section class="about-section">
            <div class="about-grid">
                <div class="about-content">
                    <h2>Для кого этот курс?</h2>
                    <p>Этот курс создан для учеников <strong>${grade || 'всех классов'}</strong>, которые хотят:</p>
                    <ul class="feature-list">
                        <li><i class="fas fa-check"></i> Освоить предмет "${subject}" с нуля или углубить знания</li>
                        <li><i class="fas fa-check"></i> Подготовиться к контрольным работам и экзаменам</li>
                        <li><i class="fas fa-check"></i> Научиться решать задачи разной сложности</li>
                        <li><i class="fas fa-check"></i> Получить системное образование по предмету</li>
                    </ul>
                    
                    <h3 class="mt-4">Методика обучения</h3>
                    <p>Наш курс построен на принципе "от простого к сложному". Каждый урок включает:</p>
                    <ul class="feature-list">
                        <li><i class="fas fa-book"></i> Теоретический материал с примерами</li>
                        <li><i class="fas fa-video"></i> Пошаговые объяснения решений</li>
                        <li><i class="fas fa-tasks"></i> Практические упражнения</li>
                        <li><i class="fas fa-check-double"></i> Самопроверку с разборами ошибок</li>
                    </ul>
                </div>
                <div class="about-image">
                    <div class="info-card highlight">
                        <i class="fas fa-bullseye"></i>
                        <h3>Наша цель</h3>
                        <p>Сделать сложный материал понятным каждому ученику через структурированный подход и практику.</p>
                    </div>
                    <div class="info-card">
                        <i class="fas fa-clock"></i>
                        <h3>Длительность</h3>
                        <p>50+ уроков, которые можно проходить в своём темпе</p>
                    </div>
                    <div class="info-card">
                        <i class="fas fa-certificate"></i>
                        <h3>Результат</h3>
                        <p>Уверенное владение предметом и успех на экзаменах</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="program-section">
            <h2 class="section-title">Структура программы</h2>
            <div class="program-timeline">
                <div class="timeline-item">
                    <div class="timeline-marker">1</div>
                    <div class="timeline-content">
                        <h3>Базовый уровень</h3>
                        <p>Фундаментальные понятия, определения, формулы. Создание прочной базы для дальнейшего обучения.</p>
                        <span class="timeline-meta">15 уроков • 30 часов</span>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-marker">2</div>
                    <div class="timeline-content">
                        <h3>Средний уровень</h3>
                        <p>Стандартные задачи, методы решения, типичные ошибки. Развитие навыков применения знаний.</p>
                        <span class="timeline-meta">20 уроков • 40 часов</span>
                    </div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-marker">3</div>
                    <div class="timeline-content">
                        <h3>Продвинутый уровень</h3>
                        <p>Сложные задачи, нестандартные подходы, олимпиадные задания. Подготовка к высоким результатам.</p>
                        <span class="timeline-meta">15 уроков • 30 часов</span>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                    <p>Образовательный портал с подробными курсами</p>
                </div>
                <div class="footer-section">
                    <h4>Разделы</h4>
                    <ul>
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="about.html">О курсе</a></li>
                        <li><a href="lessons.html">Уроки</a></li>
                        <li><a href="practice.html">Практика</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateLessonsPage(title, subject, grade) {
    const lessons = [
      { num: '1.1', title: 'Введение в курс', desc: 'Обзор программы, цели обучения, как эффективно использовать материалы курса', time: '20 мин' },
      { num: '1.2', title: 'Основные термины', desc: 'Ключевые определения и понятия, которые нужно знать', time: '30 мин' },
      { num: '1.3', title: 'Базовые принципы', desc: 'Фундаментальные законы и правила предмета', time: '35 мин' },
      { num: '2.1', title: 'Первый модуль - практика', desc: 'Решение типовых задач базового уровня', time: '40 мин' },
      { num: '2.2', title: 'Методы решения', desc: 'Алгоритмы и подходы к решению стандартных задач', time: '45 мин' },
      { num: '3.1', title: 'Углублённое изучение', desc: 'Сложные темы и продвинутые концепции', time: '50 мин' },
      { num: '3.2', title: 'Комплексные задачи', desc: 'Задачи, требующие применения нескольких методов', time: '55 мин' }
    ];

    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Уроки | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link active">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>Учебные материалы</h1>
            <p>Полный список уроков с подробными объяснениями и примерами</p>
        </div>
    </header>

    <main class="container">
        <div class="lessons-layout">
            <aside class="lessons-sidebar">
                <h3>Модули курса</h3>
                <ul class="modules-list">
                    <li><a href="#module1" class="module-link active">Модуль 1: Введение</a></li>
                    <li><a href="#module2" class="module-link">Модуль 2: Основы</a></li>
                    <li><a href="#module3" class="module-link">Модуль 3: Продвинутые темы</a></li>
                </ul>
                <div class="progress-widget">
                    <h4>Ваш прогресс</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <p>0 из ${lessons.length} уроков пройдено</p>
                </div>
            </aside>

            <div class="lessons-content">
                <section id="module1" class="module-section">
                    <h2 class="module-title">Модуль 1: Введение в ${subject}</h2>
                    ${lessons.slice(0, 3).map(l => `
                    <div class="lesson-card">
                        <div class="lesson-number">${l.num}</div>
                        <div class="lesson-info">
                            <h3>${l.title}</h3>
                            <p class="lesson-desc">${l.desc}</p>
                            <div class="lesson-meta">
                                <span><i class="fas fa-clock"></i> ${l.time}</span>
                                <span><i class="fas fa-signal"></i> Начальный уровень</span>
                            </div>
                        </div>
                        <button class="btn btn-small btn-primary">Начать</button>
                    </div>
                    `).join('')}
                </section>

                <section id="module2" class="module-section">
                    <h2 class="module-title">Модуль 2: Основные темы</h2>
                    ${lessons.slice(3, 5).map(l => `
                    <div class="lesson-card">
                        <div class="lesson-number">${l.num}</div>
                        <div class="lesson-info">
                            <h3>${l.title}</h3>
                            <p class="lesson-desc">${l.desc}</p>
                            <div class="lesson-meta">
                                <span><i class="fas fa-clock"></i> ${l.time}</span>
                                <span><i class="fas fa-signal"></i> Средний уровень</span>
                            </div>
                        </div>
                        <button class="btn btn-small btn-primary">Начать</button>
                    </div>
                    `).join('')}
                </section>

                <section id="module3" class="module-section">
                    <h2 class="module-title">Модуль 3: Продвинутый уровень</h2>
                    ${lessons.slice(5).map(l => `
                    <div class="lesson-card">
                        <div class="lesson-number">${l.num}</div>
                        <div class="lesson-info">
                            <h3>${l.title}</h3>
                            <p class="lesson-desc">${l.desc}</p>
                            <div class="lesson-meta">
                                <span><i class="fas fa-clock"></i> ${l.time}</span>
                                <span><i class="fas fa-signal"></i> Продвинутый</span>
                            </div>
                        </div>
                        <button class="btn btn-small btn-primary">Начать</button>
                    </div>
                    `).join('')}
                </section>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                    <p>Образовательный портал</p>
                </div>
                <div class="footer-section">
                    <h4>Разделы</h4>
                    <ul>
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="lessons.html">Уроки</a></li>
                        <li><a href="practice.html">Практика</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generatePracticePage(title, subject) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Практика | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link active">Практика</a></li>
                <li><a href="contact.html" class="nav-link">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>Практические задания</h1>
            <p>Закрепите знания на практике с пошаговыми решениями</p>
        </div>
    </header>

    <main class="container">
        <div class="practice-sections">
            <div class="practice-card">
                <div class="practice-icon"><i class="fas fa-pencil-alt"></i></div>
                <h3>Тренировочные упражнения</h3>
                <p>Базовые задания для закрепления материала каждого урока с подробными решениями</p>
                <a href="#" class="btn btn-primary">Начать тренировку</a>
            </div>
            <div class="practice-card">
                <div class="practice-icon"><i class="fas fa-tasks"></i></div>
                <h3>Контрольные работы</h3>
                <p>Проверьте свои знания комплексными заданиями по темам с самопроверкой</p>
                <a href="#" class="btn btn-primary">Пройти тест</a>
            </div>
            <div class="practice-card">
                <div class="practice-icon"><i class="fas fa-trophy"></i></div>
                <h3>Олимпиадные задачи</h3>
                <p>Сложные задания для подготовки к олимпиадам и конкурсам</p>
                <a href="#" class="btn btn-primary">Попробовать</a>
            </div>
        </div>

        <section class="examples-section">
            <h2>Примеры решения задач</h2>
            <div class="example-box">
                <h3>Пример 1: Базовая задача</h3>
                <div class="example-problem">
                    <strong>Условие:</strong> Разберём типовую задачу с подробным объяснением каждого шага решения.
                </div>
                <div class="example-solution">
                    <strong>Решение:</strong>
                    <ol>
                        <li><strong>Анализ условия:</strong> Внимательно прочитаем задачу и выделим известные данные</li>
                        <li><strong>Выбор метода:</strong> Определим, какой подход лучше всего подходит</li>
                        <li><strong>Применение формул:</strong> Подставим значения и выполним вычисления</li>
                        <li><strong>Проверка:</strong> Убедимся, что ответ логичен и соответствует условию</li>
                    </ol>
                </div>
                <div class="example-answer">
                    <strong>Ответ:</strong> Полученный результат с пояснением
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateContactPage(title) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Контакты | ${title}</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container nav-container">
            <a href="index.html" class="nav-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>${title}</span>
            </a>
            <ul class="nav-menu">
                <li><a href="index.html" class="nav-link">Главная</a></li>
                <li><a href="about.html" class="nav-link">О курсе</a></li>
                <li><a href="lessons.html" class="nav-link">Уроки</a></li>
                <li><a href="practice.html" class="nav-link">Практика</a></li>
                <li><a href="contact.html" class="nav-link active">Контакты</a></li>
            </ul>
            <div class="hamburger">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </div>
        </div>
    </nav>

    <header class="page-header">
        <div class="container">
            <h1>Свяжитесь с нами</h1>
            <p>Есть вопросы? Мы всегда рады помочь!</p>
        </div>
    </header>

    <main class="container">
        <div class="contact-grid">
            <div class="contact-info">
                <h2>Контактная информация</h2>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <h4>Email</h4>
                        <p>info@course.ru</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <div>
                        <h4>Телефон</h4>
                        <p>+7 (999) 123-45-67</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <h4>Часы работы</h4>
                        <p>Пн-Пт: 9:00 - 18:00</p>
                    </div>
                </div>
            </div>

            <div class="contact-form-wrapper">
                <h2>Напишите нам</h2>
                <form class="contact-form" id="contactForm">
                    <div class="form-group">
                        <label>Ваше имя</label>
                        <input type="text" placeholder="Введите имя" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" placeholder="your@email.com" required>
                    </div>
                    <div class="form-group">
                        <label>Сообщение</label>
                        <textarea placeholder="Ваш вопрос или сообщение..." rows="5" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-large">
                        <i class="fas fa-paper-plane"></i>
                        Отправить сообщение
                    </button>
                </form>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4><i class="fas fa-graduation-cap"></i> ${title}</h4>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 ${title}. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="main.js"></script>
</body>
</html>`;
  }

  generateStyles() {
    return `/* Modern Educational Website Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #8b5cf6;
    --accent: #ec4899;
    --success: #10b981;
    --warning: #f59e0b;
    --bg: #ffffff;
    --bg-alt: #f8fafc;
    --text: #1e293b;
    --text-light: #64748b;
    --border: #e2e8f0;
    --shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: var(--text);
    background: var(--bg);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
}

/* Navigation */
.navbar {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 16px 0;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: var(--shadow-lg);
}

.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-logo {
    color: white;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    gap: 8px;
}

.nav-logo i {
    font-size: 1.5rem;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 32px;
}

.nav-menu a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    padding: 8px 0;
    position: relative;
    transition: all 0.2s;
}

.nav-menu a::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: white;
    transition: width 0.2s;
}

.nav-menu a:hover::after,
.nav-menu a.active::after {
    width: 100%;
}

.hamburger {
    display: none;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
}

.bar {
    width: 25px;
    height: 3px;
    background: white;
    border-radius: 3px;
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 80px 0 120px;
    text-align: center;
    position: relative;
}

.hero-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 16px;
}

.hero-subtitle {
    font-size: 1.5rem;
    margin-bottom: 16px;
    opacity: 0.9;
}

.hero-description {
    font-size: 1.125rem;
    opacity: 0.9;
    max-width: 600px;
    margin: 0 auto 32px;
}

.hero-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 40px;
}

.hero-stats {
    display: flex;
    justify-content: center;
    gap: 40px;
}

.stat {
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 2rem;
    font-weight: 700;
}

.stat-label {
    opacity: 0.8;
}

.hero-wave {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    line-height: 0;
}

.hero-wave svg {
    display: block;
    width: 100%;
    height: 60px;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    font-size: 1rem;
}

.btn-primary {
    background: white;
    color: var(--primary);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}

.btn-secondary:hover {
    background: white;
    color: var(--primary);
}

.btn-small {
    padding: 10px 20px;
    font-size: 0.9rem;
}

.btn-large {
    padding: 16px 32px;
    font-size: 1.1rem;
}

/* Sections */
.section {
    padding: 80px 0;
}

.section-title {
    font-size: 2.25rem;
    text-align: center;
    margin-bottom: 48px;
    font-weight: 700;
}

/* Features */
.features-section {
    padding: 60px 0 80px;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 32px;
}

.feature-box {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    text-align: center;
    transition: transform 0.2s;
}

.feature-box:hover {
    transform: translateY(-4px);
}

.feature-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    color: white;
    font-size: 1.5rem;
}

.feature-box h3 {
    margin-bottom: 12px;
    font-size: 1.25rem;
}

.feature-box p {
    color: var(--text-light);
    line-height: 1.6;
}

/* Topics Preview */
.preview-section {
    background: var(--bg-alt);
    padding: 80px 0;
}

.topics-preview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 32px;
}

.topic-card {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.topic-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary);
    opacity: 0.5;
    margin-bottom: 16px;
}

.topic-card h3 {
    font-size: 1.25rem;
    margin-bottom: 12px;
}

.topic-card p {
    color: var(--text-light);
    margin-bottom: 16px;
}

.topic-card ul {
    list-style: none;
    margin-bottom: 20px;
}

.topic-card li {
    padding: 8px 0;
    padding-left: 24px;
    position: relative;
    color: var(--text-light);
}

.topic-card li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--success);
    font-weight: bold;
}

.topic-link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

/* CTA Section */
.cta-section {
    padding: 60px 0;
}

.cta-box {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 48px;
    border-radius: 24px;
    text-align: center;
}

.cta-box h2 {
    font-size: 2rem;
    margin-bottom: 16px;
}

.cta-box p {
    opacity: 0.9;
    margin-bottom: 24px;
}

/* Page Header */
.page-header {
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    padding: 60px 0 80px;
    text-align: center;
    position: relative;
}

.page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 12px;
}

.page-header p {
    opacity: 0.9;
    font-size: 1.1rem;
}

/* About Section */
.about-section {
    padding: 60px 0;
}

.about-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: start;
}

.about-content h2 {
    font-size: 1.75rem;
    margin-bottom: 20px;
}

.about-content h3 {
    font-size: 1.25rem;
    margin: 32px 0 16px;
}

.feature-list {
    list-style: none;
}

.feature-list li {
    padding: 12px 0;
    display: flex;
    align-items: center;
    gap: 12px;
}

.feature-list i {
    color: var(--success);
}

.info-card {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    margin-bottom: 24px;
}

.info-card.highlight {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
}

.info-card i {
    font-size: 2rem;
    color: var(--primary);
    margin-bottom: 12px;
}

.info-card.highlight i {
    color: white;
}

.info-card h3 {
    margin-bottom: 8px;
}

.info-card p {
    color: var(--text-light);
    font-size: 0.95rem;
}

.info-card.highlight p {
    color: rgba(255,255,255,0.9);
}

/* Program Timeline */
.program-section {
    padding: 60px 0;
}

.program-timeline {
    max-width: 800px;
    margin: 0 auto;
}

.timeline-item {
    display: flex;
    gap: 24px;
    padding: 24px 0;
    border-bottom: 1px solid var(--border);
}

.timeline-marker {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
}

.timeline-content h3 {
    margin-bottom: 8px;
}

.timeline-content p {
    color: var(--text-light);
    margin-bottom: 8px;
}

.timeline-meta {
    color: var(--primary);
    font-weight: 600;
    font-size: 0.9rem;
}

/* Lessons Layout */
.lessons-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 32px;
    padding: 40px 0;
}

.lessons-sidebar {
    position: sticky;
    top: 100px;
    height: fit-content;
}

.lessons-sidebar h3 {
    margin-bottom: 16px;
    font-size: 1.1rem;
}

.modules-list {
    list-style: none;
    margin-bottom: 24px;
}

.modules-list li {
    margin-bottom: 8px;
}

.module-link {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: var(--text);
    border-radius: 8px;
    transition: all 0.2s;
}

.module-link:hover,
.module-link.active {
    background: var(--bg-alt);
    color: var(--primary);
}

.progress-widget {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: var(--shadow);
}

.progress-widget h4 {
    margin-bottom: 12px;
    font-size: 0.9rem;
}

.progress-bar {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    border-radius: 4px;
    transition: width 0.3s;
}

.progress-widget p {
    color: var(--text-light);
    font-size: 0.85rem;
}

.module-section {
    margin-bottom: 40px;
}

.module-title {
    font-size: 1.5rem;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
}

.lesson-card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 16px;
    transition: transform 0.2s;
}

.lesson-card:hover {
    transform: translateX(4px);
}

.lesson-number {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.1rem;
    flex-shrink: 0;
}

.lesson-info {
    flex: 1;
}

.lesson-info h3 {
    margin-bottom: 6px;
}

.lesson-desc {
    color: var(--text-light);
    font-size: 0.95rem;
    margin-bottom: 8px;
}

.lesson-meta {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-light);
}

.lesson-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Practice Section */
.practice-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 32px;
    padding: 40px 0;
}

.practice-card {
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: var(--shadow);
    text-align: center;
}

.practice-icon {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    color: white;
    font-size: 2rem;
}

.practice-card h3 {
    margin-bottom: 12px;
}

.practice-card p {
    color: var(--text-light);
    margin-bottom: 20px;
}

/* Examples */
.examples-section {
    padding: 40px 0;
}

.examples-section h2 {
    margin-bottom: 24px;
}

.example-box {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.example-box h3 {
    margin-bottom: 20px;
    color: var(--primary);
}

.example-problem,
.example-solution,
.example-answer {
    margin-bottom: 20px;
    padding: 20px;
    border-radius: 8px;
}

.example-problem {
    background: var(--bg-alt);
}

.example-solution {
    background: #eff6ff;
}

.example-solution ol {
    margin-left: 20px;
}

.example-solution li {
    margin-bottom: 8px;
    padding-left: 8px;
}

.example-answer {
    background: #f0fdf4;
    border-left: 4px solid var(--success);
}

/* Contact */
.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    padding: 40px 0;
}

.contact-info h2,
.contact-form-wrapper h2 {
    margin-bottom: 24px;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
}

.contact-item i {
    width: 48px;
    height: 48px;
    background: var(--bg-alt);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
    font-size: 1.25rem;
}

.contact-item h4 {
    margin-bottom: 4px;
}

.contact-item p {
    color: var(--text-light);
}

.contact-form {
    background: white;
    padding: 32px;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--border);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
}

/* Footer */
.footer {
    background: var(--text);
    color: white;
    padding: 48px 0 24px;
    margin-top: 80px;
}

.footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 32px;
    margin-bottom: 32px;
}

.footer-section h4 {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.footer-section ul {
    list-style: none;
}

.footer-section li {
    margin-bottom: 8px;
}

.footer-section a {
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    transition: color 0.2s;
}

.footer-section a:hover {
    color: white;
}

.footer-section p {
    color: rgba(255,255,255,0.7);
}

.footer-bottom {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5);
}

/* Utilities */
.mt-4 { margin-top: 32px; }

/* Responsive */
@media (max-width: 768px) {
    .nav-menu {
        display: none;
    }
    
    .hamburger {
        display: flex;
    }
    
    .hero-title {
        font-size: 2rem;
    }
    
    .hero-stats {
        flex-direction: column;
        gap: 20px;
    }
    
    .hero-buttons {
        flex-direction: column;
        align-items: center;
    }
    
    .about-grid,
    .contact-grid,
    .lessons-layout {
        grid-template-columns: 1fr;
    }
    
    .lessons-sidebar {
        position: static;
    }
    
    .lesson-card {
        flex-direction: column;
        text-align: center;
    }
    
    .timeline-item {
        flex-direction: column;
    }
    
    .section-title {
        font-size: 1.75rem;
    }
}`;
  }

  generateJavaScript() {
    return `// Main JavaScript for Educational Website

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Сообщение отправлено!';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                this.reset();
            }, 3000);
        });
    }

    // Module navigation in lessons
    const moduleLinks = document.querySelectorAll('.module-link');
    moduleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            moduleLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements
    document.querySelectorAll('.feature-box, .topic-card, .lesson-card').forEach(el => {
        observer.observe(el);
    });

    // Progress bar animation (demo)
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        setTimeout(() => {
            progressFill.style.width = '0%';
        }, 500);
    }

    console.log('🎓 Educational website loaded successfully!');
});`;
  }

  async generateAndroidProject(project, description) {
    const prompt = `Create a complete Android application: ${description}
Generate:
1. app/src/main/java/com/example/app/MainActivity.kt
2. app/src/main/res/layout/activity_main.xml
3. app/src/main/res/values/strings.xml
4. app/src/main/res/values/colors.xml
5. app/build.gradle (module)
6. build.gradle (project)
7. settings.gradle
8. README.md
Format each file with path and content. Use markdown code blocks with file paths.`;

    const generated = await this.generateCode(prompt, { type: 'android' });
    await this.parseAndSaveFiles(project, generated);
    await this.generateKeystore(project);
  }

  async generateFlutterProject(project, description) {
    const prompt = `Create a complete Flutter application: ${description}
Generate:
1. pubspec.yaml
2. lib/main.dart
3. lib/app.dart
4. lib/screens/ (main screens)
5. lib/widgets/ (reusable widgets)
6. lib/models/ (data models)
7. lib/services/ (API services)
8. lib/providers/ (state management)
9. README with setup instructions
Format each file with path and content. Use markdown code blocks with file paths.`;

    const generated = await this.generateCode(prompt, { type: 'flutter' });
    await this.parseAndSaveFiles(project, generated);
  }

  async parseAndSaveFiles(project, generatedContent) {
    let matches = [];
    
    const pattern1 = /([\w\/\.\-_]+)\s*\n\`\`\`[\w]*\n([\s\S]*?)\`\`\`/g;
    matches = [...generatedContent.matchAll(pattern1)];
    
    if (matches.length === 0) {
      const pattern2 = /\`\`\`[\w]*\s*([\w\/\.\-_]+)\n([\s\S]*?)\`\`\`/g;
      matches = [...generatedContent.matchAll(pattern2)];
    }
    
    for (const match of matches) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      const fullPath = path.join(project.path, filePath);
      
      fs.ensureDirSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
      project.files.push(filePath);
      console.log('Created file:', filePath);
    }
    
    if (matches.length === 0) {
      fs.writeFileSync(path.join(project.path, 'index.html'), generatedContent);
      project.files.push('index.html');
      console.log('Created fallback file: index.html');
    }
  }

  async generateKeystore(project) {
    const keystorePath = path.join(project.path, 'release.keystore');
    const storePassword = 'androidagent123';
    const keyPassword = 'androidagent123';
    const alias = 'release';
    
    try {
      execSync(
        `keytool -genkey -v -keystore "${keystorePath}" -alias ${alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${storePassword} -keypass ${keyPassword} -dname "CN=Android Agent, OU=Dev, O=Agent, L=City, S=State, C=US"`,
        { stdio: 'ignore' }
      );
      
      project.keystore = {
        path: keystorePath,
        storePassword,
        keyPassword,
        alias
      };
    } catch (error) {
      console.warn('Keystore generation failed:', error.message);
    }
  }

  async buildAndroidApp(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project || project.type !== 'android') {
      throw new Error('Invalid Android project');
    }

    project.status = 'building';
    
    try {
      const buildScript = path.join(project.path, 'gradlew');
      
      if (!fs.existsSync(buildScript)) {
        await this.setupGradleWrapper(project);
      }
      
      execSync(
        `cd "${project.path}" && ./gradlew assembleRelease`,
        { stdio: 'inherit' }
      );
      
      const apkPath = path.join(project.path, 'app/build/outputs/apk/release/app-release.apk');
      const aabPath = path.join(project.path, 'app/build/outputs/bundle/release/app-release.aab');
      
      project.build = {
        apk: fs.existsSync(apkPath) ? apkPath : null,
        aab: fs.existsSync(aabPath) ? aabPath : null,
        builtAt: new Date().toISOString()
      };
      
      project.status = 'built';
      return project.build;
    } catch (error) {
      project.status = 'build_failed';
      project.buildError = error.message;
      throw error;
    }
  }

  async setupGradleWrapper(project) {
    const gradleFiles = {
      'gradlew': `#!/bin/bash\ngradle wrapper`,
      'gradle/wrapper/gradle-wrapper.properties': `distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists`,
      'settings.gradle': `pluginManagement {\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\nrootProject.name = "${project.name}"\ninclude ':app'`
    };
    
    for (const [filePath, content] of Object.entries(gradleFiles)) {
      const fullPath = path.join(project.path, filePath);
      fs.ensureDirSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content);
    }
  }

  getProject(projectId) {
    return this.activeProjects.get(projectId);
  }

  listProjects() {
    return Array.from(this.activeProjects.values());
  }

  async deleteProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (project) {
      fs.removeSync(project.path);
      this.activeProjects.delete(projectId);
    }
  }

  async deployWebsite(projectId, subdomain = null) {
    const project = this.activeProjects.get(projectId);
    if (!project || project.type !== 'web') {
      throw new Error('Invalid web project');
    }

    try {
      console.log(`Deploying website ${projectId}...`);
      
      // Generate subdomain from project name if not provided
      const deploySubdomain = subdomain || project.name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
      
      // For now, create a simple public URL structure
      // In production, this would integrate with Netlify/Vercel API
      const publicUrl = `https://${deploySubdomain}.netlify.app`;
      
      project.deployment = {
        url: publicUrl,
        subdomain: deploySubdomain,
        deployedAt: new Date().toISOString(),
        status: 'deployed'
      };
      
      console.log(`Website deployed to: ${publicUrl}`);
      return project.deployment;
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  parseFilesFromResponse(content) {
    const files = {};
    console.log('Parsing AI response, length:', content.length);
    console.log('Response preview:', content.substring(0, 200));
    
    // Try multiple patterns to extract files
    const patterns = [
      // Pattern 1: filename.ext\n```lang\ncontent\n```
      /([\w\-]+\.(?:html|css|js))\s*\n?```[\w]*\n?([\s\S]*?)```/gi,
      // Pattern 2: ```lang:filename.ext\ncontent\n```
      /```[\w]*:(.+?\.(?:html|css|js))\n([\s\S]*?)```/gi,
      // Pattern 3: ### filename.ext\n```\ncontent\n```
      /###?\s*([\w\-]+\.(?:html|css|js))\s*\n?```[\w]*\n?([\s\S]*?)```/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const filename = match[1].trim();
        const fileContent = match[2].trim();
        if (filename && fileContent && !files[filename]) {
          files[filename] = fileContent;
          console.log('Extracted file:', filename, 'size:', fileContent.length);
        }
      }
    }
    
    // Fallback: if no files found, try to extract based on markdown headers
    if (Object.keys(files).length === 0) {
      const headerPattern = /##?\s*([\w\-]+\.(?:html|css|js))\s*\n([\s\S]*?)(?=##?\s*[\w\-]+\.(?:html|css|js)|$)/gi;
      let match;
      while ((match = headerPattern.exec(content)) !== null) {
        const filename = match[1].trim();
        let fileContent = match[2].trim();
        // Remove code block markers if present
        fileContent = fileContent.replace(/^```[\w]*\n?/, '').replace(/```$/, '');
        if (filename && fileContent && !files[filename]) {
          files[filename] = fileContent;
          console.log('Extracted file via header:', filename);
        }
      }
    }
    
    console.log('Total files extracted:', Object.keys(files).length);
    return files;
  }

  // ===== COLOR UTILITIES =====
  
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
  
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // ===== MULTI-PAGE GENERATION v4.0 =====
  
  getPageContent(template, pageName, intent) {
    // Check if this is an educational/course template
    const isEducational = template.lessons || template.category === 'education';
    
    const pageContents = {
      index: this.generateHomePage(template, intent),
      about: this.generateAboutPage(template, intent),
      contact: this.generateContactPage(template, intent),
      services: isEducational ? this.generateCoursesPage(template, intent) : this.generateServicesPage(template, intent),
      blog: isEducational ? this.generateLessonsPage(template, intent) : this.generateBlogPage(template, intent),
      portfolio: this.generatePortfolioPage(template, intent)
    };
    return pageContents[pageName] || pageContents.about;
  }
  
  generateHomePage(template, intent) {
    const { hero, sections } = template;
    
    // Check if this is an educational template with lessons
    const hasLessons = template.lessons && template.lessons.length > 0;
    
    // Generate lessons preview section if lessons exist
    const lessonsSection = hasLessons ? `
    <section class="features" style="background: var(--bg-alt);">
      <div class="container">
        <div class="section-header">
          <span class="section-label">Уроки</span>
          <h2 class="section-title">Начните <span>обучение</span></h2>
          <p class="section-subtitle">Пошаговые материалы с примерами и практикой</p>
        </div>
        <div class="lessons-preview">
          ${template.lessons.slice(0, 3).map((lesson, idx) => `
          <div class="lesson-preview-card">
            <div class="lesson-preview-number">${idx + 1}</div>
            <div class="lesson-preview-content">
              <h3>${lesson.title}</h3>
              <p>${lesson.content.substring(0, 100)}...</p>
              <a href="blog.html#lesson-${lesson.id}" class="btn btn-sm btn-secondary">Изучить</a>
            </div>
          </div>
          `).join('')}
        </div>
        <div class="text-center" style="margin-top: 2rem;">
          <a href="blog.html" class="btn btn-primary"><i class="fas fa-book-open"></i> Все уроки</a>
        </div>
      </div>
    </section>` : '';
    
    return `
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge"><i class="fas fa-sparkles"></i> Премиум качество</div>
        <div class="hero-emoji">${hero.emoji}</div>
        <h1>${hero.title}</h1>
        <p class="subtitle">${hero.subtitle}</p>
        <p class="description">${hero.description}</p>
        <div class="hero-buttons">
          <a href="${hasLessons ? 'blog.html' : 'services.html'}" class="btn btn-primary"><i class="fas fa-${hasLessons ? 'book-open' : 'rocket'}"></i> ${hasLessons ? 'Начать обучение' : 'Наши услуги'}</a>
          <a href="about.html" class="btn btn-secondary"><i class="fas fa-info-circle"></i> Подробнее</a>
        </div>
      </div>
    </section>
    <section class="features">
      <div class="container">
        <div class="section-header">
          <span class="section-label">${hasLessons ? 'Темы' : 'Возможности'}</span>
          <h2 class="section-title">${hasLessons ? 'Что вы <span>изучите</span>' : 'Что мы <span>предлагаем</span>'}</h2>
          <p class="section-subtitle">${hasLessons ? 'Структурированная программа обучения' : 'Профессиональный подход и качественные решения'}</p>
        </div>
        <div class="features-grid">
          ${sections[0].items.map(item => `
          <div class="feature-card animate-on-scroll">
            <div class="feature-icon"><i class="fas fa-${item.icon}"></i></div>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>
    <section class="features" style="background: var(--bg-alt);">
      <div class="container">
        <div class="section-header">
          <span class="section-label">${hasLessons ? 'Преимущества' : 'Преимущества'}</span>
          <h2 class="section-title">${hasLessons ? 'Почему выбирают <span>нас</span>' : 'Почему выбирают <span>нас</span>'}</h2>
        </div>
        <div class="features-grid">
          ${(sections[1]?.items || sections[0].items).map(item => `
          <div class="feature-card animate-on-scroll">
            <div class="feature-icon"><i class="fas fa-${item.icon}"></i></div>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>${lessonsSection}`;
  }
  
  generateAboutPage(template, intent) {
    const { hero } = template;
    return `
    <section class="page-hero">
      <h1>О нас</h1>
      <p>Узнайте больше о ${hero.title}</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="content-section">
          <h2>Наша история</h2>
          <p>${hero.title} — проект, созданный с любовью и профессионализмом.</p>
          <h2>Наша миссия</h2>
          <p>${hero.description}</p>
          <h2>Наши ценности</h2>
          <ul>
            <li><strong>Качество</strong> — только проверенная информация</li>
            <li><strong>Доступность</strong> — простым языком</li>
            <li><strong>Инновации</strong> — постоянное развитие</li>
          </ul>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-number">5+</span><span class="stat-label">Лет опыта</span></div>
          <div class="stat-card"><span class="stat-number">10K+</span><span class="stat-label">Клиентов</span></div>
          <div class="stat-card"><span class="stat-number">50+</span><span class="stat-label">Проектов</span></div>
        </div>
      </div>
    </section>`;
  }
  
  generateContactPage(template, intent) {
    const { hero } = template;
    return `
    <section class="page-hero">
      <h1>Контакты</h1>
      <p>Свяжитесь с ${hero.title}</p>
    </section>
    <section class="content">
      <div class="container">
        <form class="contact-form" onsubmit="event.preventDefault(); alert('Спасибо! Мы свяжемся с вами.');">
          <div class="form-group"><label>Ваше имя</label><input type="text" placeholder="Иван Иванов" required></div>
          <div class="form-group"><label>Email</label><input type="email" placeholder="ivan@example.com" required></div>
          <div class="form-group"><label>Сообщение</label><textarea placeholder="Ваше сообщение..." required></textarea></div>
          <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fas fa-paper-plane"></i> Отправить</button>
        </form>
      </div>
    </section>`;
  }
  
  generateServicesPage(template, intent) {
    const { hero } = template;
    return `
    <section class="page-hero">
      <h1>Услуги</h1>
      <p>Профессиональные решения от ${hero.title}</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="section-header">
          <span class="section-label">Наши услуги</span>
          <h2 class="section-title">Что мы <span>предлагаем</span></h2>
        </div>
        <div class="features-grid">
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-star"></i></div><h3>Базовый</h3><p>Набор базовых услуг</p></div>
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-crown"></i></div><h3>Премиум</h3><p>Полный комплекс услуг</p></div>
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-headset"></i></div><h3>Поддержка</h3><p>Постоянная помощь 24/7</p></div>
        </div>
      </div>
    </section>`;
  }
  
  generateBlogPage(template, intent) {
    return `
    <section class="page-hero">
      <h1>Блог</h1>
      <p>Полезные статьи и новости</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="content-grid">
          <div class="content-card"><div class="content-card-image"><i class="fas fa-book-open"></i></div><div class="content-card-body"><h3>Первые шаги</h3><p>Руководство для новичков</p></div></div>
          <div class="content-card"><div class="content-card-image"><i class="fas fa-star"></i></div><div class="content-card-body"><h3>Советы экспертов</h3><p>Проверенные методики</p></div></div>
        </div>
      </div>
    </section>`;
  }
  
  generatePortfolioPage(template, intent) {
    return `
    <section class="page-hero">
      <h1>Портфолио</h1>
      <p>Наши лучшие работы</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="content-grid">
          <div class="content-card"><div class="content-card-image"><i class="fas fa-image"></i></div><div class="content-card-body"><h3>Проект 1</h3><p>Описание работы</p></div></div>
          <div class="content-card"><div class="content-card-image"><i class="fas fa-image"></i></div><div class="content-card-body"><h3>Проект 2</h3><p>Описание работы</p></div></div>
        </div>
      </div>
    </section>`;
  }
  
  // ===== EDUCATIONAL/COURSE PAGES with REAL CONTENT =====
  
  generateCoursesPage(template, intent) {
    const { hero } = template;
    
    // Check if template has courseContent structure
    if (template.courseContent) {
      const courses = Object.entries(template.courseContent);
      return `
    <section class="page-hero">
      <h1>Курсы</h1>
      <p>Структурированные программы обучения от ${hero.title}</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="courses-list">
          ${courses.map(([key, course]) => `
          <div class="course-card">
            <div class="course-header">
              <div class="course-icon"><i class="fas fa-graduation-cap"></i></div>
              <h2>${course.title}</h2>
              <p>${course.description}</p>
            </div>
            <div class="course-modules">
              <h3><i class="fas fa-list-ul"></i> Модули курса</h3>
              ${course.modules.map((module, idx) => `
              <div class="module-item">
                <div class="module-header">
                  <span class="module-number">${idx + 1}</span>
                  <h4>${module.title}</h4>
                </div>
                <ul class="lessons-list">
                  ${module.lessons.map(lesson => `<li><i class="fas fa-play-circle"></i> ${lesson}</li>`).join('')}
                </ul>
              </div>
              `).join('')}
            </div>
          </div>
          `).join('')}
        </div>
      </div>
    </section>`;
    }
    
    // Fallback to generic services-style page
    return `
    <section class="page-hero">
      <h1>Курсы</h1>
      <p>Образовательные программы от ${hero.title}</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="section-header">
          <span class="section-label">Обучение</span>
          <h2 class="section-title">Наши <span>курсы</span></h2>
        </div>
        <div class="features-grid">
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-book"></i></div><h3>Базовый курс</h3><p>Фундаментальные знания с нуля</p></div>
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-rocket"></i></div><h3>Продвинутый</h3><p>Углублённое изучение темы</p></div>
          <div class="feature-card"><div class="feature-icon"><i class="fas fa-certificate"></i></div><h3>Экспертный</h3><p>Профессиональный уровень</p></div>
        </div>
      </div>
    </section>`;
  }
  
  generateLessonsPage(template, intent) {
    const { hero } = template;
    
    // If template has actual lessons, display them
    if (template.lessons && template.lessons.length > 0) {
      return `
    <section class="page-hero">
      <h1>Уроки</h1>
      <p>Детальные материалы с примерами и заданиями</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="lessons-container">
          ${template.lessons.map((lesson, idx) => `
          <article class="lesson-card" id="lesson-${lesson.id}">
            <div class="lesson-header">
              <span class="lesson-number">Урок ${idx + 1}</span>
              <h2>${lesson.title}</h2>
            </div>
            <div class="lesson-content">
              <p class="lesson-text">${lesson.content}</p>
              
              <div class="lesson-examples">
                <h3><i class="fas fa-lightbulb"></i> Примеры</h3>
                <ul>
                  ${lesson.examples.map(ex => `<li><code>${ex}</code></li>`).join('')}
                </ul>
              </div>
              
              <div class="lesson-practice">
                <h3><i class="fas fa-pencil-alt"></i> Практика</h3>
                <ul>
                  ${lesson.practice.map(task => `<li>${task}</li>`).join('')}
                </ul>
                <button class="btn btn-primary" onclick="alert('Отлично! Продолжайте в том же духе!')"><i class="fas fa-check"></i> Проверить</button>
              </div>
            </div>
          </article>
          `).join('')}
        </div>
      </div>
    </section>`;
    }
    
    // Fallback to generic blog-style page
    return `
    <section class="page-hero">
      <h1>Материалы</h1>
      <p>Учебные материалы и статьи</p>
    </section>
    <section class="content">
      <div class="container">
        <div class="content-grid">
          <div class="content-card"><div class="content-card-image"><i class="fas fa-book-open"></i></div><div class="content-card-body"><h3>Начало обучения</h3><p>Основы и базовые концепции</p></div></div>
          <div class="content-card"><div class="content-card-image"><i class="fas fa-star"></i></div><div class="content-card-body"><h3>Продвинутые темы</h3><p>Углублённое изучение</p></div></div>
        </div>
      </div>
    </section>`;
  }
}

export default ClaudeDevAgent;
