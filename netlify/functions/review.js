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
