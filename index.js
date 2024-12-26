// --- Configuration ---
const defaultConfig = {
    apiToken: 'YOUR_API_TOKEN',
    requestUrl: 'YOUR_REQUEST_URL',
    modelName: 'YOUR_MODEL_NAME',
    maxTokens: 4096,
    inputFieldName: 'VocabKanji',
    temperature: 0.7,
    topP: 0.7,
    topK: 50,
    frequencyPenalty: 0.5,
    stopSequences: [],
    enableCache: true,
    promptTemplate: '你是一名日本の小説家，请根据日语单词生成一篇小说，必须用日语进行回答，只生成简短的小说，不产生其他内容:\n\n{vocab_list}',
    noteTypeName: 'Basic',
    outputFieldName: 'Reading',
    addToCard: true,
    deckName: 'Default'
};

// AnkiConnect の設定を更新する関数
async function updateAnkiConnectConfig() {
    try {
        // 首先尝试简单的请求来测试连接
        const testResponse = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'version',
                version: 6
            })
        });
        
        if (!testResponse.ok) {
            throw new Error('无法连接到 AnkiConnect');
        }

        // 更新 CORS 配置
        const configResponse = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'updateConfig',
                version: 6,
                params: {
                    webCorsOriginList: [
                        "http://localhost:3000",
                        "http://127.0.0.1:3000"
                    ]
                }
            })
        });

        if (!configResponse.ok) {
            throw new Error('配置更新失败');
        }

        const result = await configResponse.json();
        console.log('AnkiConnect config updated:', result);

        return true;
    } catch (error) {
        console.error('Error updating AnkiConnect config:', error);
        showStatusMessage('请确保：\n1. Anki 已启动\n2. AnkiConnect 插件已安装\n3. 允许了连接权限', 'error');
        return false;
    }
}

// 状态消息显示函数
function showStatusMessage(message, type = 'success') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.innerHTML = message.replace(/\n/g, '<br>');
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // 如果是错误消息，延长显示时间
    const displayTime = type === 'error' ? 10000 : 5000;
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, displayTime);
}

// 添加 Markdown 渲染库
const markdownScript = document.createElement('script');
markdownScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
document.head.appendChild(markdownScript);

class AIService {
    constructor() {
        this.cache = new Map();
        this.config = null;
        this.initialized = false;
        this.ankiConnectUrl = 'http://127.0.0.1:8765';
        this.articles = [];
        this.init();
    }

    async loadConfig() {
        try {
            // 首先尝试从 localStorage 加载配置
            const savedConfig = localStorage.getItem('aiConfig');
            if (savedConfig) {
                this.config = JSON.parse(savedConfig);
                console.log('Configuration loaded from localStorage:', this.config);
                return;
            }

            // 如果 localStorage 中没有，则尝试从文件加载
            const response = await fetch('config.json');
            this.config = await response.json();
            console.log('Configuration loaded from file:', this.config);
        } catch (error) {
            console.error('Error loading config:', error);
            // 如果加载失败，使用默认配置
            this.config = {
                api_token: '',
                request_url: '',
                model_name: '',
                max_tokens: 4096,
                input_field_name: '',
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
                frequency_penalty: 0.5,
                stop_sequences: [],
                enable_cache: true,
                prompt_template: '',
                note_type_name: '',
                output_field_name: '',
                add_to_card: false,
                deck_name: ''
            };
            showStatusMessage('使用默认配置', 'warning');
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('aiConfig', JSON.stringify(this.config));
            console.log('Configuration saved to localStorage');
            showStatusMessage('配置已保存');
        } catch (error) {
            console.error('Error saving config:', error);
            showStatusMessage('保存配置失败', 'error');
        }
    }

    async loadCache() {
        try {
            // 从 localStorage 加载缓存
            const savedCache = localStorage.getItem('aiCache');
            if (savedCache) {
                this.cache = new Map(Object.entries(JSON.parse(savedCache)));
                console.log('Cache loaded from localStorage:', this.cache);
            }
        } catch (error) {
            console.error('Error loading cache:', error);
            this.cache = new Map();
        }
    }

    saveCache() {
        try {
            const cacheData = Object.fromEntries(this.cache);
            localStorage.setItem('aiCache', JSON.stringify(cacheData));
            console.log('Cache saved to localStorage');
        } catch (error) {
            console.error('Error saving cache:', error);
            showStatusMessage('保存缓存失败', 'error');
        }
    }

    async init() {
        try {
            await this.loadConfig();
            await this.loadCache();
            
            // 测试 AnkiConnect 连接
            const response = await fetch(this.ankiConnectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'version',
                    version: 6
                })
            });
            
            if (!response.ok) {
                throw new Error('无法连接到 AnkiConnect');
            }
            
            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            
            this.initialized = true;
            showStatusMessage('连接成功');
        } catch (error) {
            console.error('Initialization error:', error);
            showStatusMessage('初始化失败，请确保 Anki 已启动', 'error');
        }
    }

    async getTodayLearnedCards() {
        if (!this.initialized) {
            showStatusMessage('系统未完成初始化，请稍后重试', 'error');
            return [];
        }

        try {
            const response = await fetch(this.ankiConnectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'findCards',
                    version: 6,
                    params: {
                        query: 'rated:1'
                    }
                })
            });

            const { result: cardIds } = await response.json();
            console.log('Found card IDs:', cardIds);

            if (!cardIds || cardIds.length === 0) {
                showStatusMessage('今日没有学习的卡片', 'error');
                return [];
            }

            const cardsInfo = await this.getCardsInfo(cardIds);
            console.log('Cards info:', cardsInfo);

            const vocabList = cardsInfo
                .map(card => {
                    const vocab = card.fields[this.config.input_field_name]?.value;
                    // 移除 HTML 标签
                    return vocab ? vocab.replace(/<[^>]*>/g, '') : null;
                })
                .filter(Boolean);
            
            console.log('Extracted vocab list:', vocabList);
            return vocabList;
        } catch (error) {
            console.error('Error getting today\'s learned cards:', error);
            showStatusMessage('获取今日学习卡片失败', 'error');
            return [];
        }
    }

    async getCardsInfo(cardIds) {
        try {
            const response = await fetch(this.ankiConnectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'cardsInfo',
                    version: 6,
                    params: {
                        cards: cardIds
                    }
                })
            });
            const result = await response.json();
            return result.result || [];
        } catch (error) {
            console.error('Error getting cards info:', error);
            showStatusMessage('获取卡片信息失败', 'error');
            return [];
        }
    }

    async generateArticle(vocabList) {
        const vocabStr = vocabList.join(', ');
        console.log('Generating article for vocab:', vocabStr);
        
        // 创建进度条
        const progressBar = document.createElement('progress');
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            border: none;
            background: #f0f0f0;
            z-index: 1000;
        `;
        document.body.appendChild(progressBar);
        
        try {
            const prompt = this.config.prompt_template.replace('{vocab_list}', vocabStr);
            console.log('Using prompt:', prompt);
            progressBar.value = 20;

            showStatusMessage('正在发送请求到 AI 服务...');
            const response = await fetch(this.config.request_url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.api_token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.model_name,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    stream: false,
                    max_tokens: this.config.max_tokens,
                    temperature: this.config.temperature,
                    top_p: this.config.top_p,
                    top_k: this.config.top_k,
                    frequency_penalty: this.config.frequency_penalty,
                    stop: this.config.stop_sequences
                })
            });

            progressBar.value = 60;
            const data = await response.json();
            console.log('API response:', data);

            if (!response.ok) {
                throw new Error(`API 请求失败: ${data.error?.message || '未知错误'}`);
            }

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const generatedText = data.choices[0].message.content;
                progressBar.value = 80;
                
                if (this.config.enable_cache) {
                    this.cache.set(vocabStr, generatedText);
                    this.saveCache();  // 保存缓存到 localStorage
                }
                
                // 添加到文章列表
                const date = new Date().toISOString().split('T')[0];
                const article = {
                    id: Date.now(),
                    date,
                    vocabList,  // 保存原始单词列表
                    content: generatedText,  // 保存生成的文章内容
                    saved: false
                };
                this.articles.unshift(article);
                this.updateArticlesList();
                
                progressBar.value = 100;
                setTimeout(() => progressBar.remove(), 1000);
                showStatusMessage('文章生成成功');
                return { result: generatedText };
            }
            
            throw new Error('API 响应格式不正确');
        } catch (error) {
            progressBar.remove();
            console.error('Article generation error:', error);
            showStatusMessage(`生成文章失败: ${error.message}`, 'error');
            return { error: error.message };
        }
    }

    async addNoteWithArticle(article) {
        try {
            const response = await fetch(this.ankiConnectUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'addNote',
                    version: 6,
                    params: {
                        note: {
                            deckName: this.config.deck_name,
                            modelName: this.config.note_type_name,
                            fields: {
                                [this.config.output_field_name]: article
                            },
                            options: {
                                allowDuplicate: false
                            },
                            tags: ['ai_reading_gen']
                        }
                    }
                })
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            showStatusMessage('文章添加成功');
            return true;
        } catch (error) {
            console.error('Error adding note:', error);
            showStatusMessage('添加笔记失败', 'error');
            return false;
        }
    }

    updateArticlesList() {
        const container = document.getElementById('articlesList') || this.createArticlesContainer();
        container.innerHTML = this.articles.map(article => `
            <div class="article-item" data-id="${article.id}">
                <div class="article-header" onclick="window.app.toggleArticle(${article.id})">
                    <span class="article-date">${article.date}</span>
                    <span class="article-vocab">${article.vocabList.join(', ')}</span>
                    <div class="article-actions">
                        <button onclick="event.stopPropagation(); window.app.saveArticle(${article.id})" 
                                class="action-button ${article.saved ? 'saved' : ''}">
                            ${article.saved ? '已保存' : '保存'}
                        </button>
                        <button onclick="event.stopPropagation(); window.app.deleteArticle(${article.id})" 
                                class="action-button delete">删除</button>
                    </div>
                </div>
                <div class="article-content" id="article-${article.id}" style="display: none;">
                    <div class="markdown-content"></div>
                </div>
            </div>
        `).join('');

        // 添加样式
        const style = document.createElement('style');
        style.textContent += `
            .article-item {
                background: white;
                border-radius: 8px;
                margin-bottom: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            .article-header {
                padding: 16px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8f9fa;
                border-bottom: 1px solid #eee;
                transition: background-color 0.3s;
            }

            .article-header:hover {
                background: #f0f0f0;
            }

            .article-date {
                color: #666;
                font-size: 14px;
                min-width: 100px;
            }

            .article-vocab {
                color: #333;
                font-size: 14px;
                margin: 0 16px;
                flex-grow: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .article-content {
                padding: 20px;
                background: white;
                transition: all 0.3s ease;
            }

            .markdown-content {
                line-height: 1.6;
                font-size: 16px;
                color: #333;
            }

            .markdown-content h1 {
                font-size: 24px;
                margin-bottom: 16px;
                color: #2c3e50;
            }

            .markdown-content h2 {
                font-size: 20px;
                margin: 16px 0;
                color: #34495e;
            }

            .markdown-content p {
                margin: 12px 0;
            }

            .article-actions {
                display: flex;
                gap: 8px;
            }

            .action-button {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s;
            }

            .action-button:not(.saved) {
                background-color: #4CAF50;
                color: white;
            }

            .action-button:not(.saved):hover {
                background-color: #45a049;
            }

            .action-button.saved {
                background-color: #ccc;
                cursor: default;
            }

            .action-button.delete {
                background-color: #f44336;
                color: white;
            }

            .action-button.delete:hover {
                background-color: #da190b;
            }
        `;
        document.head.appendChild(style);
    }

    createArticlesContainer() {
        const container = document.createElement('div');
        container.id = 'articlesList';
        container.className = 'articles-container';
        document.getElementById('app').appendChild(container);
        return container;
    }

    async saveArticle(id) {
        const article = this.articles.find(a => a.id === id);
        if (!article) return;

        const content = `# 生成的阅读文章 - ${article.date}\n\n## 使用的单词\n${article.vocabList.join(', ')}\n\n## 文章内容\n\n${article.content}`;
        
        try {
            // 创建 Blob 对象
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reading_${article.date}.md`;
            
            // 添加到文档并触发点击
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
            
            // 更新文章状态
            article.saved = true;
            this.updateArticlesList();
            showStatusMessage('文章保存成功');
        } catch (error) {
            console.error('Save error:', error);
            showStatusMessage('保存失败', 'error');
        }
    }

    deleteArticle(id) {
        if (confirm('确定要删除这篇文章吗？')) {
            this.articles = this.articles.filter(a => a.id !== id);
            this.updateArticlesList();
            showStatusMessage('文章已删除');
        }
    }
}

class ConfigDialog {
    constructor(aiService) {
        this.aiService = aiService;
        this.dialog = null;
        this.overlay = null;
    }

    createDialog() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'config-dialog';
        dialog.innerHTML = `
            <h2>AI 服务配置</h2>
            <form id="configForm">
                <div class="form-fields">
                    <div>
                        <label>API Token:</label>
                        <input type="text" id="api_token" value="${this.aiService.config.api_token || ''}">
                    </div>
                    <div>
                        <label>请求 URL:</label>
                        <input type="text" id="request_url" value="${this.aiService.config.request_url || ''}">
                    </div>
                    <div>
                        <label>模型名称:</label>
                        <input type="text" id="model_name" value="${this.aiService.config.model_name || ''}">
                    </div>
                    <div>
                        <label>最大 Token 数:</label>
                        <input type="number" id="max_tokens" value="${this.aiService.config.max_tokens || 4096}">
                    </div>
                    <div>
                        <label>输入字段名:</label>
                        <input type="text" id="input_field_name" value="${this.aiService.config.input_field_name || ''}">
                    </div>
                    <div>
                        <label>温度:</label>
                        <input type="number" id="temperature" step="0.1" min="0" max="1" value="${this.aiService.config.temperature || 0.7}">
                    </div>
                    <div>
                        <label>Top P:</label>
                        <input type="number" id="top_p" step="0.1" min="0" max="1" value="${this.aiService.config.top_p || 0.7}">
                    </div>
                    <div>
                        <label>Top K:</label>
                        <input type="number" id="top_k" value="${this.aiService.config.top_k || 50}">
                    </div>
                    <div>
                        <label>频率惩罚:</label>
                        <input type="number" id="frequency_penalty" step="0.1" min="0" max="2" value="${this.aiService.config.frequency_penalty || 0.5}">
                    </div>
                    <div>
                        <label>停止序列:</label>
                        <input type="text" id="stop_sequences" value="${(this.aiService.config.stop_sequences || []).join(', ')}">
                    </div>
                    <div>
                        <label>启用缓存:</label>
                        <input type="checkbox" id="enable_cache" ${this.aiService.config.enable_cache ? 'checked' : ''}>
                    </div>
                    <div>
                        <label>提示模板:</label>
                        <textarea id="prompt_template" rows="4">${this.aiService.config.prompt_template || ''}</textarea>
                    </div>
                    <div>
                        <label>笔记类型名称:</label>
                        <input type="text" id="note_type_name" value="${this.aiService.config.note_type_name || ''}">
                    </div>
                    <div>
                        <label>输出字段名:</label>
                        <input type="text" id="output_field_name" value="${this.aiService.config.output_field_name || ''}">
                    </div>
                    <div>
                        <label>添加到卡片:</label>
                        <input type="checkbox" id="add_to_card" ${this.aiService.config.add_to_card ? 'checked' : ''}>
                    </div>
                    <div>
                        <label>牌组名称:</label>
                        <input type="text" id="deck_name" value="${this.aiService.config.deck_name || ''}">
                    </div>
                </div>
                <div class="buttons">
                    <button type="submit">保存</button>
                    <button type="button" class="cancel">取消</button>
                </div>
            </form>
        `;

        return dialog;
    }

    show() {
        this.dialog = this.createDialog();
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.dialog);

        const form = this.dialog.querySelector('#configForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });

        this.dialog.querySelector('.cancel').addEventListener('click', () => {
            this.close();
        });

        // 点击遮罩层关闭对话框
        this.overlay.addEventListener('click', () => {
            this.close();
        });
    }

    close() {
        if (this.dialog) {
            this.dialog.remove();
            this.overlay.remove();
            this.dialog = null;
            this.overlay = null;
        }
    }

    saveConfig() {
        this.aiService.config.api_token = this.dialog.querySelector('#api_token').value;
        this.aiService.config.request_url = this.dialog.querySelector('#request_url').value;
        this.aiService.config.model_name = this.dialog.querySelector('#model_name').value;
        this.aiService.config.max_tokens = parseInt(this.dialog.querySelector('#max_tokens').value);
        this.aiService.config.input_field_name = this.dialog.querySelector('#input_field_name').value;
        this.aiService.config.temperature = parseFloat(this.dialog.querySelector('#temperature').value);
        this.aiService.config.top_p = parseFloat(this.dialog.querySelector('#top_p').value);
        this.aiService.config.top_k = parseInt(this.dialog.querySelector('#top_k').value);
        this.aiService.config.frequency_penalty = parseFloat(this.dialog.querySelector('#frequency_penalty').value);
        this.aiService.config.stop_sequences = this.dialog.querySelector('#stop_sequences').value.split(',').map(s => s.trim());
        this.aiService.config.enable_cache = this.dialog.querySelector('#enable_cache').checked;
        this.aiService.config.prompt_template = this.dialog.querySelector('#prompt_template').value;
        this.aiService.config.note_type_name = this.dialog.querySelector('#note_type_name').value;
        this.aiService.config.output_field_name = this.dialog.querySelector('#output_field_name').value;
        this.aiService.config.add_to_card = this.dialog.querySelector('#add_to_card').checked;
        this.aiService.config.deck_name = this.dialog.querySelector('#deck_name').value;

        this.aiService.saveConfig();
        this.close();
    }
}

class AIReadingGen {
    constructor() {
        this.aiService = new AIService();
        this.configDialog = new ConfigDialog(this.aiService);
    }

    async generateArticle() {
        if (!this.aiService.initialized) {
            showStatusMessage('系统未完成初始化，请确保 Anki 已启动并重试', 'error');
            return;
        }

        const vocabList = await this.aiService.getTodayLearnedCards();
        if (vocabList.length === 0) {
            showStatusMessage('今日没有学习的卡片', 'error');
            return;
        }

        showStatusMessage('正在生成文章...');
        const result = await this.aiService.generateArticle(vocabList);
        if (result.error) {
            showStatusMessage(result.error, 'error');
            return;
        }

        // 根据配置决定是否添加到 Anki
        if (this.aiService.config.add_to_card) {
            const success = await this.aiService.addNoteWithArticle(result.result);
            if (success) {
                showStatusMessage('文章生成并添加到 Anki 成功！');
            } else {
                showStatusMessage('文章生成成功，但添加到 Anki 失败', 'error');
            }
        } else {
            showStatusMessage('文章生成成功！');
        }
    }

    showConfig() {
        this.configDialog.show();
    }
}

// 合并所有样式
const style = document.createElement('style');
style.textContent = `
    progress {
        -webkit-appearance: none;
        appearance: none;
    }
    progress::-webkit-progress-bar {
        background-color: #f0f0f0;
    }
    progress::-webkit-progress-value {
        background-color: #4CAF50;
        transition: width 0.3s ease;
    }

    .articles-container {
        margin-top: 20px;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
    }

    .article-item {
        background: white;
        border-radius: 8px;
        margin-bottom: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .article-header {
        padding: 16px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
    }

    .article-date {
        color: #666;
        font-size: 14px;
    }

    .article-vocab {
        color: #333;
        font-size: 14px;
        margin: 0 16px;
        flex-grow: 1;
    }

    .article-content {
        padding: 16px;
        background: #f9f9f9;
    }

    .article-actions {
        display: flex;
        gap: 8px;
    }

    .action-button {
        padding: 4px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.3s;
    }

    .action-button:not(.saved) {
        background-color: #4CAF50;
        color: white;
    }

    .action-button.saved {
        background-color: #ccc;
        cursor: default;
    }

    .action-button.delete {
        background-color: #f44336;
        color: white;
    }

    .markdown-content {
        line-height: 1.6;
        font-size: 16px;
    }

    .markdown-content h1 {
        font-size: 24px;
        margin-bottom: 16px;
    }

    .markdown-content h2 {
        font-size: 20px;
        margin: 16px 0;
    }

    .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        overflow-y: auto;
    }

    .config-dialog {
        background: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        margin: auto;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        position: relative;
    }

    .config-dialog h2 {
        margin: 0 0 24px 0;
        padding-bottom: 12px;
        border-bottom: 1px solid #eee;
        font-size: 20px;
        color: #333;
    }

    .config-dialog form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .config-dialog div {
        margin-bottom: 0;
    }

    .config-dialog label {
        display: block;
        margin-bottom: 6px;
        color: #555;
        font-size: 14px;
        font-weight: 500;
    }

    .config-dialog input:not([type="checkbox"]),
    .config-dialog textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.5;
        box-sizing: border-box;
        transition: border-color 0.3s;
    }

    .config-dialog input:not([type="checkbox"]):focus,
    .config-dialog textarea:focus {
        border-color: #4CAF50;
        outline: none;
    }

    .config-dialog textarea {
        min-height: 100px;
        resize: vertical;
    }

    /* 复选框容器的样式 */
    .config-dialog div:has(> input[type="checkbox"]) {
        display: flex;
        align-items: center;
        padding: 4px 0;
        min-height: 28px;
        gap: 8px;
    }

    .config-dialog div:has(> input[type="checkbox"]) label {
        margin: 0;
        line-height: 1.4;
    }

    /* 按钮区域样式 */
    .config-dialog .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #eee;
    }

    .config-dialog button {
        padding: 8px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s;
    }

    .config-dialog button[type="submit"] {
        background-color: #4CAF50;
        color: white;
    }

    .config-dialog button[type="submit"]:hover {
        background-color: #45a049;
    }

    .config-dialog button.cancel {
        background-color: #f44336;
        color: white;
    }

    .config-dialog button.cancel:hover {
        background-color: #da190b;
    }

    /* 滚动条样式 */
    .config-dialog::-webkit-scrollbar {
        width: 8px;
    }

    .config-dialog::-webkit-scrollbar-track {
        background: #f5f5f5;
        border-radius: 4px;
    }

    .config-dialog::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
    }

    .config-dialog::-webkit-scrollbar-thumb:hover {
        background: #999;
    }

    @media (max-height: 700px) {
        .config-dialog {
            max-height: 90vh;
        }
    }

    #statusMessage {
        z-index: 9998;
    }

    progress {
        z-index: 9997;
    }

    .config-dialog input[type="checkbox"] {
        width: auto;
        vertical-align: middle;
    }

    /* 复选框容器的样式 */
    .config-dialog div:has(> input[type="checkbox"]) {
        display: flex;
        align-items: center;
        padding: 4px 0;
        min-height: 28px;
        gap: 8px;
    }

    .config-dialog div:has(> input[type="checkbox"]) label {
        margin: 0;
        line-height: 1.4;
    }
`;

// 确保样式只添加一次
if (!document.querySelector('#aiConfigStyles')) {
    style.id = 'aiConfigStyles';
    document.head.appendChild(style);
}

// 创建全局应用实例
const app = new AIReadingGen();

// 添加全局函数
window.generateArticle = () => app.generateArticle();
window.showConfig = () => app.configDialog.show();
window.app = {
    toggleArticle: (id) => {
        const content = document.getElementById(`article-${id}`);
        const article = app.aiService.articles.find(a => a.id === id);
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            // 使用 marked 渲染 Markdown
            const markdown = marked.parse(
                `# 生成的阅读文章\n\n` +
                `## 使用的单词\n${article.vocabList.join(', ')}\n\n` +
                `## 文章内容\n${article.content}`
            );
            content.querySelector('.markdown-content').innerHTML = markdown;
            
            // 添加平滑滚动动画
            content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            content.style.display = 'none';
        }
    },
    saveArticle: (id) => app.aiService.saveArticle(id),
    deleteArticle: (id) => app.aiService.deleteArticle(id)
};

// 等待 marked 库加载完成
if (typeof marked === 'undefined') {
    window.addEventListener('load', () => {
        if (typeof marked === 'undefined') {
            console.error('Marked library not loaded');
            showStatusMessage('Markdown 渲染库加载失败', 'error');
        }
    });
} 