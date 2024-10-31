'use client';

import React, { useState } from 'react';
import { Resend } from 'resend';
import FeatureUpdateTemplate from '@/components/email-template/feature-update';
import { renderToString } from 'react-dom/server';
import axios from 'axios';

const emailList = [
  { to: 'mrjim.development@gmail.com', firstName: 'MrJim' },
  { to: 'jarocampooo@gmail.com', firstName: 'James' },
  { to: 'mombrae@cypressnorth.com', firstName: 'Matthew' },
  { to: 'hello@makanihomes.com', firstName: 'Yara' },
  { to: 'tamago@gmail.com', firstName: 'Tamagk' },
  { to: 'mark@cxassist.io', firstName: 'Mark' },
  { to: 'cr@mobaro.com', firstName: 'Christian' },
  { to: 'edgeeffectmedia@gmail.com', firstName: 'Jessie' },
  { to: 'verynyze@gmail.com', firstName: 'Nathaniel' },
  { to: 'bermarvillarazojr@gmail.com', firstName: 'Bermar' },
];

const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY);

const SendEmailPage = () => {
  const [sendingStatus, setSendingStatus] = useState<string>('');

  const sendEmails = async () => {
    console.log('Starting email sending process');
    setSendingStatus('Sending emails...');
    let successCount = 0;
    let failCount = 0;

    for (const recipient of emailList) {
      console.log(`Preparing email for ${recipient.to}`);
      const emailTemplateProps = {
        firstName: recipient.firstName,
        appName: 'Featurize',
        appIcon: 'https://featurize.io/logo.png',
        ctaText: 'Explore Now',
        ctaLink: 'https://featurize.io',
      };

      const emailHtml = renderToString(
        <FeatureUpdateTemplate {...emailTemplateProps} />
      );

      try {
        console.log(`Attempting to send email to ${recipient.to}`);

        // Replace the direct Resend API call with an API route call
        const response = await axios.post('/api/update-users', {
          to: `${recipient.firstName} <${recipient.to}>`,
          subject: 'Feature Update from Featurize',
          html: emailHtml,
        });

        if (response.status === 200) {
          successCount++;
          console.log(
            `Email sent successfully to ${recipient.to}:`,
            response.data
          );
        } else {
          failCount++;
          console.error(
            `Failed to send email to ${recipient.to}:`,
            response.data
          );
          throw new Error(`Email sending failed: ${response.data.message}`);
        }
      } catch (error) {
        failCount++;
        console.error(`Error sending email to ${recipient.to}:`, error);
        if (error instanceof Error) {
          setSendingStatus(`Error: ${error.message}`);
        } else {
          setSendingStatus('An unknown error occurred');
        }
      }
    }

    setSendingStatus(
      `Emails sent. Success: ${successCount}, Failed: ${failCount}`
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Send Feature Update Emails</h1>
      <button
        onClick={sendEmails}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Send Emails
      </button>
      {sendingStatus && <p className="mt-4">{sendingStatus}</p>}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Email Preview:</h2>
        <div className="border p-4 rounded">
          <FeatureUpdateTemplate />
        </div>
      </div>
    </div>
  );
};

export default SendEmailPage;
