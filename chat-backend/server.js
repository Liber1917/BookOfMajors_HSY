import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const rateLimitMap = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;

function rateLimit(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || [];
    const recent = entry.filter(t => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    recent.push(now);
    rateLimitMap.set(ip, recent);
    next();
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));

app.use(express.json());

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = process.env.CHAT_API_KEY;

    if (apiKey && apiKey.trim() !== '') {
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
};

const openai = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
});

app.post('/api/chat', authMiddleware, rateLimit, async (req, res) => {
    try {
        const { messages, context } = req.body;
        console.log('[Chat] messages:', messages?.length, 'context:', context ? context.length + ' chars' : 'none');
        let fullMessages = messages || [];
        if (context) {
            fullMessages = [
                { role: 'system', content: `你是"华师一高校指南"的AI助手，帮助高中生了解大学专业。

请使用下方指南内容中的信息来回答问题。回答时请自然引导用户去指南中阅读对应章节的完整内容（告知具体篇目标题），例如"指南的《专业名称》篇有详细介绍"。

指南内容：
${context}` },
                ...fullMessages,
            ];
        }

        const completion = await openai.chat.completions.create({
            messages: fullMessages,
            model: process.env.LLM_MODEL,
            stream: true,
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(content); // Simple streaming for demo
            }
        }
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
