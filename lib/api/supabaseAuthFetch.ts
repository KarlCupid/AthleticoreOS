const AUTH_SERVICE_UNAVAILABLE_CODE = 'auth_service_unavailable';
const AUTH_SERVICE_UNAVAILABLE_MESSAGE = 'Athleticore auth service is temporarily unavailable.';

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }

  if (typeof input === 'object' && input !== null && 'url' in input && typeof input.url === 'string') {
    return input.url;
  }

  return '';
}

function isSupabaseAuthRequest(input: RequestInfo | URL, supabaseUrl: string): boolean {
  const requestUrl = getRequestUrl(input);
  if (!requestUrl) {
    return false;
  }

  try {
    const request = new URL(requestUrl);
    const authBase = new URL('auth/v1', supabaseUrl);
    const authPath = authBase.pathname.endsWith('/') ? authBase.pathname : `${authBase.pathname}/`;

    return request.origin === authBase.origin
      && (request.pathname === authBase.pathname || request.pathname.startsWith(authPath));
  } catch {
    return false;
  }
}

function hasJsonContentType(response: Response): boolean {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
}

function cloneHeaders(response: Response): Headers {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  return headers;
}

function getResponseStatus(response: Response): number {
  return response.status >= 200 && response.status <= 599 ? response.status : 503;
}

export function normalizeSupabaseAuthResponse(
  input: RequestInfo | URL,
  response: Response,
  supabaseUrl: string,
): Response {
  if (response.ok || hasJsonContentType(response) || !isSupabaseAuthRequest(input, supabaseUrl)) {
    return response;
  }

  const status = getResponseStatus(response);
  const headers = cloneHeaders(response);
  headers.set('content-type', 'application/json;charset=UTF-8');
  headers.set('x-supabase-api-version', '2024-01-01');
  headers.delete('content-length');

  return new Response(JSON.stringify({
    code: AUTH_SERVICE_UNAVAILABLE_CODE,
    error: AUTH_SERVICE_UNAVAILABLE_MESSAGE,
    error_code: AUTH_SERVICE_UNAVAILABLE_CODE,
    error_description: AUTH_SERVICE_UNAVAILABLE_MESSAGE,
    message: AUTH_SERVICE_UNAVAILABLE_MESSAGE,
    msg: AUTH_SERVICE_UNAVAILABLE_MESSAGE,
    upstream_status: status,
  }), {
    headers,
    status,
    statusText: response.statusText || 'Auth Service Unavailable',
  });
}

export function createSupabaseAuthFetch(supabaseUrl: string, fetcher: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetcher(input, init);
    return normalizeSupabaseAuthResponse(input, response, supabaseUrl);
  };
}
