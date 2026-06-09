// 大纲助手 — 核心交互逻辑（打磨版）

(function() {
    'use strict';

    // ==================== 主题配置 ====================
    const THEMES = {
        idea: {
            bgStart: '#f3e7fa', bgEnd: '#fce4ec',
            accent: '#ce93d8', text: '#4a148c',
            card: 'rgba(206, 147, 216, 0.15)'
        },
        inspiration: {
            bgStart: '#e0f7fa', bgEnd: '#e8f5e9',
            accent: '#80cbc4', text: '#004d40',
            card: 'rgba(128, 203, 196, 0.15)'
        },
        map: {
            bgStart: '#e8eaf6', bgEnd: '#e1f5fe',
            accent: '#7986cb', text: '#1a237e',
            card: 'rgba(121, 134, 203, 0.15)'
        }
    };

    // ==================== 示例灵感 ====================
    const SAMPLE_INSPIRATIONS = [
        { text: '替身文学', category: 'genre', sample: true },
        { text: '追妻火葬场', category: 'plot', sample: true },
        { text: '重生打脸', category: 'genre', sample: true },
        { text: '真千金回归', category: 'setting', sample: true },
        { text: '豪门联姻', category: 'setting', sample: true },
        { text: '白月光黑化', category: 'character', sample: true },
    ];

    // ==================== 状态 ====================
    let currentPanel = 'idea';
    let inspirations = JSON.parse(localStorage.getItem('oa_inspirations') || '[]');
    let selectedInspirations = new Set();
    let ideaConversation = [];
    let isAITyping = false;

    // ==================== Toast通知 ====================
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ==================== 主题切换 ====================
    function switchTheme(themeName) {
        const theme = THEMES[themeName];
        const root = document.documentElement;
        root.style.setProperty('--current-bg-start', theme.bgStart);
        root.style.setProperty('--current-bg-end', theme.bgEnd);
        root.style.setProperty('--current-accent', theme.accent);
        root.style.setProperty('--current-text', theme.text);
        root.style.setProperty('--current-card', theme.card);
    }

    // ==================== 面板切换 ====================
    function switchPanel(targetPanel) {
        if (targetPanel === currentPanel) return;

        const panels = document.querySelectorAll('.panel');
        panels.forEach(p => p.classList.remove('panel-active'));
        document.getElementById('panel-' + targetPanel).classList.add('panel-active');

        const bubbles = document.querySelectorAll('.bubble');
        bubbles.forEach(b => {
            b.classList.remove('bubble-active');
            if (b.dataset.target === targetPanel) {
                b.classList.add('bubble-active');
            }
        });

        switchTheme(targetPanel);
        currentPanel = targetPanel;

        // 切换到地图面板时始终重新渲染（确保数据同步）
        if (targetPanel === 'map' && window.MapViz) {
            setTimeout(() => window.MapViz.refresh(), 100);
        }
    }

    // ==================== 气泡导航 ====================
    function initBubbles() {
        document.querySelectorAll('.bubble').forEach(bubble => {
            bubble.addEventListener('click', () => switchPanel(bubble.dataset.target));
        });
        document.getElementById('bubble-idea').classList.add('bubble-active');
    }

    // ==================== AI API调用 ====================
    async function callAI(systemPrompt, messages) {
        if (!window.AI_CONFIG.isConfigured()) {
            openSettings();
            showToast('请先配置AI API（点击右上角齿轮⚙）', 'error');
            return null;
        }

        const allMessages = [{ role: 'system', content: systemPrompt }, ...messages];

        try {
            const response = await fetch(window.AI_CONFIG.getRequestUrl(), {
                method: 'POST',
                headers: window.AI_CONFIG.getHeaders(),
                body: JSON.stringify({
                    model: window.AI_CONFIG.model,
                    messages: allMessages,
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error('API错误 (' + response.status + ')');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            showToast('AI调用失败: ' + error.message, 'error');
            return null;
        }
    }

    // ==================== Markdown渲染 ====================
    function renderMarkdown(text) {
        // 移除地图数据JSON块和相关标题（用户不需要看到）
        let clean = text.replace(/【可提取的地图元素】[\s\S]*$/g, '');
        clean = clean.replace(/```json\s*[\s\S]*?```/g, '');
        // 移除末尾残留的空行
        clean = clean.replace(/\n{3,}/g, '\n\n').trim();

        return clean
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/gm, function(match) {
                if (match.startsWith('<h') || match.startsWith('<ul') || match.startsWith('<li') || match.startsWith('</')) return match;
                return '<p>' + match + '</p>';
            })
            .replace(/<p><\/p>/g, '')
            .replace(/<ul><\/ul>/g, '')
            .replace(/<\/ul><ul>/g, '');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== 打字机效果 ====================
    async function typeAIMessage(container, content) {
        const rendered = renderMarkdown(content);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rendered;
        const messageDiv = container.querySelector('.message-content');

        // 逐段显示（不是逐字，而是一段一段出现）
        const children = Array.from(tempDiv.children);
        messageDiv.innerHTML = '';

        for (let i = 0; i < children.length; i++) {
            const clone = children[i].cloneNode(true);
            clone.style.opacity = '0';
            clone.style.transform = 'translateY(8px)';
            clone.style.transition = 'all 0.3s ease';
            messageDiv.appendChild(clone);

            await new Promise(r => setTimeout(r, 50));
            clone.style.opacity = '1';
            clone.style.transform = 'translateY(0)';

            // 滚动到底部
            const chatArea = document.getElementById('idea-chat');
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }

    // ==================== 想法梳理 — 聊天 ====================
    function addChatMessage(role, content) {
        const chatArea = document.getElementById('idea-chat');
        const welcome = chatArea.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        const div = document.createElement('div');
        div.className = 'chat-message ' + role;

        if (role === 'user') {
            div.innerHTML = '<div class="message-content">' + escapeHtml(content) + '</div>';
            chatArea.appendChild(div);
        } else {
            div.innerHTML = '<div class="ai-avatar">✦</div><div class="message-content"></div>';
            chatArea.appendChild(div);
            return typeAIMessage(div, content);
        }

        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function showLoading() {
        const chatArea = document.getElementById('idea-chat');
        const loading = document.createElement('div');
        loading.className = 'chat-loading';
        loading.id = 'chat-loading';
        loading.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chatArea.appendChild(loading);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function hideLoading() {
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
    }

    // ==================== 从AI回复中提取地图数据 ====================
    function extractMapData(text) {
        // 方法1：找 ```json 代码块
        let jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1].trim());
                if (data.phases || data.threads || data.events) return normalizeMapData(data);
            } catch(e) {}
        }

        // 方法2：找任何看起来像地图JSON的 { } 块
        const jsonBlocks = text.match(/\{[\s\S]*?"(?:threads|phases|events)"[\s\S]*?\}/g);
        if (jsonBlocks) {
            for (const block of jsonBlocks) {
                try {
                    const data = JSON.parse(block);
                    if (data.phases || data.threads || data.events) return normalizeMapData(data);
                } catch(e) {}
            }
        }

        // 方法3：兜底 — 不再自动从箭头链碎片化提取
        // 只提取故事线标签，不提取事件（避免碎片化）
        const threads = [];
        const threadPatterns = [
            /(?:主线|主线剧情|核心线)/g,
            /(?:感情线|爱情线|恋爱线|CP线)/g,
            /(?:事业线|成长线|升级线)/g,
            /(?:悬疑线|阴谋线|暗线)/g,
            /(?:友情线|兄弟线|师徒线)/g,
        ];
        const threadTypes = ['main', 'romance', 'career', 'mystery', 'friendship'];
        threadPatterns.forEach(function(pat, i) {
            if (pat.test(text)) {
                threads.push({ id: threadTypes[i], label: threadTypes[i] === 'main' ? '主线' : threadTypes[i] === 'romance' ? '感情线' : threadTypes[i] === 'career' ? '事业线' : threadTypes[i] === 'mystery' ? '悬疑线' : '友情线', type: threadTypes[i] });
            }
        });

        if (threads.length > 0) {
            console.log('[地图提取] 兜底：只提取到', threads.length, '条故事线，无事件');
            return {
                title: '故事大纲',
                tagline: '',
                phases: [],
                threads: threads,
                events: [],
                contradictions: [],
                missing: []
            };
        }

        console.log('[地图提取] 未找到可提取的地图数据');
        return null;
    }

    // 标准化地图数据（统一格式）
    function normalizeMapData(data) {
        return {
            title: data.title || '故事大纲',
            tagline: data.tagline || '',
            phases: data.phases || [],
            threads: data.threads || [],
            events: (data.events || []).map(function(e) {
                return { id: e.id, label: e.label, phase: e.phase || 'act1', thread: e.thread || 'main', desc: e.desc || '' };
            }),
            contradictions: (data.contradictions || []).map(function(c) {
                return typeof c === 'string' ? { text: c } : c;
            }),
            missing: (data.missing || []).map(function(m) {
                return typeof m === 'string' ? { text: m } : m;
            })
        };
    }

    // 手动提取（给按钮用，返回新格式）
    function manualExtractFromText(text) {
        var threads = [];
        var threadMap = {
            '主线': { id: 'main', type: 'main' },
            '感情线': { id: 'romance', type: 'romance' },
            '爱情线': { id: 'romance', type: 'romance' },
            '事业线': { id: 'career', type: 'career' },
            '成长线': { id: 'career', type: 'career' },
            '悬疑线': { id: 'mystery', type: 'mystery' },
            '友情线': { id: 'friendship', type: 'friendship' },
        };
        Object.keys(threadMap).forEach(function(keyword) {
            if (text.includes(keyword)) {
                var t = threadMap[keyword];
                if (!threads.find(function(x) { return x.id === t.id; })) {
                    threads.push({ id: t.id, label: keyword, type: t.type });
                }
            }
        });

        if (threads.length === 0) {
            threads.push({ id: 'main', label: '主线', type: 'main' });
        }

        return {
            title: '故事大纲',
            tagline: '',
            phases: [],
            threads: threads,
            events: [],
            contradictions: [],
            missing: []
        };
    }

    function mergeMapData(newData) {
        // 新格式直接覆盖（每次AI分析是完整结构，不是增量追加）
        var result = {
            title: newData.title || '故事大纲',
            tagline: newData.tagline || '',
            phases: newData.phases || [],
            threads: newData.threads || [],
            events: newData.events || [],
            contradictions: newData.contradictions || [],
            missing: newData.missing || []
        };
        localStorage.setItem('oa_map_data', JSON.stringify(result));
        console.log('[mergeMapData] 保存完成，phases:', result.phases.length, 'threads:', result.threads.length, 'events:', result.events.length);
        return result;
    }

    async function sendIdeaMessage() {
        if (isAITyping) return;

        const input = document.getElementById('idea-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addChatMessage('user', text);
        ideaConversation.push({ role: 'user', content: text });

        isAITyping = true;
        showLoading();

        const response = await callAI(window.IDEA_SYSTEM_PROMPT, ideaConversation);

        hideLoading();
        isAITyping = false;

        if (response) {
            ideaConversation.push({ role: 'assistant', content: response });
            await addChatMessage('ai', response);

            // 提取地图数据并自动更新
            const mapData = extractMapData(response);
            if (mapData) {
                const merged = mergeMapData(mapData);
                console.log('[地图提取] 成功，threads:', merged.nodes?.filter(n => n.type !== 'event').length, 'events:', merged.nodes?.filter(n => n.type === 'event').length);
                showToast('已自动提取故事结构到全貌地图 ✦', 'success');
                // 强制刷新地图
                if (window.MapViz) window.MapViz.refresh();
            } else {
                // 自动提取失败时，显示手动发送按钮
                const btn = document.createElement('button');
                btn.className = 'send-to-map-btn';
                btn.textContent = '📍 发送到全貌地图';
                btn.addEventListener('click', () => {
                    const manualData = manualExtractFromText(response);
                    if (manualData) {
                        mergeMapData(manualData);
                        showToast('已提取到全貌地图 ✦', 'success');
                        if (window.MapViz) window.MapViz.refresh();
                        btn.remove();
                    } else {
                        showToast('未能识别出故事线', 'error');
                    }
                });
                const lastMsg = document.querySelector('#idea-chat .chat-message.ai:last-child .message-content');
                if (lastMsg) lastMsg.appendChild(btn);
            }
        }
    }

    // ==================== 灵感记录 ====================
    function getCategoryLabel(cat) {
        const labels = { genre: '题材', character: '人物', scene: '场景', plot: '情节', setting: '设定' };
        return labels[cat] || cat;
    }

    function renderInspirations() {
        const container = document.getElementById('inspiration-tags');
        container.innerHTML = '';

        // 空状态：显示示例灵感
        if (inspirations.length === 0) {
            const hint = document.createElement('div');
            hint.style.cssText = 'text-align:center; padding: 20px; opacity: 0.6; font-size: 14px;';
            hint.innerHTML = '试试这些灵感标签，点击可选中：';
            container.appendChild(hint);

            SAMPLE_INSPIRATIONS.forEach((sample) => {
                const tag = document.createElement('div');
                tag.className = 'inspiration-tag';
                tag.style.opacity = '0.7';
                tag.innerHTML = '<span class="tag-category">' + getCategoryLabel(sample.category) + '</span><span>' + sample.text + '</span>';
                tag.addEventListener('click', () => {
                    addInspirationDirect(sample.text, sample.category);
                });
                container.appendChild(tag);
            });
            updateCollisionState();
            return;
        }

        inspirations.forEach((insp, index) => {
            const tag = document.createElement('div');
            tag.className = 'inspiration-tag' + (selectedInspirations.has(index) ? ' selected' : '');
            tag.innerHTML =
                (insp.category ? '<span class="tag-category">' + getCategoryLabel(insp.category) + '</span>' : '') +
                '<span>' + escapeHtml(insp.text) + '</span>' +
                '<span class="tag-remove" data-index="' + index + '">×</span>';
            tag.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-remove')) { removeInspiration(index); return; }
                toggleInspirationSelection(index);
            });
            container.appendChild(tag);
        });

        updateCollisionState();
        saveInspirations();
    }

    // 更新碰撞卡的按钮状态
    function updateCollisionState() {
        const count = selectedInspirations.size;

        // 智能组合卡
        const combineSelected = document.getElementById('combine-selected');
        const combineBtn = document.getElementById('combine-btn');
        if (combineSelected) combineSelected.textContent = '已选 ' + count + ' 个';
        if (combineBtn) {
            if (count >= 2) {
                combineBtn.disabled = false;
                combineBtn.textContent = '✦ 开始碰撞';
            } else {
                combineBtn.disabled = true;
                combineBtn.textContent = '至少选2个';
            }
        }

        // 注入卡
        const injectSelected = document.getElementById('inject-selected');
        const injectBtn = document.getElementById('inject-btn');
        const injectTextarea = document.getElementById('inject-storyline');
        if (injectSelected) injectSelected.textContent = '已选 ' + count + ' 个';
        if (injectBtn) {
            const hasStoryline = injectTextarea && injectTextarea.value.trim().length > 0;
            if (count >= 1 && hasStoryline) {
                injectBtn.disabled = false;
                injectBtn.textContent = '✦ 注入灵感';
            } else {
                injectBtn.disabled = true;
                injectBtn.textContent = count >= 1 ? '还需要输入故事线' : '至少选1个';
            }
        }
    }

    function addInspiration() {
        const input = document.getElementById('inspiration-input');
        const category = document.getElementById('inspiration-category').value;
        const text = input.value.trim();
        if (!text) return;
        inspirations.push({ text, category, timestamp: Date.now() });
        input.value = '';
        document.getElementById('inspiration-category').value = '';
        renderInspirations();
        showToast('灵感已记录 ✦', 'success');
    }

    function addInspirationDirect(text, category) {
        if (inspirations.some(i => i.text === text)) return;
        inspirations.push({ text, category, timestamp: Date.now() });
        renderInspirations();
        showToast('灵感已记录 ✦', 'success');
    }

    function removeInspiration(index) {
        inspirations.splice(index, 1);
        selectedInspirations.delete(index);
        const newSelected = new Set();
        selectedInspirations.forEach(i => {
            if (i < index) newSelected.add(i);
            else if (i > index) newSelected.add(i - 1);
        });
        selectedInspirations = newSelected;
        renderInspirations();
    }

    function toggleInspirationSelection(index) {
        if (selectedInspirations.has(index)) selectedInspirations.delete(index);
        else selectedInspirations.add(index);
        renderInspirations();
    }

    function saveInspirations() {
        localStorage.setItem('oa_inspirations', JSON.stringify(inspirations));
    }

    // ==================== 灵感智能组合 ====================
    async function combineInspirations() {
        if (isAITyping) return;
        const selected = Array.from(selectedInspirations).map(i => inspirations[i]);
        if (selected.length < 2) return;

        const results = document.getElementById('collision-results');
        results.innerHTML = '<div class="chat-loading" style="margin: 20px auto;"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';

        const prompt = '用户选了以下 ' + selected.length + ' 条灵感标签：\n\n' +
            selected.map((s, i) => (i+1) + '. ' + s.text + (s.category ? ' [' + getCategoryLabel(s.category) + ']' : '')).join('\n') +
            '\n\n请把这些灵感智能组合，生成2-3个故事方案。';

        isAITyping = true;
        const response = await callAI(window.COMBINE_SYSTEM_PROMPT, [{ role: 'user', content: prompt }]);
        isAITyping = false;

        if (!response) return;

        results.innerHTML = '';
        const concepts = response.split(/\*\*方案/).filter(Boolean);
        concepts.forEach(concept => {
            const div = document.createElement('div');
            div.className = 'collision-result-card';
            div.innerHTML = renderMarkdown('**方案' + concept);
            results.appendChild(div);
        });

        if (concepts.length === 0) {
            const div = document.createElement('div');
            div.className = 'collision-result-card';
            div.innerHTML = renderMarkdown(response);
            results.appendChild(div);
        }
    }

    // ==================== 灵感注入故事线 ====================
    async function injectIntoStoryline() {
        if (isAITyping) return;
        const selected = Array.from(selectedInspirations).map(i => inspirations[i]);
        const storyline = document.getElementById('inject-storyline').value.trim();

        if (selected.length < 1 || !storyline) {
            showToast('请选择灵感并输入已有故事线', 'error');
            return;
        }

        const results = document.getElementById('collision-results');
        results.innerHTML = '<div class="chat-loading" style="margin: 20px auto;"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';

        const prompt = '已有故事线/大纲：\n' + storyline + '\n\n要注入的灵感标签：\n' +
            selected.map((s, i) => (i+1) + '. ' + s.text + (s.category ? ' [' + getCategoryLabel(s.category) + ']' : '')).join('\n') +
            '\n\n请把这些灵感注入到已有故事线中，生成2-3个分支可能性。';

        isAITyping = true;
        const response = await callAI(window.INJECT_SYSTEM_PROMPT, [{ role: 'user', content: prompt }]);
        isAITyping = false;

        if (!response) return;

        results.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'collision-result-card';
        div.innerHTML = renderMarkdown(response);
        results.appendChild(div);
    }

    // ==================== 设置 ====================
    function openSettings() {
        document.getElementById('setting-proxy').value = window.AI_CONFIG.proxyUrl || '';
        document.getElementById('setting-endpoint').value = window.AI_CONFIG.endpoint;
        document.getElementById('setting-key').value = window.AI_CONFIG.apiKey;
        document.getElementById('setting-model').value = window.AI_CONFIG.model;
        document.getElementById('settings-modal').classList.add('active');

        // 根据当前配置决定显示哪个模式
        const mode = window.AI_CONFIG.proxyUrl ? 'proxy' : 'direct';
        switchSettingsMode(mode);
    }

    function closeSettings() {
        document.getElementById('settings-modal').classList.remove('active');
    }

    function switchSettingsMode(mode) {
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        document.getElementById('proxy-fields').style.display = mode === 'proxy' ? 'block' : 'none';
        document.getElementById('direct-fields').style.display = mode === 'direct' ? 'block' : 'none';
    }

    function saveSettings() {
        const activeMode = document.querySelector('.mode-tab.active')?.dataset.mode || 'proxy';
        const model = document.getElementById('setting-model').value.trim() || 'deepseek-chat';

        if (activeMode === 'proxy') {
            const proxyUrl = document.getElementById('setting-proxy').value.trim();
            if (!proxyUrl) { showToast('请输入代理地址', 'error'); return; }
            window.AI_CONFIG.save('', '', model, proxyUrl);
        } else {
            const endpoint = document.getElementById('setting-endpoint').value.trim();
            const key = document.getElementById('setting-key').value.trim();
            if (!key) { showToast('请输入API密钥', 'error'); return; }
            window.AI_CONFIG.save(endpoint, key, model, '');
        }
        closeSettings();
        showToast('设置已保存', 'success');
    }

    // ==================== 产品信息 ====================
    function initProductInfo() {
        document.getElementById('product-info-trigger').addEventListener('click', () => {
            document.getElementById('product-info-modal').classList.add('active');
        });
        document.getElementById('product-info-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-info-modal') {
                e.target.classList.remove('active');
            }
        });
    }

    // ==================== 初始化 ====================
    function init() {
        initBubbles();
        renderInspirations();
        initProductInfo();

        // 想法梳理
        document.getElementById('idea-send').addEventListener('click', sendIdeaMessage);
        document.getElementById('idea-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIdeaMessage(); }
        });

        // 灵感记录
        document.getElementById('inspiration-add').addEventListener('click', addInspiration);
        document.getElementById('inspiration-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addInspiration();
        });
        document.getElementById('combine-btn').addEventListener('click', combineInspirations);
        document.getElementById('inject-btn').addEventListener('click', injectIntoStoryline);
        document.getElementById('inject-storyline').addEventListener('input', updateCollisionState);

        // 设置
        document.getElementById('settings-trigger').addEventListener('click', openSettings);
        document.getElementById('settings-save').addEventListener('click', saveSettings);
        document.getElementById('settings-cancel').addEventListener('click', closeSettings);
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal') closeSettings();
        });
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => switchSettingsMode(tab.dataset.mode));
        });

        showToast('大纲助手已就绪 ✦', 'success');

        // 移动端：把气泡导航移到输入框上方
        layoutBubbleNav();
        window.addEventListener('resize', layoutBubbleNav);
    }

    function layoutBubbleNav() {
        var nav = document.getElementById('bubble-nav');
        if (!nav) return;

        if (window.innerWidth <= 768) {
            document.querySelectorAll('.panel').forEach(function(panel) {
                if (panel.querySelector('.bubble-nav-inline')) return;

                var clone = nav.cloneNode(true);
                clone.classList.add('bubble-nav-inline');
                clone.querySelectorAll('.bubble').forEach(function(b) {
                    b.addEventListener('click', function() {
                        switchPanel(b.dataset.target);
                        document.querySelectorAll('.bubble').forEach(function(bb) {
                            bb.classList.toggle('bubble-active', bb.dataset.target === currentPanel);
                        });
                    });
                });

                // 插到 panel 最顶部（header 前面）
                var header = panel.querySelector('.panel-header');
                if (header) {
                    panel.insertBefore(clone, header);
                } else {
                    panel.prepend(clone);
                }
            });
            nav.style.display = 'none';
        } else {
            nav.style.display = '';
            document.querySelectorAll('.bubble-nav-inline').forEach(function(n) { n.remove(); });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 暴露给 map-viz.js 使用
    window._oa = {
        getConversation: function() { return ideaConversation; },
        extractMapData: extractMapData,
        mergeMapData: mergeMapData,
        showToast: showToast,
    };
})();
