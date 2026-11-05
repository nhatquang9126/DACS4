'use client';

import React from 'react';
import MaterialsPage from '@/components/pages/MaterialsPage';
import { useAuth } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';

export default function MaterialsAdminPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const topicIdParam = searchParams.get('topicId');
  const courseIdParam = searchParams.get('courseId');
  const initialTopicId = topicIdParam ? parseInt(topicIdParam, 10) : undefined;
  const initialCourseId = courseIdParam ? parseInt(courseIdParam, 10) : undefined;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  return (
    <div className="p-8">
      <MaterialsPage
        apiBaseUrl={apiUrl}
        authToken={token || undefined}
        initialTopicId={initialTopicId}
        initialCourseId={initialCourseId}
      />
    </div>
  );
}

