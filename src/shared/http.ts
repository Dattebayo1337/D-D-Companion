import { AuthError } from "@/services/accounts/service";
import { DatasetError, MAX_IMPORT_BYTES } from "@/imports/pipeline";
import { ZodError } from "zod";
export function errorResponse(error: unknown) {
  if (error instanceof AuthError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  if (error instanceof DatasetError)
    return Response.json(
      { error: error.message, issues: error.issues },
      { status: 400 },
    );
  if (error instanceof ZodError)
    return Response.json(
      { error: "Неверные параметры запроса." },
      { status: 400 },
    );
  console.error(error);
  return Response.json(
    {
      error:
        "Не удалось выполнить операцию. Проверьте базу данных и журнал сервера.",
    },
    { status: 500 },
  );
}
export function checkOrigin(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  // Next's internal URL may use localhost while the incoming Host is 127.0.0.1.
  // Match the browser's exact origin to Host; never trust forwarded-host headers.
  const host = request.headers.get("host") ?? url.host;
  const expectedOrigin = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).origin
    : `${url.protocol}//${host}`;
  if (origin && origin !== expectedOrigin)
    throw new DatasetError([
      { path: "origin", message: "Запрос с другого сайта запрещён." },
    ]);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new DatasetError([
      { path: "origin", message: "Запрос с другого сайта запрещён." },
    ]);
}
export async function readBody(request: Request, maxBytes = MAX_IMPORT_BYTES) {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new DatasetError([{ path: "file", message: "Требуется JSON." }]);
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new DatasetError([
      { path: "file", message: "Превышен допустимый размер запроса." },
    ]);
  if (!request.body)
    throw new DatasetError([{ path: "file", message: "Пустой файл." }]);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new DatasetError([
        { path: "file", message: "Превышен допустимый размер запроса." },
      ]);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
