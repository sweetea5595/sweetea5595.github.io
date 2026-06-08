// Cloudflare Worker — 大纲助手 API 代理（DeepSeek / OpenAI 兼容格式）
// 接收前端请求，转发到 DeepSeek API，返回结果
//
// 部署步骤：
// 1. npx wrangler login
// 2. echo "你的key" | npx wrangler secret put DEEPSEEK_API_KEY
// 3. npx wrangler deploy

export default {
    async fetch(request, env) {
        // CORS 预检
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // 只接受 POST
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            const body = await request.json();
            const apiKey = env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return new Response(JSON.stringify({ error: 'API key not configured' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            // 直接用 OpenAI 兼容格式转发到 DeepSeek
            const model = env.DEEPSEEK_MODEL || 'deepseek-chat';
            const apiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: body.messages,
                    max_tokens: body.max_tokens || 2000,
                    temperature: body.temperature || 0.7,
                    stream: false,
                }),
            });

            const data = await apiResponse.json();

            // 检查上游错误
            if (!apiResponse.ok) {
                return new Response(JSON.stringify({
                    error: data.error?.message || data.error || 'DeepSeek API error',
                    status: apiResponse.status
                }), {
                    status: apiResponse.status,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            // DeepSeek 返回的就是 OpenAI 格式，直接透传
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }
    },
};
