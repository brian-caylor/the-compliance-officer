export async function apiReview({ mode, message, subject, tone }) {
  let res;
  try {
    res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, message, subject, tone }),
    });
  } catch (networkErr) {
    throw new Error(`Network error reaching Compliance Officer: ${networkErr.message}`);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const snippet = text.slice(0, 240).replace(/\s+/g, " ");
    throw new Error(
      `The Compliance Officer returned a non-JSON response (HTTP ${res.status}). First 240 chars: ${snippet}`
    );
  }

  if (!res.ok) {
    const reason = data?.error || `Request failed with status ${res.status}`;
    const details = data?.details ? ` — ${data.details}` : "";
    throw new Error(reason + details);
  }

  return data;
}
