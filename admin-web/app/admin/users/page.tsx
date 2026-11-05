'use client';

import React from 'react';
import UsersPage from '@/components/pages/UsersPage';
import { useAuth } from '@/lib/auth';

export default function UsersAdminPage() {
  const { token, user } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  return (
    <div className="p-8">
      <UsersPage
        apiBaseUrl={apiUrl}
        authToken={token || undefined}
        currentUserId={user?.id}
      />
    </div>
  );
}

