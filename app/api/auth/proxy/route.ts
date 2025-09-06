import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // Debug token for authentication issues
    if (!accessToken) {
      console.warn(`[AuthProxy] No access token for ${method} ${targetPath}`);
    } else {
      // Log first 20 chars of token for debugging
      console.log(
        `[AuthProxy] Token present: ${accessToken.substring(0, 20)}... (${accessToken.length} chars)`
      );
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

    // If we get 401 and have a refresh token, try to refresh
    if (response.status === 401 && cookieStore.get('refresh_token')?.value) {
      console.log(`[AuthProxy] Got 401, attempting token refresh...`);

      try {
        // Try to refresh the token
        const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookieHeader,
          },
        });

        if (refreshResponse.ok) {
          console.log(
            `[AuthProxy] Token refresh successful, retrying original request...`
          );

          // Get the new cookies from the refresh response
          const setCookieHeaders =
            refreshResponse.headers.getSetCookie?.() || [];

          // Update our headers with any new cookies
          let newCookieHeader = cookieHeader;
          setCookieHeaders.forEach((setCookie) => {
            const [nameValue] = setCookie.split(';');
            if (nameValue.includes('access_token=')) {
              // Extract the new access token and update Authorization header
              const newToken = nameValue.split('=')[1];
              headers.Authorization = `Bearer ${newToken}`;
            }
          });

          // Retry the original request with the new token
          response = await fetch(targetUrl, {
            method,
            headers,
            body,
          });

          if (response.ok) {
            console.log(`[AuthProxy] Retry successful after token refresh`);
          }
        } else {
          console.warn(
            `[AuthProxy] Token refresh failed: ${refreshResponse.status}`
          );

          // If refresh fails with 401, tokens are completely invalid - clear them
          if (refreshResponse.status === 401) {
            console.log(
              `[AuthProxy] Clearing auth cookies due to failed refresh`
            );

            // Create response that clears all auth cookies
            const clearCookiesResponse = NextResponse.json(
              {
                error: 'Authentication expired',
                message: 'Please log in again',
                needsReauth: true,
              },
              { status: 401 }
            );

            // Clear all auth cookies
            const isDev = process.env.NODE_ENV === 'development';
            const cookieOptions = {
              httpOnly: true,
              sameSite: isDev ? ('lax' as const) : ('none' as const),
              secure: !isDev,
              path: '/',
              maxAge: 0, // This clears the cookie
            };

            clearCookiesResponse.cookies.set('access_token', '', cookieOptions);
            clearCookiesResponse.cookies.set(
              'refresh_token',
              '',
              cookieOptions
            );
            clearCookiesResponse.cookies.set('user', '', cookieOptions);
            clearCookiesResponse.cookies.set(
              'active_portfolio',
              '',
              cookieOptions
            );

            return clearCookiesResponse;
          }
        }
      } catch (refreshError) {
        console.error(`[AuthProxy] Token refresh error:`, refreshError);
      }
    }

    // Only log failed responses for debugging
    if (!response.ok) {
      console.warn(`[AuthProxy] ${response.status} ${method} ${targetPath}`);
    }

    // Forward the response
    const responseData = await response.text();

    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[AuthProxy] Error:', error);
    return NextResponse.json(
      {
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
