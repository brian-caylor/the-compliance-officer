const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed. Use GET." }),
    };
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  let pipsAvoided = null;

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["GET", "global_pips_avoided"],
        ]),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.result !== null) {
          pipsAvoided = parseInt(data[0].result, 10);
        }
      }
    } catch (err) {
      console.error("Error reading from Upstash Redis stats endpoint:", err);
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ pipsAvoided }),
  };
};

export { handler };
