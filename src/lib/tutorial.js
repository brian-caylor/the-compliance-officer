const KEY = "co:tutorial-seen-v1";

export function hasSeenTutorial() {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(KEY, "true");
  } catch {
    // storage unavailable; ignore
  }
}

export function resetTutorial() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
