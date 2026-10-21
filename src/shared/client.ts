export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.issues
        ?.map(
          (i: { path: string; message: string }) => `${i.path}: ${i.message}`,
        )
        .join("\n") ||
        body.error ||
        "Не удалось выполнить запрос.",
    );
  return body as T;
}
