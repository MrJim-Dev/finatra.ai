import { NextResponse } from 'next/server';

// Simple endpoint to clear all authentication cookies
export async function POST() {
  try {
    console.log('[AuthClear] Clearing all authentication cookies...');

    const isDev = process.env.NODE_ENV === 'development';
    const response = NextResponse.json({
      success: true,
      message: 'Authentication cookies cleared',
    });

    const cookieOptions = {
      httpOnly: true,
      sameSite: isDev ? ('lax' as const) : ('none' as const),
      secure: !isDev,
      path: '/',
      maxAge: 0, // This clears the cookie
      // Set domain to localhost in development to clear cookies across ports
      ...(isDev ? { domain: 'localhost' } : {}),
    };

    // Clear all auth cookies
    response.cookies.set('access_token', '', cookieOptions);
    response.cookies.set('refresh_token', '', cookieOptions);
    response.cookies.set('user', '', cookieOptions);
    response.cookies.set('active_portfolio', '', cookieOptions);

    console.log('[AuthClear] All authentication cookies cleared successfully');
    return response;
  } catch (error) {
    console.error('[AuthClear] Error clearing cookies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}
