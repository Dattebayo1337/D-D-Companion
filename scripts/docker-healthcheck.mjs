try {
  const response = await fetch("http://127.0.0.1:3000/api/health/ready", { signal: AbortSignal.timeout(4000) });
  const body = await response.json();
  if (!response.ok || body.status !== "ready") process.exit(1);
} catch { process.exit(1); }
