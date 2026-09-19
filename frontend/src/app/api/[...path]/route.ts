import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(url, init);
  } catch {
    // A route handler must return a JSON response when the local API is down.
    // Letting this throw produces an HTML 500 page, which becomes the opaque
    // "Request failed" message in every client screen.
    return NextResponse.json(
      { error: 'The SynergySphere API is unavailable. Start the backend on port 4000 and try again.' },
      { status: 503 },
    );
  }
  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
