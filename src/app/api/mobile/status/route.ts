export function GET() {
  return Response.json(
    { application: "dnd-companion", protocol: 1 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
