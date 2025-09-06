import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    const authCookies = allCookies.filter(
      (c) =>
        c.name === 'access_token' ||
        c.name === 'refresh_token' ||
        c.name === 'user'
    );

    console.log('[Debug] All cookies:', allCookies.length);
    console.log('[Debug] Auth cookies:', authCookies.length);

    return NextResponse.json({
      success: true,
      totalCookies: allCookies.length,
      authCookies: authCookies.length,
      cookieNames: allCookies.map((c) => c.name),
      authCookieDetails: authCookies.map((c) => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
        valuePrefix: c.value ? c.value.substring(0, 10) + '...' : 'empty',
      })),
    });
  } catch (error) {
    console.error('[Debug] Cookie check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
