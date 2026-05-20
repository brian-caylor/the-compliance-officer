import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

import {
  TONE_INSTRUCTIONS,
  FLAG_REASON_PERSONALITY,
  QUICK_TRANSLATE_PROMPT,
  EMAIL_REVIEW_PROMPT,
} from "./prompts.js";

function buildSystemPrompt(basePrompt, tone) {
  let prompt = `${basePrompt}\n\n${FLAG_REASON_PERSONALITY}`;
  if (tone && tone !== "hr_approved" && TONE_INSTRUCTIONS[tone]) {
    prompt += `\n\n${TONE_INSTRUCTIONS[tone]}\n\nThe tone override above applies ONLY to the "sanitized_translation" field (Quick Translate) or the "recommended_revision" field (Email Review). The "officers_note" field and the "reason" fields still use the Compliance Officer's normal stuffy, weary voice. The danger assessment is of the ORIGINAL message and should not be affected by the rewrite tone.`;
  }
  prompt += `\n\nStill respond with the exact JSON schema specified above. No preamble, no markdown fences.`;
  return prompt;
}

const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { mode, message, subject, tone } = payload;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Message is required" }) };
  }

  if (mode !== "quick" && mode !== "email") {
    return { statusCode: 400, body: JSON.stringify({ error: "Mode must be 'quick' or 'email'" }) };
  }

  // Tier B Rate Limiting via Upstash Redis
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const rawIp = event.headers["client-ip"] || event.headers["x-nf-client-connection-ip"] || "127.0.0.1";
      const ip = rawIp.replace(/[^a-zA-Z0-9.:_-]/g, "");
      
      const today = new Date().toISOString().split("T")[0];
      const ipKey = `ip_limit:${ip}`;
      const globalKey = `global_daily_limit:${today}`;

      const pipelineResponse = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", ipKey],
          ["TTL", ipKey],
          ["INCR", globalKey],
          ["TTL", globalKey],
        ]),
      });

      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        if (Array.isArray(pipelineData) && pipelineData.length === 4) {
          const ipCount = pipelineData[0]?.result;
          const ipTtl = pipelineData[1]?.result;
          const globalCount = pipelineData[2]?.result;
          const globalTtl = pipelineData[3]?.result;

          // Set expirations in the background if they don't exist
          const expireCommands = [];
          if (ipTtl === -1 || ipCount === 1) {
            expireCommands.push(["EXPIRE", ipKey, 3600]);
          }
          if (globalTtl === -1 || globalCount === 1) {
            expireCommands.push(["EXPIRE", globalKey, 100000]); // slightly over 24h
          }

          if (expireCommands.length > 0) {
            fetch(`${redisUrl}/pipeline`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${redisToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(expireCommands),
            }).catch((err) => console.error("Error setting Upstash expirations in background:", err));
          }

          // Check limits
          if (ipCount > 15) {
            return {
              statusCode: 429,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                error: "INSUFFICIENT COMPLIANCE BANDWIDTH",
                details: "Our records indicate that you have requested 15 policy evaluations within the last sixty minutes. Please step away from the desk, consume a lukewarm beverage, and refrain from further communication until your hourly compliance allocation has replenished.",
              }),
            };
          }

          if (globalCount > 250) {
            return {
              statusCode: 429,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                error: "RESOURCE DEPLETION EVENT",
                details: "The global daily compliance quota of 250 reviews has been fully exhausted. The Compliance Officer is currently filling out Form 99-B (Record of Excessive Advisory Requests) and cannot be disturbed. Please submit your inquiries during the next business day.",
              }),
            };
          }
        }
      } else {
        console.error("Upstash Redis pipeline failed with status:", pipelineResponse.status);
      }
    } catch (redisError) {
      console.error("Upstash Redis error (failing open):", redisError);
    }
  }

  const basePrompt = mode === "email" ? EMAIL_REVIEW_PROMPT : QUICK_TRANSLATE_PROMPT;
  const systemPrompt = buildSystemPrompt(basePrompt, tone);

  let userContent = message;
  if (mode === "email" && subject) {
    userContent = `Subject: ${subject}\n\n${message}`;
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("No text response from Claude");

    let cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    // If the model still wraps JSON in a preamble, pull the outermost {...}.
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace > -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed. Stop reason:", response.stop_reason, "Raw:", textBlock.text);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "The Compliance Officer returned a malformed report.",
          details: parseErr.message,
          stop_reason: response.stop_reason,
          raw: textBlock.text,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("Compliance Officer error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "The Compliance Officer is currently in a meeting.",
        details: error.message,
      }),
    };
  }
};

export { handler };
