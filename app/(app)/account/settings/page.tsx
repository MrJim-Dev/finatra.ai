import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import ProfileForm from '@/components/profile-form';
import { getCurrentUserServer } from '@/lib/session';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Featurize',
  description: 'Sign in to your Featurize account to manage user feedback.',
};

async function Profile() {
  const user = await getCurrentUserServer();

  return (
    <section className="container max-w-2xl mx-auto">
      <div className="py-10">
        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm userData={user} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default Profile;

