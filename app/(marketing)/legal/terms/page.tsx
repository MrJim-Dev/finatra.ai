import React from 'react';
import Link from 'next/link';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4 leading-8">
        <strong>Effective Date: September 1, 2024</strong>
      </p>

      <p className="mb-4 leading-8">
        Welcome to Featurize! These Terms of Service ("Terms") govern your
        access to and use of the Featurize platform, including any content,
        functionality, and services offered on or through{' '}
        <Link
          href="https://www.featurize.io"
          className="text-primary hover:underline"
        >
          www.featurize.io
        </Link>{' '}
        (the "Website") or our mobile application (collectively, the "Service").
        By accessing or using the Service, you agree to be bound by these Terms.
      </p>

      <p className="mb-6 leading-8">
        Please read these Terms carefully before using the Service. If you do
        not agree to these Terms, you must not access or use the Service.
      </p>

      {[
        {
          title: '1. Acceptance of Terms',
          content:
            'By accessing and using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.',
        },
        {
          title: '2. Changes to the Terms of Service',
          content:
            'We reserve the right to update or modify these Terms at any time without prior notice. Your continued use of the Service after any changes or modifications constitutes your acceptance of the updated Terms. It is your responsibility to review these Terms periodically.',
        },
        {
          title: '3. Description of Service',
          content:
            'Featurize provides a platform for startups, software developers, and businesses to collect and prioritize feature requests from their users. The Service includes tools for managing multiple projects, gathering user feedback, upvoting features, and customizing feature request pages to align with your brand.',
        },
        {
          title: '4. Account Registration',
          content:
            '<strong>Eligibility:</strong> You must be at least 18 years old and capable of forming a binding contract to use the Service.\n\n<strong>Account Creation:</strong> To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.\n\n<strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.',
        },
        {
          title: '5. User Content',
          content:
            '<strong>Ownership:</strong> You retain ownership of all content, including feature requests, comments, and other materials, that you submit through the Service ("User Content"). By submitting User Content, you grant Featurize a worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, distribute, modify, and display such User Content in connection with the Service.\n\n<strong>Responsibility:</strong> You are solely responsible for the User Content you submit, and you represent and warrant that you have all rights necessary to grant the licenses described in these Terms.',
        },
        {
          title: '6. Prohibited Conduct',
          content:
            'You agree not to engage in any of the following prohibited activities:\n\n• Using the Service for any illegal or unauthorized purpose.\n• Posting or transmitting content that is harmful, offensive, obscene, or otherwise objectionable.\n• Impersonating another person or entity or falsely representing your affiliation with a person or entity.\n• Interfering with or disrupting the integrity or performance of the Service.\n• Attempting to gain unauthorized access to any part of the Service or its related systems or networks.',
        },
        {
          title: '7. Subscription and Payment',
          content:
            '<strong>Free and Paid Plans:</strong> Featurize may offer both free and paid subscription plans. The features and limitations of each plan will be described on the Website.\n\n<strong>Payment Terms:</strong> If you select a paid plan, you agree to pay all applicable fees as described on the Website. Payments will be billed on a recurring basis unless you cancel your subscription before the renewal date.\n\n<strong>Refunds:</strong> All fees are non-refundable unless otherwise required by law.',
        },
        {
          title: '8. Intellectual Property',
          content:
            '<strong>Featurize Ownership:</strong> Featurize owns all rights, title, and interest in and to the Service, including all associated intellectual property rights. These Terms do not grant you any rights to use the Featurize name, logo, or other trademarks.\n\n<strong>User Content:</strong> You retain ownership of your User Content, but you grant Featurize the rights described in Section 5 above.',
        },
        {
          title: '9. Privacy',
          content:
            "Your privacy is important to us. Please review our <Link href='/privacy-policy' className='text-primary hover:underline'>Privacy Policy</Link>, which explains how we collect, use, and protect your personal information. By using the Service, you agree to the collection and use of information in accordance with our Privacy Policy.",
        },
        {
          title: '10. Termination',
          content:
            '<strong>Termination by Featurize:</strong> We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. This includes the right to terminate accounts that violate these Terms.\n\n<strong>Termination by You:</strong> You may terminate your account at any time by following the instructions on the Website. Upon termination, you will lose access to any data stored on the Service.',
        },
        {
          title: '11. Disclaimer of Warranties',
          content:
            'The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. Featurize does not warrant that the Service will be uninterrupted, error-free, or secure, or that any defects will be corrected.',
        },
        {
          title: '12. Limitation of Liability',
          content:
            'In no event shall Featurize, its affiliates, or their respective officers, directors, employees, agents, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service, whether based on contract, tort, strict liability, or otherwise.',
        },
        {
          title: '13. Indemnification',
          content:
            "You agree to indemnify and hold harmless Featurize, its affiliates, and their respective officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Service.",
        },
        {
          title: '14. Governing Law and Dispute Resolution',
          content:
            '<strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law principles.\n\n<strong>Dispute Resolution:</strong> Any disputes arising out of or in connection with these Terms shall be resolved through binding arbitration in accordance with the rules of the Philippine Dispute Resolution Center. The arbitration shall take place in Manila, Philippines.',
        },
        {
          title: '15. Miscellaneous',
          content:
            '<strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Featurize with respect to the Service and supersede all prior or contemporaneous communications and proposals, whether oral or written.\n\n<strong>Severability:</strong> If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.\n\n<strong>Waiver:</strong> No waiver of any term or condition of these Terms shall be deemed a further or continuing waiver of such term or condition or any other term or condition.',
        },
      ].map((section, index) => (
        <section key={index} className="mb-8 leading-8">
          <h2 className="text-2xl font-semibold mb-3">{section.title}</h2>
          <p
            className="whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: section.content }}
          ></p>
        </section>
      ))}

      <section className="mb-8 leading-8">
        <h2 className="text-2xl font-semibold mb-3">16. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at{' '}
          <a
            href="mailto:support@featurize.io"
            className="text-primary hover:underline"
          >
            support@featurize.io
          </a>
          .
        </p>
      </section>
    </div>
  );
};

export default TermsOfServicePage;
