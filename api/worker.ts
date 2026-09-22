type Env = {
  ALLOWED_ORIGIN?: string;
};

type SourceRequest = {
  url: string;
  token?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function cors(env: Env): Headers {
  const h = new Headers(JSON_HEADERS);
  h.set("access-control-allow-origin", env.ALLOWED_ORIGIN || "*");
  h.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  h.set("access-control-allow-headers", "content-type, authorization, x-api-key");
  h.set("access-control-max-age", "86400");
  return h;
}

function json(data: unknown, status = 200, env: Env) {
  const headers = cors(env);
  return new Response(JSON.stringify(data), { status, headers });
}

function validTarget(raw: string): URL {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("A URL precisa usar HTTP ou HTTPS.");
  }
  return url;
}

function buildHeaders(request: Request, token?: string, extra?: Record<string, string>) {
  const headers = new Headers();
  headers.set("accept", "application/json, text/plain, */*");

  const apiKey = request.headers.get("x-api-key");
  if (apiKey) headers.set("x-api-key", apiKey);
  if (token) headers.set("authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);

  for (const [key, value] of Object.entries(extra || {})) {
    const lower = key.toLowerCase();
    if (["host", "content-length", "cookie"].includes(lower)) continue;
    headers.set(key, value);
  }

  return headers;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  return { raw: text };
}

async function proxy(request: Request, env: Env) {
  const input = await request.json() as SourceRequest;
  if (!input?.url) return json({ error: "url é obrigatório" }, 400, env);

  let target: URL;
  try {
    target = validTarget(input.url);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "URL inválida" }, 400, env);
  }

  const method = (input.method || request.method || "GET").toUpperCase();
  const headers = buildHeaders(request, input.token, input.headers);

  let body: string | undefined;
  if (!["GET", "HEAD"].includes(method) && input.body !== undefined) {
    body = typeof input.body === "string" ? input.body : JSON.stringify(input.body);
    headers.set("content-type", "application/json");
  }

  try {
    const response = await fetch(target, {
      method,
      headers,
      body,
      redirect: "follow",
    });

    const data = await parseResponse(response);

    return json({
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      data,
    }, response.ok ? 200 : 502, env);
  } catch (error) {
    return json({
      error: "Falha ao conectar à fonte.",
      details: error instanceof Error ? error.message : "erro desconhecido",
    }, 502, env);
  }
}

async function testSource(request: Request, env: Env) {
  const input = await request.json() as SourceRequest;
  if (!input?.url) return json({ error: "url é obrigatório" }, 400, env);

  try {
    const target = validTarget(input.url);
    const headers = buildHeaders(request, input.token, input.headers);

    const response = await fetch(target, {
      method: "GET",
      headers,
      redirect: "follow",
    });

    return json({
      connected: response.ok,
      status: response.status,
      url: target.toString(),
      contentType: response.headers.get("content-type"),
    }, response.ok ? 200 : 502, env);
  } catch (error) {
    return json({
      connected: false,
      error: error instanceof Error ? error.message : "erro desconhecido",
    }, 400, env);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "latam-data-manager-api" }, 200, env);
      }

      if (url.pathname === "/api/source/test" && request.method === "POST") {
        return await testSource(request, env);
      }

      if (url.pathname === "/api/source/proxy" && request.method === "POST") {
        return await proxy(request, env);
      }

      return json({ error: "Rota não encontrada" }, 404, env);
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : "erro interno",
      }, 500, env);
    }
  },
};
