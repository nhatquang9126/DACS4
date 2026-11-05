'use client';

import React from 'react';
import CoursesPage from '@/components/pages/CoursesPage';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function CoursesAdminPage() {
  const { token } = useAuth();
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  return (
    <div className="p-8">
      <CoursesPage
        apiBaseUrl={apiUrl}
        authToken={token || undefined}
        onNavigateToTopics={(courseId) => {
          router.push(`/admin/content/topics?courseId=${courseId}`);
        }}
      />
    </div>
  );
}

