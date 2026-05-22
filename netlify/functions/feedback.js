
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const {
    classification,
    email,
    urgency,
    message,
    anonymous,
    acknowledged,
  } = payload;

  // Enforce required fields
  if (!classification || typeof classification !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Grievance Classification is required." }),
    };
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Detailed Deposition message is required." }),
    };
  }

  if (message.length > 2500) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Detailed Deposition exceeds the 2,500 character limit." }),
    };
  }

  if (!urgency || typeof urgency !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Threat Level is required." }),
    };
  }

  if (!acknowledged) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "You must check the Mandatory Compliance Release." }),
    };
  }

  const rawIp = event.headers["client-ip"] || event.headers["x-nf-client-connection-ip"] || "127.0.0.1";
  const ip = rawIp.replace(/[^a-zA-Z0-9.:_-]/g, "");

  // --- Tier B Rate Limiting via Upstash Redis ---
  // Limits feedback to 3 submissions per hour per IP to prevent spamming
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const ipKey = `feedback_limit:${ip}`;

      const pipelineResponse = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", ipKey],
          ["TTL", ipKey],
        ]),
      });

      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json();
        if (Array.isArray(pipelineData) && pipelineData.length === 2) {
          const ipCount = pipelineData[0]?.result;
          const ipTtl = pipelineData[1]?.result;

          // Set expiration to 3600 seconds (1 hour) on first increment or if TTL is missing
          if (ipTtl === -1 || ipCount === 1) {
            fetch(`${redisUrl}/pipeline`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${redisToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify([["EXPIRE", ipKey, 3600]]),
            }).catch((err) => console.error("Error setting Upstash feedback expiration:", err));
          }

          if (ipCount > 3) {
            return {
              statusCode: 429,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                error: "DEPOSITION CEILING EXCEEDED — You have submitted too many policy grievances within the active corporate hour. Please conserve company bandwidth and try again later.",
              }),
            };
          }
        }
      }
    } catch (err) {
      console.error("Upstash Redis feedback rate limiter error (failing open):", err);
    }
  }

  // Build content strings
  const displayEmail = anonymous ? "Anonymous (Whistleblower Protection)" : (email || "Not Provided");
  const displayUrgency = urgency.toUpperCase();

  // --- 1. Resend Email Dispatch ---
  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  let emailDispatched = false;

  const isValidEmail = (e) =>
    typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  if (resendApiKey && toEmail) {
    try {
      const fromEmail = process.env.FEEDBACK_FROM_EMAIL || "onboarding@resend.dev";
      const emailBody = {
        from: `Compliance Officer <${fromEmail}>`,
        to: toEmail,
        subject: `⚖ Compliance Grievance: [${classification}]`,
        ...(!anonymous && isValidEmail(email) ? { reply_to: email } : {}),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; background-color: #f9f9f9;">
            <h2 style="color: #008080; border-bottom: 2px solid #008080; padding-bottom: 8px;">Compliance Grievance Deposition</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 180px; border-bottom: 1px solid #eee;">Classification:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${classification}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Threat Level:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #d9534f; font-weight: bold;">${displayUrgency}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Submitter Email:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${displayEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Anonymous Submission:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${anonymous ? "Yes (Whistleblower Protection)" : "No"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">IP Origin:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${ip}</td>
              </tr>
            </table>
            
            <h3 style="color: #333; margin-top: 20px;">Deposition Details:</h3>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #008080; border: 1px solid #ddd; white-space: pre-wrap; font-family: monospace; font-size: 13px;">${message}</div>
            
            <p style="font-size: 11px; color: #777; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
              This grievance was processed and secured by The Compliance Officer v3.11.
            </p>
          </div>
        `,
      };

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailBody),
      });

      if (emailResponse.ok) {
        emailDispatched = true;
      } else {
        const errorText = await emailResponse.text();
        console.error("Resend API failed dispatching email:", errorText);
      }
    } catch (err) {
      console.error("Error connecting to Resend API:", err);
    }
  }

  // --- 2. Discord Webhook Dispatch ---
  const discordWebhookUrl = process.env.FEEDBACK_DISCORD_WEBHOOK_URL;
  let discordDispatched = false;

  if (discordWebhookUrl) {
    try {
      const discordEmbed = {
        username: "The Compliance Officer",
        avatar_url: "https://the-compliance-officer.netlify.app/favicon.ico", // fallback favicon
        embeds: [
          {
            title: `⚖ New Compliance Grievance Registered`,
            color: 32896, // Teal: decimal representation of #008080
            fields: [
              { name: "Classification", value: classification, inline: true },
              { name: "Threat Level", value: displayUrgency, inline: true },
              { name: "Submitter Email", value: displayEmail, inline: false },
              { name: "Whistleblower Protection", value: anonymous ? "Active 🔒" : "Inactive 🔓", inline: true },
              { name: "IP Address", value: `\`${ip}\``, inline: true },
            ],
            description: `**Deposition:**\n\`\`\`\n${message}\n\`\`\``,
            timestamp: new Date().toISOString(),
            footer: { text: "The Compliance Officer v3.11" },
          },
        ],
      };

      const discordResponse = await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordEmbed),
      });

      if (discordResponse.ok) {
        discordDispatched = true;
      } else {
        console.error("Discord Webhook failed dispatching alert:", discordResponse.status);
      }
    } catch (err) {
      console.error("Error connecting to Discord Webhook:", err);
    }
  }

  // Debug local log if nothing is configured
  if (!resendApiKey && !discordWebhookUrl) {
    console.log("Mock feedback submission (No production env variables configured):", {
      classification,
      email: displayEmail,
      urgency: displayUrgency,
      message,
      anonymous,
      ip,
    });
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      message: "Grievance deposition submitted to the corporate database successfully.",
      emailDispatched,
      discordDispatched,
    }),
  };
};
