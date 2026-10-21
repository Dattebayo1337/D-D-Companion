try {
  const response = await fetch("http://127.0.0.1:3000/api/mobile/status", { signal: AbortSignal.timeout(4000) });
  const body = await response.json();
  if (!response.ok || body.application !== "dnd-companion" || body.protocol !== 1) process.exit(1);
} catch { process.exit(1); }
