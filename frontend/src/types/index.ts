export interface User {
id: number;
email: string;
role: 'STUDENT' | 'ADMIN' | string;
}

export interface LearningStatistics {
study_sessions: {
    total_completed_sessions: number;
    total_study_minutes: number;
    total_study_hours: number;
};
tasks: {
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
};
quizzes: {
    total_attempts: number;
    average_score: number | null;
};
courses: {
    active_enrollments: number;
};
}

export interface Course {
id: number;
code: string;
name: string;
credits: number;
topics?: Topic[];
}

export interface GradeComponent {
id: number;
enrollment_id: number;
name: string;
weight: number;
score: number | null;
}

export interface EnrollmentSummary {
currentAverageScore: number | null;
completedWeightRatio: number;
totalAssignedWeightRatio: number;
isFinalScore: boolean;
note: string;
}

export interface Enrollment {
id: number;
semester: string;
status: string;
course: Course;
gradeComponents?: GradeComponent[];
summary?: EnrollmentSummary;
}

export interface Task {
id: number;
user_id: number;
enrollment_id: number;
title: string;
description: string | null;
due_date: string;
status: 'TODO' | 'IN_PROGRESS' | 'DONE';
created_at: string;
completed_at: string | null;
enrollment?: Enrollment;
}

export interface StudyPlanItem {
id: number;
plan_id?: number;
reference_id?: number | null;
title: string;
description: string | null;
action_type: 'REVIEW_THEORY' | 'PRACTICE_QUIZ' | 'ADVANCED_TOPIC' | string;
status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
priority: number;
created_at?: string;
}

export interface StudyPlan {
id: number;
user_id: number;
status: 'ACTIVE' | 'COMPLETED';
created_at: string;
items: StudyPlanItem[];
}

export interface Material {
id: number;
topic_id: number;
title: string;
content_type: 'MARKDOWN' | 'TEXT' | 'VIDEO_URL' | string;
content: string;
order_index: number;
created_at?: string;
}

export interface Question {
id: number;
quiz_id: number;
question_text: string;
options: string | string[]; // Chuỗi JSON hoặc mảng options
correct_option_index?: number;
explanation?: string | null;
skill_tag: string;
}

export interface QuizOverview {
id: number;
topic_id: number;
title: string;
description: string | null;
time_limit_minutes: number;
}

export interface QuizDetail {
id: number;
topic_id: number;
title: string;
description: string | null;
time_limit_minutes: number;
total_questions?: number;
questions: Question[];
}

export interface Topic {
id: number;
course_id: number;
title: string;
description: string | null;
order_index: number;
materials?: Material[];
quizzes?: QuizOverview[];
_count?: {
    materials?: number;
};
}

export interface SkillBreakdownItem {
total: number;
correct: number;
percentage: number;
}

export interface QuizAttemptResult {
id: number;
user_id: number;
quiz_id: number;
score: number;
total_questions: number;
correct_answers_count: number;
skill_breakdown: string | Record<string, SkillBreakdownItem>;
created_at: string;
quiz?: {
    title: string;
};
details?: {
    question_id: number;
    question_text: string;
    options: string[];
    selected_option_index: number;
    correct_option_index: number;
    is_correct: boolean;
    explanation: string | null;
    skill_tag: string;
}[];
}

export interface TutorMessage {
id: number;
session_id: number;
sender: 'USER' | 'AI';
content: string;
created_at: string;
}

export interface TutorSession {
id: number;
user_id: number;
topic: string | null;
created_at: string;
messages?: TutorMessage[];
}

export interface StudySession {
id: number;
user_id: number;
enrollment_id?: number | null;
start_time: string;
end_time?: string | null;
duration_minutes?: number | null;
status?: string;
notes?: string | null;
created_at: string;
enrollment?: {
    id: number;
    semester: string;
    course: {
    code: string;
    name: string;
    };
};
}
