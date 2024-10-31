import React from 'react';
import Link from 'next/link';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4 leading-8">
        <strong>Effective Date: September 1, 2024</strong>
      </p>

      <p className="mb-4 leading-8">
        At Featurize, we are committed to protecting your privacy. This Privacy
        Policy explains how we collect, use, disclose, and safeguard your
        information when you use our platform, including our website{' '}
        <Link
          href="https://www.featurize.io"
          className="text-primary hover:underline"
        >
          www.featurize.io
        </Link>{' '}
        (the "Website") and any related services (collectively, the "Service").
        By using the Service, you agree to the collection and use of information
        in accordance with this Privacy Policy.
      </p>

      <p className="mb-6 leading-8">
        Please read this Privacy Policy carefully. If you do not agree with the
        terms of this Privacy Policy, please do not use the Service.
      </p>

      {[
        {
          title: '1. Information We Collect',
          content: `<strong>1.1 Personal Information</strong>
          When you register for an account or interact with the Service, we may collect personal information, including but not limited to:
          
          • Name
          • Email address
          • Company name
          • Billing information (for paid subscriptions)
          • Profile information, such as your username and profile picture
          
          <strong>1.2 Non-Personal Information</strong>
          We may also collect non-personal information about you, such as:
          
          • Device information: including IP address, browser type, operating system, and device identifiers.
          • Usage data: including information about how you use the Service, such as pages viewed, time spent on the Service, and interaction data.
          • Cookies and tracking technologies: including cookies, beacons, and similar technologies to track your activity on the Service and hold certain information.
          
          <strong>1.3 User Content</strong>
          When you use the Service to submit feature requests, comments, or other content, we may collect and store the content you provide.`,
        },
        {
          title: '2. How We Use Your Information',
          content: `<strong>2.1 To Provide and Improve the Service</strong>
          We use your information to:
          
          • Operate and maintain the Service.
          • Personalize your experience on the Service, including displaying your brand, color schemes, and logo.
          • Process transactions and manage your account.
          • Respond to your inquiries and provide customer support.
          • Analyze usage trends and improve the functionality and performance of the Service.
          
          <strong>2.2 Communication</strong>
          We may use your email address to:
          
          • Send you account-related notifications, such as password resets and subscription updates.
          • Send you promotional materials or newsletters, subject to your preferences.
          • Respond to your inquiries or provide customer support.
          
          <strong>2.3 Compliance and Protection</strong>
          We may use your information to:
          
          • Comply with legal obligations and enforce our terms and conditions.
          • Protect the security and integrity of the Service.
          • Prevent fraud, abuse, and other illegal activities.`,
        },
        {
          title: '3. How We Share Your Information',
          content: `<strong>3.1 Service Providers</strong>
          We may share your information with third-party service providers who assist us in operating the Service, such as payment processors, hosting providers, and analytics providers. These service providers are contractually obligated to protect your information and use it only for the purposes for which we disclose it to them.
          
          <strong>3.2 Business Transfers</strong>
          In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email or prominent notice on the Service of any such change in ownership or control.
          
          <strong>3.3 Legal Obligations</strong>
          We may disclose your information if required to do so by law or in response to a subpoena, court order, or other legal process. We may also disclose your information to protect our rights, property, or safety, or the rights, property, or safety of others.
          
          <strong>3.4 With Your Consent</strong>
          We may share your information with third parties when you have given us your explicit consent to do so.`,
        },
        {
          title: '4. Your Choices and Rights',
          content: `<strong>4.1 Access and Update Your Information</strong>
          You can access, update, or delete your personal information by logging into your account and making the necessary changes. If you need assistance, you may contact us at <a href="mailto:support@featurize.io" className="text-primary hover:underline">support@featurize.io</a>.
          
          <strong>4.2 Opt-Out of Communications</strong>
          You can opt out of receiving promotional communications from us by following the unsubscribe instructions provided in those communications. Please note that you may still receive account-related communications even if you opt out of promotional emails.
          
          <strong>4.3 Cookies and Tracking Technologies</strong>
          You can manage your cookie preferences through your browser settings. However, disabling cookies may affect your ability to use certain features of the Service.
          
          <strong>4.4 Data Retention</strong>
          We will retain your personal information for as long as necessary to provide the Service, comply with our legal obligations, resolve disputes, and enforce our agreements. When we no longer need your personal information, we will securely delete or anonymize it.`,
        },
        {
          title: '5. Security',
          content:
            'We take the security of your information seriously and implement reasonable administrative, technical, and physical safeguards to protect your information from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the internet or method of electronic storage is completely secure, and we cannot guarantee its absolute security.',
        },
        {
          title: '6. International Data Transfers',
          content:
            'If you are accessing the Service from outside the Philippines, please note that your information may be transferred to, stored, and processed in a country other than your own. By using the Service, you consent to the transfer of your information to countries outside your country of residence, including the Philippines, where data protection laws may differ from those in your country.',
        },
        {
          title: "7. Children's Privacy",
          content:
            'The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently collected personal information from a child under 18, we will take steps to delete such information from our records.',
        },
        {
          title: '8. Changes to This Privacy Policy',
          content:
            'We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or by posting a prominent notice on the Service. Your continued use of the Service after any changes to this Privacy Policy constitutes your acceptance of the updated policy.',
        },
      ].map((section, index) => (
        <section key={index} className="mb-8 leading-8">
          <h2 className="text-2xl font-semibold mb-3">{section.title}</h2>
          <div
            className="whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: section.content }}
          ></div>
        </section>
      ))}

      <section className="mb-8 leading-8">
        <h2 className="text-2xl font-semibold mb-3">9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at:{' '}
          <a
            href="mailto:support@featurize.io"
            className="text-primary hover:underline"
          >
            support@featurize.io
          </a>
        </p>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
