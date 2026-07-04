const originalFetch = window.fetch.bind(window);

window.fetch = async (resource, options = {}) => {
  const url = typeof resource === 'string' ? resource : resource.url;
  if (!url.endsWith('/demo-chat')) return originalFetch(resource, options);

  const request = JSON.parse(options.body || '{}');
  const latest = request.messages?.filter((message) => message.role === 'user').at(-1)?.content || '';
  const reply = createReply(latest, request.locale);
  const encoder = new TextEncoder();

  return new Response(new ReadableStream({
    async start(controller) {
      for (const token of reply.match(/.{1,18}(\s|$)/g) || [reply]) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: token })}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 45));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  }), {
    headers: { 'Content-Type': 'text/event-stream' },
    status: 200
  });
};

function createReply(message, locale) {
  const lower = message.toLowerCase();
  if (locale === 'cs') {
    return 'Jasně. Widget je Web Component, takže ho vložíte jedním skriptem a jedním `<neiki-assistant>` elementem. Texty jsou v samostatných lokalizačních souborech a API klíče zůstávají bezpečně na backendu.';
  }
  if (lower.includes('code') || lower.includes('backend')) {
    return 'Your backend only needs to accept `{ messages }` and return JSON or a stream.\n\n```js\nreturn Response.json({ reply: "Hello from your AI provider" });\n```\nThe widget never stores provider secrets in the browser.';
  }
  if (lower.includes('theme') || lower.includes('color')) {
    return 'Themes are controlled with the `theme` attribute and CSS variables such as `--neiki-accent`, `--neiki-bg` and `--neiki-user-bg`. Use `light`, `dark` or `auto`.';
  }
  return 'Neiki\'s Assistant is designed as a small provider-agnostic library: Shadow DOM styling, streaming, markdown, code copy buttons, persistence, retries and accessibility are built in.';
}
