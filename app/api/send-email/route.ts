import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import NotificationEmail from '@/components/email-template/project-notification';

const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, emailTemplate } = await request.json();

    if (!to || !subject || !emailTemplate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const htmlContent = NotificationEmail({
      appName: emailTemplate.projectName,
      appIcon: emailTemplate.projectIcon,
      notificationType: emailTemplate.notificationType,
      title: emailTemplate.title,
      message: emailTemplate.message,
      ctaText: emailTemplate.ctaText,
      ctaLink: emailTemplate.ctaLink,
    });

    const { data, error } = await resend.emails.send({
      from: 'Featurize <notifications@featurize.io>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
