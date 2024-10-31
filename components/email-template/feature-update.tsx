import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from '@react-email/components';
import { FileX } from 'lucide-react';
import * as React from 'react';

interface NotificationEmailProps {
  firstName?: string;
  appName?: string;
  appIcon?: string;
  ctaText?: string;
  ctaLink?: string;
}

export const FeatureUpdateTemplate: React.FC<NotificationEmailProps> = ({
  firstName = 'there',
  appName = 'Featurize',
  appIcon = 'https://featurize.io/logo.png',
  ctaText = 'Explore Now',
  ctaLink = 'https://featurize.io',
}) => {
  const previewText = `Check out the latest updates on ${appName}!`;

  return (
    <Html>
      <Head>
        <style>
          {`
            @media only screen and (min-width: 601px) {
              .container { max-width: 600px !important; }
            }
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; }
              .content { padding: 0 10px !important; }
              .h1 { font-size: 24px !important; }
              .h2 { font-size: 20px !important; }
              .paragraph { font-size: 16px !important; line-height: 1.5 !important; }
              .button { font-size: 16px !important; padding: 12px 20px !important; }
              .footer { font-size: 12px !important; }
              .imageContainer { flex-direction: column !important; }
              .imageStyle { width: 100% !important; margin-bottom: 10px !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <div style={container} className="container">
          <div style={headerStyle}>
            <img
              src={appIcon}
              width="30"
              height="30"
              alt={`${appName} logo`}
              style={logo}
            />
            <Heading style={h1}>{appName}</Heading>
          </div>
          <Hr style={hrStyle} />
          <div style={bodyStyle} className="content">
            <Heading as="h2" style={h2} className="h2">
              Feature Update 10/23/2024
            </Heading>
            <Text style={paragraph} className="paragraph">
              Hi {firstName},
            </Text>
            <Text style={paragraph}>
              We're excited to announce the latest updates on {appName}! Here's
              what's new:
            </Text>
            <Text style={paragraph}>
              🚀 <strong>Views Feature</strong>
              <br />
              You can now choose between Grid, List, and Board views to organize
              your project requests the way you prefer!
            </Text>
            <div style={imageContainer} className="imageContainer">
              <div
                style={{ width: 'calc(47%)', borderRadius: '10px !important' }}
              >
                <img
                  src="https://ockbpehnsndpzibjozkn.supabase.co/storage/v1/object/public/assets/list-view.png"
                  alt="List View"
                  style={imageStyle}
                />
              </div>
              <div
                style={{
                  width: 'calc(47%)',
                }}
              >
                <img
                  src="https://ockbpehnsndpzibjozkn.supabase.co/storage/v1/object/public/assets/board-view.png"
                  alt="board"
                  style={imageStyle}
                />
              </div>
            </div>
            <Text style={paragraph}>
              🌐 <strong>Community Page</strong>
              <br />
              Visit our new{' '}
              <Link href="https://featurize.io/community" style={link}>
                Community Page
              </Link>{' '}
              to explore public projects and engage with others. This page will
              also help attract more visitors and traffic.
            </Text>
            <div style={{ maxWidth: '100%' }}>
              <img
                src="https://ockbpehnsndpzibjozkn.supabase.co/storage/v1/object/public/assets/community.png"
                alt="community"
                style={{
                  borderRadius: '10px',
                  marginBottom: '24px',
                  maxWidth: '100% !important',
                }}
              />
            </div>

            <Text style={paragraph}>
              📧 <strong>Email Notifications</strong>
              <br />
              Stay informed with real-time email alerts whenever users request
              new features, comment on existing ones, and more.
            </Text>
            <div style={{ maxWidth: '100%' }}>
              <img
                src="https://ockbpehnsndpzibjozkn.supabase.co/storage/v1/object/public/assets/notification.png"
                alt="board"
                style={{
                  borderRadius: '10px',
                  marginBottom: '24px',
                  maxWidth: '100%',
                }}
              />
            </div>
            <Text style={{ ...paragraph, marginBottom: 0 }}>
              Click the button below to explore these updates and enhance your{' '}
              {appName} experience!
            </Text>
            <a style={button} href={ctaLink}>
              {ctaText}
            </a>
            <Text style={paragraph}>
              📝 <strong>Got a Feature Idea?</strong>
              <br />
              We'd love to hear your suggestions! You can request a new feature
              directly on our{' '}
              <Link href="https://featurize.io/p/featurize" style={link}>
                Feature Request Page
              </Link>
              .
            </Text>
          </div>
          <Hr style={hrStyle} />
          <Text style={footer} className="footer">
            &copy; {new Date().getFullYear()} {appName}. All rights reserved.
          </Text>
        </div>
      </Body>
    </Html>
  );
};

export default FeatureUpdateTemplate;

const imageContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'flex-start',
  marginBottom: '24px',
};

const imageStyle = {
  width: '100%',
  maxWidth: '100% !important',
  height: 'auto !important',
  borderRadius: '10px',
};

const main = {
  backgroundColor: '#f6f9fc !important',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto !important',
  width: '100% !important',
  maxWidth: '600px !important',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  gap: '10px',
};

const logo = {
  marginRight: '10px !important',
  display: 'block !important',
  margin: '0 auto !important',
};

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const h2 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  padding: '0',
  textAlign: 'center' as const,
};

const bodyStyle: React.CSSProperties = {
  padding: '0 20px !important',
  boxSizing: 'border-box' as const,
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  textAlign: 'left' as const,
  margin: '0 0 24px',
};

const button: React.CSSProperties = {
  backgroundColor: '#4cb882',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '10px 20px',
  margin: '24px auto',
};

const link = {
  color: '#4cb882',
  textDecoration: 'underline',
};

const hrStyle = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '1.5',
  textAlign: 'center' as const,
  margin: '0',
  padding: '20px 0',
};
