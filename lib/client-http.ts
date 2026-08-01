export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text)
    throw new Error(
      response.ok
        ? "The server returned an empty response"
        : "The request failed without an error message",
    );
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an unreadable response"
        : text.startsWith("Internal Server")
          ? "The server could not complete the request. Restart the app to load the latest fallback data."
          : text,
    );
  }
}
