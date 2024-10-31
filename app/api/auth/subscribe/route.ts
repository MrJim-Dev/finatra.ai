import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'emails.json');
    let emails = [];

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      emails = JSON.parse(data);
    }

    if (emails.includes(email)) {
      return NextResponse.json(
        { message: 'This email is already in the newsletter' },
        { status: 409 }
      );
    }

    emails.push(email);
    fs.writeFileSync(filePath, JSON.stringify(emails, null, 2));

    return NextResponse.json(
      { message: 'Successfully subscribed to the newsletter!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to the newsletter:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
