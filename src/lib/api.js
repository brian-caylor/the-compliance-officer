import { emit, EVENTS } from "./bus.js";

export function checkClientRateLimit() {
  const now = Date.now();
  let submissions = [];
  try {
    submissions = JSON.parse(localStorage.getItem("co_submissions") || "[]");
  } catch (e) {
    submissions = [];
  }

  // Filter timestamps in the last 120 seconds (2 minutes)
  submissions = submissions.filter(
    (t) => typeof t === "number" && now - t < 120000
  );

  if (submissions.length >= 5) {
    return { allowed: false };
  }

  submissions.push(now);
  try {
    localStorage.setItem("co_submissions", JSON.stringify(submissions));
  } catch (e) {
    // Ignore localStorage storage errors
  }
  return { allowed: true };
}

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

  if (data && typeof data.pipsAvoided === "number") {
    emit(EVENTS.STATS_UPDATED, { pipsAvoided: data.pipsAvoided });
  }

  return data;
}

export async function apiGetStats() {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) return { pipsAvoided: null };
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed fetching PIPs counter:", err);
    return { pipsAvoided: null };
  }
}
