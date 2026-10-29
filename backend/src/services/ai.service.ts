
import OpenAI from 'openai';

// Đọc chế độ từ file .env
const isMockMode = process.env.AI_MOCK_MODE === 'true';

// Khởi tạo OpenAI khi sử dụng chế độ thật
const openai = isMockMode
? null
: new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    });

export const askAITutor = async (
prompt: string,
context?: string,
): Promise<string> => {
// MOCK AI: Không gọi OpenAI API
if (isMockMode) {
    console.log('[Mock AI] Đang xử lý câu hỏi:', prompt);

    const question = prompt.toLowerCase();

    if (
    question.includes('json') ||
    question.includes('tạo câu hỏi') ||
    question.includes('trắc nghiệm')
    ) {
    return JSON.stringify(
        {
        questions: [
            {
            question: 'Cấu trúc dữ liệu Stack hoạt động theo nguyên tắc nào?',
            options: [
                'FIFO - Vào trước, ra trước',
                'LIFO - Vào sau, ra trước',
                'Truy cập ngẫu nhiên',
                'Sắp xếp theo thứ tự tăng dần',
            ],
            answer: 'B',
            explanation:
                'Stack hoạt động theo nguyên tắc LIFO: phần tử được thêm vào sau cùng sẽ được lấy ra trước.',
            },
        ],
        },
        null,
        2,
    );
    }

    if (
    question.includes('lỗi') ||
    question.includes('error') ||
    question.includes('bug')
    ) {
    return `Đây là phản hồi giả lập từ Mock AI.

Để tìm nguyên nhân lỗi, bạn hãy:
1. Đọc thông báo lỗi và xác định dòng code liên quan.
2. Kiểm tra kiểu dữ liệu, biến và tham số truyền vào.
3. Kiểm tra điều kiện và luồng xử lý.
4. Thử sửa từng bước rồi chạy lại chương trình.

Bạn có thể gửi thông báo lỗi và đoạn code liên quan để được hướng dẫn cụ thể hơn.`;
    }

    if (
    question.includes('độ phức tạp') ||
    question.includes('big o') ||
    question.includes('o(n)')
    ) {
    return `Độ phức tạp thuật toán mô tả cách thời gian hoặc bộ nhớ sử dụng tăng theo kích thước đầu vào.

Một số mức thường gặp:
- O(1): Thời gian không phụ thuộc kích thước đầu vào.
- O(log n): Ví dụ tìm kiếm nhị phân.
- O(n): Ví dụ duyệt qua một mảng.
- O(n log n): Ví dụ Merge Sort.
- O(n²): Ví dụ hai vòng lặp lồng nhau trên cùng một tập dữ liệu.

Gợi ý: Hãy thử đếm số lần thực hiện thao tác chính trong thuật toán của bạn.`;
    }

    return `Chào bạn! Mình là gia sư lập trình đang chạy ở chế độ Mock AI.

Với câu hỏi: "${prompt}"

${context ? `Ngữ cảnh học tập: ${context}\n\n` : ''}Bạn hãy thử chia vấn đề thành các bước nhỏ:
1. Xác định kiến thức hoặc khái niệm đang cần hiểu.
2. Phân tích dữ liệu đầu vào và kết quả mong muốn.
3. Viết các bước giải quyết bằng lời hoặc giả mã.
4. Kiểm tra bằng một ví dụ đơn giản.

Lưu ý: Đây là câu trả lời giả lập để kiểm thử chức năng chat, không phải phản hồi được tạo bởi mô hình AI thật.`;
}

// OPENAI THẬT
try {
    const systemPrompt = `Bạn là một gia sư lập trình đại học nhiệt tình, chuyên về Cấu trúc Dữ liệu và Giải thuật.
Quy tắc:
1. Trả lời bằng tiếng Việt thân thiện, rõ ràng, dễ hiểu.
2. Không làm hộ bài tập từ A-Z; hãy đưa ra gợi ý và dẫn dắt sinh viên.
3. Khi giải thích lỗi, chỉ ra nguyên nhân và cách khắc phục.
4. Trình bày code bằng Markdown gọn gàng.
${context ? `\nNgữ cảnh hiện tại của sinh viên: ${context}` : ''}`;

    const question = prompt.toLowerCase();
    const isJsonExpected =
    question.includes('json') ||
    question.includes('tạo câu hỏi') ||
    question.includes('trắc nghiệm');

    const response = await openai!.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    ...(isJsonExpected
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    });

    const reply = response.choices[0].message.content;

    if (!reply) {
    throw new Error('OpenAI trả về phản hồi rỗng');
    }

    return reply;
} catch (error) {
    console.error('Lỗi khi gọi OpenAI API:', error);
    throw new Error(
    'Gia sư AI hiện không khả dụng. Vui lòng thử lại sau.',
    );
}
};
