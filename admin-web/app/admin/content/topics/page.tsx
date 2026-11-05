'use client';

import React from 'react';
import TopicsPage from '@/components/pages/TopicsPage';
import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TopicsAdminPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const initialCourseId = courseIdParam ? parseInt(courseIdParam, 10) : undefined;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  return (
    <div className="p-8">
      <TopicsPage
        apiBaseUrl={apiUrl}
        authToken={token || undefined}
        initialCourseId={initialCourseId}
        onNavigateToMaterials={(topicId: number) => {
          router.push(`/admin/content/materials?topicId=${topicId}`);
        }}
      />
    </div>
  );
}
