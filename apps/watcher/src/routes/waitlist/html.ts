export function renderStatusHtml(options: {
  icon: string;
  title: string;
  subtitle: string;
  releaseTitle?: string | null;
  frontendUrl?: string;
}): string {
  const frontend = (options.frontendUrl || process.env.FRONTEND_URL || 'https://lalamovies.stream').replace(/\/+$/, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${options.title} — Media Download Manager</title>
  <style>
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 1.75rem;
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
    p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.5rem; }
    .release {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #38bdf8;
      word-break: break-all;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      transition: background 0.15s;
    }
    .btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${options.icon}</div>
    <h1>${options.title}</h1>
    <p>${options.subtitle}</p>
    ${options.releaseTitle ? `<div class="release">${options.releaseTitle}</div>` : ''}
    <a href="${frontend}/waitlist" class="btn">Return to Waitlist</a>
  </div>
</body>
</html>`;
}
