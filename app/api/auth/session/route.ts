import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET endpoint to check current session status
export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    const userCookie = cookieStore.get('user')?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'No access token',
        },
        { status: 401 }
      );
    }

    // Validate token with API server
    try {
      console.log('[Session] Validating token with API server...');
      const apiUrl = process.env.FINATRA_API_URL || 'http://localhost:3333';
      const validateResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!validateResponse.ok) {
        console.warn(
          '[Session] Token validation failed:',
          validateResponse.status
        );
        return NextResponse.json(
          {
            authenticated: false,
            message: 'Invalid token - please re-login',
            needsReauth: true,
          },
          { status: 401 }
        );
      }

      console.log('[Session] Token validation successful');
    } catch (error) {
      console.error('[Session] Token validation error:', error);
      return NextResponse.json(
        {
          authenticated: false,
          message: 'Token validation failed - please re-login',
          needsReauth: true,
        },
        { status: 401 }
      );
    }

    // Parse user data
    let user = null;
    if (userCookie) {
      try {
        user = JSON.parse(userCookie);
      } catch (e) {
        console.error('[Session] Failed to parse user cookie:', e);
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      tokenLength: accessToken?.length || 0,
    });
  } catch (error) {
    console.error('[Session] Error checking session:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Session check failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // DEPRECATED: This endpoint is no longer used since we now call the API directly
  // for login to get proper Set-Cookie headers. Keeping for backward compatibility.
  console.warn('[Session] POST - DEPRECATED: Use direct API login instead');

  return NextResponse.json(
    {
      message: 'This endpoint is deprecated. Use direct API login instead.',
      deprecated: true,
    },
    { status: 410 } // Gone
  );
}

export async function DELETE() {
  // DEPRECATED: This endpoint is no longer used since we now call the API directly
  // for logout to get proper cookie clearing. Keeping for backward compatibility.
  console.warn('[Session] DELETE - DEPRECATED: Use direct API logout instead');

  return NextResponse.json(
    {
      message: 'This endpoint is deprecated. Use direct API logout instead.',
      deprecated: true,
    },
    { status: 410 } // Gone
  );
}
