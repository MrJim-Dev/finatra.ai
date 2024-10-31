import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { view } = await request.json();
  
  if (!['grid', 'list', 'board'].includes(view)) {
    return NextResponse.json({ error: 'Invalid view type' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('activeView', view, { path: '/' });

  return response;
}