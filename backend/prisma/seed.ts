import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient();

async function main() {
console.log('🌱 Đang khởi tạo dữ liệu seed khớp 100% với Schema...');

// 1. Seed User (Mật khẩu mặc định: "123456")
const passwordHash = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'sinhvien@gmail.com' },
    update: { password_hash: passwordHash }, // Cập nhật mật khẩu chuẩn
    create: {
      id: 1,
      email: 'sinhvien@gmail.com',
      password_hash: passwordHash,
      role: 'STUDENT',
    },
  });

  // 1b. Seed Admin User (Mật khẩu mặc định: "123456")
  await prisma.user.upsert({
    where: { email: 'admin@smartstudy.edu.vn' },
    update: { password_hash: passwordHash, role: 'ADMIN' },
    create: {
      email: 'admin@smartstudy.edu.vn',
      password_hash: passwordHash,
      role: 'ADMIN',
    },
  });

// 2. Seed Course
const course = await prisma.course.upsert({
    where: { code: 'INT2203' },
    update: { name: 'Cấu trúc Dữ liệu và Giải thuật', credits: 3 },
    create: {
    id: 1,
    code: 'INT2203',
    name: 'Cấu trúc Dữ liệu và Giải thuật',
    credits: 3,
    },
});

// 3. Seed Enrollment
const enrollment = await prisma.enrollment.upsert({
    where: {
    user_id_course_id_semester: {
        user_id: user.id,
        course_id: course.id,
        semester: 'HK1-2026',
    },
    },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    course_id: course.id,
    semester: 'HK1-2026',
    status: 'ACTIVE',
    },
});

// 4. Seed GradeComponents (Điểm thành phần)
await prisma.gradeComponent.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    enrollment_id: enrollment.id,
    name: 'Chuyên cần',
    weight: 0.1,
    score: 9.0,
    },
});

await prisma.gradeComponent.upsert({
    where: { id: 2 },
    update: {},
    create: {
    id: 2,
    enrollment_id: enrollment.id,
    name: 'Kiểm tra giữa kỳ',
    weight: 0.3,
    score: 8.5,
    },
});

// 5. Seed Task (Nhiệm vụ - Khớp theo model Task trong schema.prisma)
await prisma.task.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    enrollment_id: enrollment.id,
    title: 'Làm bài tập con trỏ & Danh sách liên kết',
    description: 'Hoàn thành các bài tập chèn/xóa nút trong C++',
    due_date: new Date('2026-10-30T23:59:59Z'),
    status: 'TODO',
    },
});

// 6. Seed Topic (Chủ đề học tập)
const topic1 = await prisma.topic.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    course_id: course.id,
    title: 'Danh sách liên kết (Linked List)',
    description: 'Khái niệm con trỏ, danh sách liên kết đơn, đôi và các thao tác chèn/xóa nút.',
    order_index: 1,
    },
});

// 7. Seed Material (Tài liệu học tập)
await prisma.material.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    topic_id: topic1.id,
    title: 'Lý thuyết Cơ bản về Danh sách liên kết đơn',
    content_type: 'MARKDOWN',
    content: `# Danh sách liên kết đơn\n\nDanh sách liên kết đơn là tập hợp các nút (Node), trong đó mỗi nút gồm 2 thành phần:\n1. **Data**: Lưu trữ giá trị phần tử.\n2. **Next**: Con trỏ trỏ đến nút kế tiếp trong bộ nhớ.`,
    order_index: 1,
    },
});

// 8. Seed Quiz & Question (Bài kiểm tra & Câu hỏi)
const quiz = await prisma.quiz.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    topic_id: topic1.id,
    title: 'Kiểm tra Kiến thức: Danh sách liên kết đơn',
    description: 'Đánh giá mức độ hiểu về con trỏ, duyệt và thao tác thêm/xóa nút.',
    time_limit_minutes: 10,
    },
});

const question1 = await prisma.question.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    quiz_id: quiz.id,
    question_text: 'Thành phần next trong một nút của Danh sách liên kết đơn dùng để làm gì?',
    options: JSON.stringify([
        'Lưu trữ dữ liệu số nguyên',
        'Lưu địa chỉ của nút tiếp theo trong bộ nhớ',
        'Lưu con trỏ trỏ về nút phía trước',
        'Lưu độ dài của danh sách',
    ]),
    correct_option_index: 1,
    explanation: 'Trong DSLK đơn, nút gồm giá trị data và con trỏ next trỏ đến địa chỉ phần tử tiếp theo.',
    skill_tag: 'khai_bao_con_tro',
    },
});

const question2 = await prisma.question.upsert({
    where: { id: 2 },
    update: {},
    create: {
    id: 2,
    quiz_id: quiz.id,
    question_text: 'Độ phức tạp thời gian để chèn một nút vào ĐẦU danh sách liên kết đơn là bao nhiêu?',
    options: JSON.stringify(['O(1)', 'O(n)', 'O(log n)', 'O(n^2)']),
    correct_option_index: 0,
    explanation: 'Chèn đầu chỉ cần cập nhật con trỏ next của nút mới và con trỏ head, không cần duyệt danh sách nên tốn O(1).',
    skill_tag: 'them_xoa_nut',
    },
});

// 9. Seed QuizAttempt & QuizAnswer (Lượt làm bài & Chi tiết câu trả lời)
const quizAttempt = await prisma.quizAttempt.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    quiz_id: quiz.id,
    score: 5.0,
    total_questions: 2,
    correct_answers_count: 1,
    skill_breakdown: JSON.stringify({
        khai_bao_con_tro: { total: 1, correct: 1, percentage: 100 },
        them_xoa_nut: { total: 1, correct: 0, percentage: 0 },
    }),
    },
});

await prisma.quizAnswer.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    attempt_id: quizAttempt.id,
    question_id: question1.id,
    selected_option_index: 1,
    is_correct: true,
    },
});

await prisma.quizAnswer.upsert({
    where: { id: 2 },
    update: {},
    create: {
    id: 2,
    attempt_id: quizAttempt.id,
    question_id: question2.id,
    selected_option_index: 1,
    is_correct: false,
    },
});

// 10. Seed StudyPlan & StudyPlanItem (Lộ trình học)
const studyPlan = await prisma.studyPlan.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    status: 'ACTIVE',
    },
});

await prisma.studyPlanItem.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    plan_id: studyPlan.id,
    title: 'Ôn tập khẩn cấp: them_xoa_nut',
    description: 'Bạn đạt 0% ở kỹ năng này. Hãy xem lại bài giảng và các ví dụ.',
    action_type: 'REVIEW_THEORY',
    reference_id: 1,
    status: 'PENDING',
    priority: 1,
    },
});

// 11. Seed Prediction & Recommendation (Dự đoán AI & Khuyến nghị)
const prediction = await prisma.prediction.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    risk_level: 'MEDIUM',
    model_version: 'v1.0.0',
    features_used: JSON.stringify({ avg_quiz_score: 5.0, completed_tasks_ratio: 0.5 }),
    },
});

await prisma.recommendation.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    prediction_id: prediction.id,
    action_text: 'Ôn tập lại thao tác thêm/xóa nút trong Danh sách liên kết',
    reason: 'Điểm kiểm tra kỹ năng "them_xoa_nut" đang dưới 50%',
    priority: 1,
    status: 'PENDING',
    },
});

// 12. Seed TutorSession & TutorMessage (Gia sư AI Chat)
const tutorSession = await prisma.tutorSession.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    topic: 'Hỏi về con trỏ C++',
    },
});

await prisma.tutorMessage.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    session_id: tutorSession.id,
    sender: 'USER',
    content: 'Con trỏ NULL trong C++ là gì?',
    },
});

await prisma.tutorMessage.upsert({
    where: { id: 2 },
    update: {},
    create: {
    id: 2,
    session_id: tutorSession.id,
    sender: 'AI',
    content: 'Con trỏ NULL là con trỏ không trỏ tới bất kỳ địa chỉ bộ nhớ hợp lệ nào.',
    },
});

// 13. Seed StudySession (Phiên học bấm giờ)
await prisma.studySession.upsert({
    where: { id: 1 },
    update: {},
    create: {
    id: 1,
    user_id: user.id,
    enrollment_id: enrollment.id,
    start_time: new Date('2026-10-22T08:00:00Z'),
    end_time: new Date('2026-10-22T08:25:00Z'),
    duration_minutes: 25,
    status: 'COMPLETED',
    notes: 'Phiên Pomodoro 1: Đọc lý thuyết Danh sách liên kết',
    },
});

console.log('✅ Seed toàn bộ dữ liệu mẫu hệ thống thành công!');
}

main()
.catch((e) => {
    console.error('❌ Lỗi khi thực thi seed:', e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
});