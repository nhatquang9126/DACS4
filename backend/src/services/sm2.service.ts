/**
 * Thuật toán SuperMemo-2 (SM-2) phục vụ ôn tập ngắt quãng (Spaced Repetition).
 * 
 * Các tham số đầu vào:
 * - quality: Điểm đánh giá của người học (0 đến 5)
 *   0: Hoàn toàn không nhớ gì (Blackout)
 *   1: Trả lời sai sau khi xem đáp án
 *   2: Trả lời sai nhưng nhớ lại được khi thấy đáp án
 *   3: Nhớ đúng nhưng tốn nhiều thời gian / khó khăn (Pass)
 *   4: Nhớ tốt sau một chút đắn đo (Good)
 *   5: Nhớ hoàn hảo, trả lời ngay lập tức (Perfect)
 * - repetition: Số lần ôn tập thành công liên tiếp hiện tại
 * - interval: Khoảng cách ôn tập hiện tại (tính bằng ngày)
 * - easeFactor: Hệ số dễ (Ease Factor - EF), mặc định ban đầu là 2.5, tối thiểu 1.3
 */

export interface SM2Input {
  quality: number; // 0..5
  repetition: number;
  interval: number;
  easeFactor: number;
}

export interface SM2Output {
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: Date;
}

export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetition, interval, easeFactor } = input;

  // Giới hạn điểm đánh giá trong khoảng [0, 5]
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let newRepetition = repetition;
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  // 1. Tính toán lại hệ số Ease Factor theo công thức chuẩn:
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Giới hạn hệ số Ease Factor không bao giờ giảm xuống dưới 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }
  newEaseFactor = Math.round(newEaseFactor * 100) / 100;

  // 2. Cập nhật số lần lặp và khoảng thời gian ôn tập (ngày)
  if (q < 3) {
    // Nếu điểm dưới 3 (quên hoặc sai): reset chu kỳ ôn tập về đầu
    newRepetition = 0;
    newInterval = 1; // Ôn lại sau 1 ngày
  } else {
    // Nếu điểm đạt (>= 3):
    if (newRepetition === 0) {
      newInterval = 1; // Lần đầu: 1 ngày
    } else if (newRepetition === 1) {
      newInterval = 6; // Lần thứ hai: 6 ngày
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
    newRepetition += 1;
  }

  // 3. Tính mốc thời gian tiếp theo cần ôn tập (nextReviewDate)
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  // Đặt thời gian vào đầu ngày (00:00:00) hoặc thời điểm hiện tại cộng ngày
  nextReviewDate.setSeconds(0, 0);

  return {
    repetition: newRepetition,
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReviewDate,
  };
}

