const Anthropic = require('@anthropic-ai/sdk');

const ALLOWED_ORIGINS = [
  'https://timely-choux-b3d5f8.netlify.app',
  'http://localhost:8888',
  'http://localhost:3000',
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

const SYSTEM_PROMPT = `You are LifeBalance AI, an intelligent personal time manager. You analyze the user's calendar, tasks, goals, and preferences to suggest optimal schedule changes.

You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.

## Life Categories
- faith: Faith
- sleep: Sleep
- work-money: Work / Money
- food-meals: Food / Meals
- family: Family / Relationships
- entertainment: Entertainment / Recreation
- personal-other: Personal / Other

## 10 Scheduling Rules (follow strictly)
1. Fixed commitments first — Never move or remove events the user has already scheduled for work, sleep, or faith unless they explicitly ask.
2. Protected time — Respect the user's sleep hours preference. Never schedule over sleep time.
3. Respect duration — Suggested events use realistic durations (minimum 15 minutes).
4. Respect priority — High-priority tasks should be scheduled before low-priority ones.
5. Respect deadlines — Tasks with due dates must be scheduled before their deadline.
6. Respect life balance — Suggest time for under-served categories based on the user's goals.
7. Preserve free time — Do not fill every gap. Leave at least 30 minutes of unscheduled breathing room.
8. Avoid fragmentation — Group similar activities together. Avoid creating tiny 15-minute gaps between events.
9. Avoid overbooking — Never suggest a schedule that exceeds 24 hours in a day.
10. Explain trade-offs — Every suggestion must include a brief reason explaining why it's being made.

## Response Format
Respond with this exact JSON structure:
{
  "suggestions": [
    {
      "id": "sug-1",
      "type": "add" | "move" | "resize" | "remove" | "info",
      "summary": "Short description of the suggestion",
      "reason": "Why this change is recommended",
      "event": {
        "title": "Event title",
        "date": "YYYY-MM-DD",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "category": "category-key",
        "type": "event",
        "allDay": false
      },
      "conflictsWith": [],
      "priority": "low" | "medium" | "high"
    }
  ],
  "overview": "Brief summary of your analysis and suggestions",
  "balanceImpact": "Projected impact on life balance score"
}

For "info" type suggestions, the "event" field can be null — these are just observations or tips.
For "move" type, include both the original event id in "targetEventId" and the new time in "event".
For "remove" type, include the event id in "targetEventId" and set "event" to null.
Keep suggestions practical, specific, and actionable.`;

const MAX_PAYLOAD_BYTES = 50 * 1024;
const MAX_COMMAND_LENGTH = 500;

function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object';
  if (!body.action) return 'Missing required field: action';
  if (!['plan-day', 'plan-week', 'command'].includes(body.action)) return 'Invalid action. Must be: plan-day, plan-week, or command';
  if (!body.date) return 'Missing required field: date';
  if (body.action === 'command' && !body.command) return 'Missing required field: command';
  return null;
}

function buildUserMessage(body) {
  const parts = [];

  if (body.action === 'plan-day') {
    parts.push(`Please analyze my schedule for ${body.date} and suggest improvements.`);
  } else if (body.action === 'plan-week') {
    parts.push(`Please analyze my entire week starting ${body.date} and suggest improvements.`);
  } else if (body.action === 'command') {
    parts.push(`User request: ${sanitize(body.command, MAX_COMMAND_LENGTH)}`);
    parts.push(`Context date: ${body.date}`);
  }

  if (body.events && body.events.length > 0) {
    parts.push('\n## Current Events');
    body.events.forEach(e => {
      const time = e.allDay ? 'All day' : `${e.startTime}-${e.endTime}`;
      parts.push(`- [${sanitize(e.category, 30)}] ${sanitize(e.title)} | ${e.date} ${time}${e.type === 'task' ? ' (TASK)' : ''}`);
    });
  } else {
    parts.push('\n## Current Events\nNo events scheduled.');
  }

  if (body.tasks && body.tasks.length > 0) {
    parts.push('\n## Incomplete Tasks');
    body.tasks.forEach(t => {
      parts.push(`- [${t.priority || 'medium'}] ${sanitize(t.title)} (${sanitize(t.category, 30)}) due: ${t.date}`);
    });
  }

  if (body.goals && Object.keys(body.goals).length > 0) {
    parts.push('\n## Weekly Goals (hours/week)');
    Object.entries(body.goals).forEach(([cat, hours]) => {
      parts.push(`- ${cat}: ${hours}h`);
    });
  }

  if (body.preferences) {
    parts.push(`\n## Preferences\n- Sleep hours: ${body.preferences.sleepHours || 7}\n- Work target: ${body.preferences.workHoursTarget || 8}h/day`);
  }

  if (body.balanceScore !== undefined) {
    parts.push(`\n## Current Balance Score: ${body.balanceScore}/100`);
  }

  if (body.budgetSummary) {
    parts.push('\n## Today\'s Time Budget (minutes used)');
    Object.entries(body.budgetSummary).forEach(([cat, mins]) => {
      if (mins > 0) parts.push(`- ${cat}: ${mins} min`);
    });
  }

  return parts.join('\n');
}

function parseAIResponse(text) {
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }

  const parsed = JSON.parse(jsonStr);

  if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
    throw new Error('Response missing suggestions array');
  }
  if (!parsed.overview || typeof parsed.overview !== 'string') {
    parsed.overview = 'Schedule analysis complete.';
  }
  if (!parsed.balanceImpact) {
    parsed.balanceImpact = '';
  }

  parsed.suggestions = parsed.suggestions.map((s, i) => ({
    id: s.id || `sug-${i + 1}`,
    type: ['add', 'move', 'resize', 'remove', 'info'].includes(s.type) ? s.type : 'info',
    summary: s.summary || 'Suggestion',
    reason: s.reason || '',
    event: s.event || null,
    targetEventId: s.targetEventId || null,
    conflictsWith: s.conflictsWith || [],
    priority: ['low', 'medium', 'high'].includes(s.priority) ? s.priority : 'medium',
  }));

  return parsed;
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: true, code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are accepted' }),
    };
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: true, code: 'FORBIDDEN', message: 'Origin not allowed' }),
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: true, code: 'NO_API_KEY', message: 'AI service is not configured' }),
    };
  }

  let body;
  try {
    if (event.body && event.body.length > MAX_PAYLOAD_BYTES) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: true, code: 'PAYLOAD_TOO_LARGE', message: 'Request too large' }),
      };
    }
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: true, code: 'INVALID_JSON', message: 'Request body must be valid JSON' }),
    };
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: true, code: 'VALIDATION_ERROR', message: validationError }),
    };
  }

  try {
    const client = new Anthropic();
    const userMessage = buildUserMessage(body);

    const response = await client.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      timeout: 20000,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: true, code: 'EMPTY_RESPONSE', message: 'AI returned an empty response' }),
      };
    }

    const result = parseAIResponse(textBlock.text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    if (err instanceof SyntaxError || err.message?.includes('suggestions')) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: true, code: 'PARSE_ERROR', message: 'AI returned an invalid response. Please try again.' }),
      };
    }

    if (err.status === 429) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: true, code: 'RATE_LIMIT', message: 'AI is busy. Please wait a moment and try again.' }),
      };
    }

    if (err.status === 401) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: true, code: 'AUTH_ERROR', message: 'AI service configuration error' }),
      };
    }

    if (err.name === 'APIConnectionTimeoutError' || err.code === 'ETIMEDOUT') {
      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({ error: true, code: 'TIMEOUT', message: 'AI is taking too long to respond. Please try again.' }),
      };
    }

    if (err.name === 'APIConnectionError' || err.code === 'ECONNREFUSED') {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: true, code: 'CONNECTION_ERROR', message: 'Could not reach AI service. Please try again later.' }),
      };
    }

    console.error('AI Planner error:', err.message || err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: true, code: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again.' }),
    };
  }
};
