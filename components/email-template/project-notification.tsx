interface NotificationEmailProps {
  appName?: string;
  appIcon?: string;
  notificationType: string;
  title: string;
  message: string;
  ctaText: string;
  ctaLink: string;
}

export default function NotificationEmail({
  appName = 'Featurize',
  appIcon = 'https://featurize.io/logo.png',
  notificationType,
  title,
  message,
  ctaText,
  ctaLink,
}: NotificationEmailProps) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${appName} - ${notificationType}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { display: flex; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .header img { width: 40px; height: 40px; margin-right: 10px; }
        .content { padding: 20px 0; }
        .cta-button { display: inline-block; background-color: #007bff; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${appIcon}" alt="${appName} logo" />
          <h1 style="margin:0;">${appName}</h1>
        </div>
        <div class="content">
          <h2 style="margin:0;">${title}</h2>
          <p>${message}</p>
          <a href="${ctaLink}" class="cta-button">${ctaText}</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Featurize. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
