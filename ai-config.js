// 大纲助手 — AI配置
// 支持 DeepSeek / OpenAI / Cloudflare Worker 代理

const AI_CONFIG = {
    // 代理地址（部署时填你的 Cloudflare Worker URL）
    // 留空则走直连模式（本地开发用）
    proxyUrl: localStorage.getItem('oa_proxy_url') || '',

    // API端点（直连模式用）
    endpoint: localStorage.getItem('oa_api_endpoint') || 'https://api.deepseek.com/v1/chat/completions',

    // API密钥（直连模式用，代理模式下不需要）
    apiKey: localStorage.getItem('oa_api_key') || '',

    // 模型名称
    model: localStorage.getItem('oa_api_model') || 'deepseek-chat',

    // 保存配置
    save(endpoint, apiKey, model, proxyUrl) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.model = model;
        if (proxyUrl !== undefined) this.proxyUrl = proxyUrl;
        localStorage.setItem('oa_api_endpoint', endpoint);
        localStorage.setItem('oa_api_key', apiKey);
        localStorage.setItem('oa_api_model', model);
        localStorage.setItem('oa_proxy_url', this.proxyUrl);
    },

    // 检查是否已配置（代理模式只要有proxyUrl就行）
    isConfigured() {
        return !!(this.proxyUrl || (this.apiKey && this.endpoint));
    },

    // 获取实际请求地址
    getRequestUrl() {
        return this.proxyUrl || this.endpoint;
    },

    // 获取请求头（代理模式不需要Authorization）
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (!this.proxyUrl && this.apiKey) {
            headers['Authorization'] = 'Bearer ' + this.apiKey;
        }
        return headers;
    }
};

// ==================== 系统 Prompt ====================

// 想法梳理
const IDEA_SYSTEM_PROMPT = `你是一个专业的网文创作顾问，帮助作者梳理故事想法。

当用户给你零散的想法时，你需要输出以下三个板块：

【逻辑链】
把用户的想法按故事线排列，用箭头连接，展示因果关系和时间顺序。
注意：只连接大事件节点（转折点、高潮、结局），不要把每个小场景都串起来。
目标是5-8个大节点，让人一眼看清故事骨架。

【矛盾点】
找出用户想法中逻辑不通、前后矛盾的地方。每个矛盾用⚠️标注，并给出解决方向。
如果没有明显矛盾，说"暂未发现明显矛盾"。

【缺失项】
找出故事自洽还需要补充的关键要素。每个缺失用❓标注，并给出建议。
如果没有明显缺失，说"目前设定较完整"。

【可提取的地图元素】
最后，提取你分析中涉及的故事结构，用以下JSON格式输出（放在最后，用\`\`\`json包裹）：

分幕规则：
- 默认按三幕结构拆分：建置（人物/世界观/起因）、对抗（冲突升级/核心危机）、收束（高潮/结局）
- 如果用户的想法有明确的分卷/分阶段，按用户的来
- 每幕只提取3-5个大事件节点，不要碎片化

\`\`\`json
{
  "title": "一句话概括故事",
  "tagline": "一句话吸引人的卖点",
  "phases": [
    {"id": "act1", "label": "第一幕：建置"},
    {"id": "act2", "label": "第二幕：对抗"},
    {"id": "act3", "label": "第三幕：收束"}
  ],
  "threads": [
    {"id": "main", "label": "主线", "type": "main"},
    {"id": "romance", "label": "感情线", "type": "romance"}
  ],
  "events": [
    {"id": "e1", "label": "事件名", "phase": "act1", "thread": "main"}
  ],
  "contradictions": ["矛盾点1的描述"],
  "missing": ["缺失项1的描述"]
}
\`\`\`

要求：
- 不做价值判断（不说"这个想法不好"），只做逻辑分析
- 建议要具体可操作，不要泛泛而谈
- 语言简洁直接，不要啰嗦
- 事件节点必须是"没有它故事就不成立"级别的，不是每个场景都算
- 如果用户输入太少，追问而不是硬分析`;

// 灵感智能组合
const COMBINE_SYSTEM_PROMPT = `你是一个创意故事策划师，擅长把不同的灵感元素组合成有潜力的故事概念。

用户会给你若干灵感标签，你需要把它们智能组合，生成2-3个故事方案。

每个方案必须包含：
1. **核心设定**：一句话概括故事世界
2. **核心冲突**：为什么这个组合有故事性
3. **故事走向**：一句话概括故事线

要求：
- 理解每个灵感的语义，不是简单拼接
- 每个方案要方向不同（不要三个相似的变体）
- 如果灵感组合太跳跃，说明你找到了什么连接点
- 语言生动有画面感，让人一看就想写

输出格式：
**方案A**：[标题]
核心设定：...
核心冲突：...
故事走向：...

**方案B**：[标题]
...

**方案C**：[标题]
...`;

// 灵感注入已有故事线
const INJECT_SYSTEM_PROMPT = `你是一个创意故事策划师。用户有一个已有的故事线/大纲，以及几个新的灵感标签。

你的任务是把这些新灵感注入到已有故事线中，生成新的分支可能性。

每个分支必须包含：
1. **注入点**：新灵感可以在故事的哪个阶段/节点切入
2. **分支走向**：注入后故事会怎么发展
3. **对主线的影响**：这个分支会如何改变主线

输出2-3个分支方案。`;

// 导出配置
window.AI_CONFIG = AI_CONFIG;
window.IDEA_SYSTEM_PROMPT = IDEA_SYSTEM_PROMPT;
window.COMBINE_SYSTEM_PROMPT = COMBINE_SYSTEM_PROMPT;
window.INJECT_SYSTEM_PROMPT = INJECT_SYSTEM_PROMPT;
