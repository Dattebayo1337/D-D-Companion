import { GET as content } from "../content/route";
export function GET(request: Request) {
  const url = new URL(request.url);
  url.searchParams.set("kind", "Monster");
  return content(new Request(url, request));
}
