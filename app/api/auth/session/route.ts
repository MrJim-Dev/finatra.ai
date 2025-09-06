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
  try {
    const { access_token, refresh_token, user } = await req.json();
    if (!access_token || !refresh_token || !user) {
      return NextResponse.json(
        { message: 'Missing token(s) or user' },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';
    const res = NextResponse.json({ ok: true });
    const common = {
      httpOnly: true,
      sameSite: isDev ? 'lax' : 'none',
      secure: !isDev,
      path: '/',
    } as const;

    // 1 hour
    res.cookies.set('access_token', access_token, {
      ...common,
      maxAge: 60 * 60,
    });
    // 30 days
    res.cookies.set('refresh_token', refresh_token, {
      ...common,
      maxAge: 30 * 24 * 60 * 60,
    });
    // Mirror API behavior
    res.cookies.set('user', JSON.stringify(user), {
      ...common,
      maxAge: 30 * 24 * 60 * 60,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE() {
  const isDev = process.env.NODE_ENV === 'development';
  const res = NextResponse.json({ ok: true });
  const common = {
    httpOnly: true,
    sameSite: isDev ? 'lax' : 'none',
    secure: !isDev,
    path: '/',
    maxAge: 0,
  } as const;
  res.cookies.set('access_token', '', common);
  res.cookies.set('refresh_token', '', common);
  res.cookies.set('user', '', common);
  return res;
}
