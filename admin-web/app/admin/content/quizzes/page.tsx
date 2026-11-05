'use client';

import React from 'react';
import QuizzesPage from '@/components/pages/QuizzesPage';
import { useAuth } from '@/lib/auth';

export default function QuizzesAdminPage() {
  const { token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  return (
    <div className="p-8">
      <QuizzesPage
        apiBaseUrl={apiUrl}
        authToken={token || undefined}
      />
    </div>
  );
}

