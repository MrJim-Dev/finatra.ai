import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const dev = process.env.NODE_ENV === 'development';
const dlog = (...args: any[]) => {
  if (dev) console.log('[AuthProxy]', ...args);
};

// Proxy API calls with server-side authentication
export async function GET(request: NextRequest) {
  return proxyWithAuth(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyWithAuth(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyWithAuth(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return proxyWithAuth(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return proxyWithAuth(request, 'PATCH');
}

async function proxyWithAuth(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const targetPath = url.searchParams.get('path');

    if (!targetPath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Get cookies from server-side
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    const userCookie = cookieStore.get('user')?.value;

    // Safely build cookie header to avoid ByteString encoding errors
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => {
        try {
          // Only include cookies that can be safely converted to ByteString
          // Test if the value can be encoded as a header value
          const testValue = `${c.name}=${c.value}`;
          // This will throw if it contains invalid characters
          new Headers({ test: testValue });
          return testValue;
        } catch (e) {
          console.warn(
            `[AuthProxy] Skipping cookie ${c.name} due to encoding issue`
          );
          return null;
        }
      })
      .filter(Boolean)
      .join('; ');

    const apiUrl = process.env.FINATRA_API_URL || 'http://localhost:3333';
    const targetUrl = `${apiUrl}${targetPath}`;

    // Enhanced debug token logging for authentication issues
    if (dev) {
      const allCookies = cookieStore.getAll();
      const authCookies = allCookies.filter(
        (c) =>
          c.name === 'access_token' ||
          c.name === 'refresh_token' ||
          c.name === 'user'
      );

      dlog(`${method} ${targetPath}`, {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUserCookie: !!userCookie,
        accessTokenLength: accessToken?.length || 0,
        accessTokenPrefix: accessToken
          ? accessToken.substring(0, 10) + '...'
          : 'undefined',
        authCookiesCount: authCookies.length,
        authCookieNames: authCookies.map((c) => c.name),
        totalCookies: allCookies.length,
        cookieHeaderLength: cookieHeader.length,
      });
    } else {
      dlog(`${method} ${targetPath}`, 'hasAccess:', !!accessToken);
    }

    // Forward the request with server-side cookies and auth headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add Cookie header if we have valid cookies
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    // Add Authorization header separately to avoid encoding issues
    if (accessToken) {
      try {
        headers.Authorization = `Bearer ${accessToken}`;
      } catch (e) {
        console.warn('[AuthProxy] Failed to add Authorization header:', e);
      }
    }

    // Get request body if it exists
    let body: string | undefined;
    if (method !== 'GET' && request.body) {
      body = await request.text();
    }

    let response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });
    // Do not auto-refresh tokens here; return 401 to the client to handle reauth

    // Enhanced error logging for development
    if (!response.ok) {
      if (response.status === 401 && dev) {
        dlog(`${response.status} ${method} ${targetPath} - Auth failed`, {
          tokenStatus: {
            hasAccessToken: !!accessToken,
            tokenLength: accessToken?.length || 0,
            tokenType: accessToken ? typeof accessToken : 'undefined',
            tokenEmpty: accessToken === '',
            tokenUndefined: accessToken === undefined,
            tokenNull: accessToken === null,
          },
          cookieHeaderLength: cookieHeader.length,
          hasCookieHeader: !!cookieHeader,
        });
      } else {
        dlog(`${response.status} ${method} ${targetPath}`);
      }
    }

    // Forward the response
    const responseData = await response.text();
    // If unauthorized, return a standard JSON body to simplify client handling
    if (response.status === 401) {
      const errorResponse = {
        error: 'Unauthorized',
        message: 'Authentication required',
        needsReauth: true,
      };

      // Add debug info in development
      if (dev) {
        (errorResponse as any).debug = {
          originalResponse: responseData,
          tokenPresent: !!accessToken,
          cookiesPresent: !!cookieHeader,
        };
      }

      return NextResponse.json(errorResponse, { status: 401 });
    }

    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    dlog('Error:', (error as Error)?.message || String(error));
    return NextResponse.json(
      {
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
