// Web Admin Dashboard Component Exports for SmartStudy AI
export { default as AdminDashboard } from './AdminDashboard';
export type { AdminTab } from './AdminDashboard';

// Pages / Views
export { default as CoursesPage } from './pages/CoursesPage';
export type { CourseItem } from './pages/CoursesPage';

export { default as TopicsPage } from './pages/TopicsPage';
export type { TopicItem } from './pages/TopicsPage';

export { default as MaterialsPage } from './pages/MaterialsPage';
export type { MaterialItem } from './pages/MaterialsPage';

export { default as UsersPage } from './pages/UsersPage';
export type { UserItem } from './pages/UsersPage';

export { default as QuizzesPage } from './pages/QuizzesPage';
export type { QuizItem, QuestionItem } from './pages/QuizzesPage';

// Reusable Components
export { default as DataTable } from './components/DataTable';
export type { Column } from './components/DataTable';

export { default as SearchBar } from './components/SearchBar';
export { default as Pagination } from './components/Pagination';

export { default as ConfirmDeleteModal } from './components/ConfirmDeleteModal';
export type { CascadeDetail } from './components/ConfirmDeleteModal';

export { default as MaterialEditorModal } from './components/MaterialEditorModal';
export type { MaterialFormData, MaterialType } from './components/MaterialEditorModal';

export { default as Breadcrumb } from './components/Breadcrumb';
export type { BreadcrumbItem } from './components/Breadcrumb';

export { ToastProvider, useToast } from './components/Toast';
export type { ToastType, ToastItem } from './components/Toast';


