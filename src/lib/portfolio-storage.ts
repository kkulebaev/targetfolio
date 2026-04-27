export type Source = "mock" | "manual" | "tinkoff";

const TOKEN_KEY = "targetfolio:tinkoff:token";
const SOURCE_KEY = "targetfolio:source";

const VALID_SOURCES: readonly Source[] = ["mock", "manual", "tinkoff"];

export function loadSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore: private mode or quota
  }
}

export function clearSavedToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function loadSavedSource(): Source | null {
  try {
    const value = localStorage.getItem(SOURCE_KEY);
    if (value && (VALID_SOURCES as readonly string[]).includes(value)) {
      return value as Source;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSource(source: Source): void {
  try {
    localStorage.setItem(SOURCE_KEY, source);
  } catch {
    // ignore
  }
}
