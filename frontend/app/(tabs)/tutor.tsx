import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import {
  Bot,
  Send,
  Sparkles,
  Plus,
  Compass,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Check,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SHADOWS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '../../src/api/axiosClient';
import { TutorMessage } from '../../src/types';
import MarkdownRenderer from '../../src/components/MarkdownRenderer';

type TutorSession = {
  id: number;
  topic?: string;
  created_at?: string;
};

// Animated 3-dot typing indicator bubble for AI
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: -5,
              duration: 320,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    };

    const anim1 = createBounce(dot1, 0);
    const anim2 = createBounce(dot2, 160);
    const anim3 = createBounce(dot3, 320);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.aiAvatarSmall}>
        <Bot size={16} color={COLORS.primary} />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
};

export default function TutorScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const flatListRef = useRef<FlatList<TutorMessage>>(null);

  const quickPrompts = [
    'Giải thích thuật toán Dijkstra và ví dụ',
    'Lập kế hoạch ôn tập tuần này giúp mình',
    'Làm sao để tối ưu truy vấn MySQL?',
    'Cách vượt qua môn học đang có nguy cơ trượt',
  ];

  const loadSessionMessages = useCallback(async (id: number) => {
    try {
      const response = await axiosClient.get(`/tutor/sessions/${id}/messages`);
      setSessionId(id);
      setMessages(response.data);
    } catch (error) {
      console.error('Lỗi tải tin nhắn phiên:', error);
    }
  }, []);

  const initTutorSession = useCallback(async () => {
    try {
      setInitializing(true);
      const response = await axiosClient.get('/tutor/sessions');
      const sessionList: TutorSession[] = Array.isArray(response.data)
        ? response.data
        : [];

      setSessions(sessionList);

      if (sessionList.length > 0) {
        await loadSessionMessages(sessionList[0].id);
      } else {
        setSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Lỗi khởi tạo Gia sư AI:', error);
      Alert.alert(
        'Lỗi kết nối',
        'Không thể tải lịch sử chat. Bạn vẫn có thể thử tạo cuộc trò chuyện mới.'
      );
      setSessionId(null);
      setMessages([]);
    } finally {
      setInitializing(false);
    }
  }, [loadSessionMessages]);

  useEffect(() => {
    initTutorSession();
  }, [initTutorSession]);

  const handleNewChat = () => {
    if (loading) {
      Alert.alert(
        'Đang xử lý',
        'Vui lòng đợi AI trả lời xong trước khi tạo cuộc trò chuyện mới.'
      );
      return;
    }

    setSessionId(null);
    setMessages([]);
    setInputText('');
  };

  const sendMessageContent = async (textToSend: string) => {
    const userText = textToSend.trim();
    if (!userText || loading) return;

    setInputText('');
    setLoading(true);

    const previousSessionId = sessionId;
    const tempId = Date.now();

    const tempUserMsg: TutorMessage = {
      id: tempId,
      session_id: previousSessionId ?? 0,
      sender: 'USER',
      content: userText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await axiosClient.post('/tutor/chat', {
        ...(previousSessionId != null ? { session_id: previousSessionId } : {}),
        message: userText,
      });

      const data = response.data;
      const newSessionId = Number(data.session_id);

      if (!Number.isInteger(newSessionId) || newSessionId <= 0) {
        throw new Error('API không trả về session_id hợp lệ');
      }

      setSessionId(newSessionId);

      setMessages((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...item, session_id: newSessionId } : item
        )
      );

      const reply = data.reply;
      const aiContent = typeof reply === 'string' ? reply : reply?.content;

      if (typeof aiContent !== 'string' || !aiContent.trim()) {
        throw new Error('AI không trả về nội dung phản hồi');
      }

      const aiMsg: TutorMessage = {
        id: reply?.id ?? Date.now() + 1,
        session_id: newSessionId,
        sender: 'AI',
        content: aiContent,
        created_at: reply?.created_at ?? new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (!sessions.some((session) => session.id === newSessionId)) {
        setSessions((prev) => [
          {
            id: newSessionId,
            topic: userText.substring(0, 50),
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (error: any) {
      console.error(
        'Lỗi gửi tin nhắn AI Tutor:',
        error?.response?.data ?? error?.message ?? error
      );

      const errorMsg: TutorMessage = {
        id: Date.now() + 2,
        session_id: previousSessionId ?? 0,
        sender: 'AI',
        content:
          'Rất tiếc, chưa thể nhận phản hồi từ Gia sư AI. Vui lòng kiểm tra lại kết nối và thử lại.',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMsg]);

      Alert.alert(
        'Không thể gửi tin nhắn',
        error?.response?.data?.message ??
          'Vui lòng kiểm tra kết nối với backend và AI Service.'
      );
    } finally {
      setLoading(false);
    }
  };

  const [feedbackState, setFeedbackState] = useState<Record<number, 'HELPFUL' | 'UNHELPFUL'>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  const handleCopyMessage = async (msgId: number, content: string) => {
    try {
      await Clipboard.setStringAsync(content);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (e) {
      console.error('Lỗi sao chép phản hồi:', e);
    }
  };

  const handleFeedback = (msgId: number, type: 'HELPFUL' | 'UNHELPFUL') => {
    setFeedbackState((prev) => {
      const current = prev[msgId];
      if (current === type) {
        const updated = { ...prev };
        delete updated[msgId];
        return updated;
      }
      return { ...prev, [msgId]: type };
    });
  };

  const handleSendMessage = () => {
    sendMessageContent(inputText);
  };

  const renderMessageItem = ({ item }: { item: TutorMessage }) => {
    const isAI = item.sender === 'AI';

    if (!isAI) {
      // User bubble: Right aligned, Indigo-600 background, white text, tail effect at bottom right
      return (
        <View style={styles.userBubbleContainer}>
          <View style={styles.bubbleUser}>
            <Text style={styles.msgTextUser}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const currentFeedback = feedbackState[item.id];
    const isCopied = copiedMessageId === item.id;

    // AI bubble: Left aligned, soft background, rich Markdown formatting, action bar
    return (
      <View style={styles.aiBubbleContainer}>
        <View style={styles.aiAvatarSmall}>
          <Bot size={16} color={COLORS.primary} />
        </View>
        <View style={styles.bubbleAIWrapper}>
          <View style={styles.bubbleAI}>
            <MarkdownRenderer content={item.content} />
          </View>

          {/* Action bar dưới mỗi câu trả lời của AI */}
          <View style={styles.aiActionBar}>
            <TouchableOpacity
              style={[styles.actionBtn, isCopied && styles.actionBtnActive]}
              onPress={() => handleCopyMessage(item.id, item.content)}
              activeOpacity={0.7}
            >
              {isCopied ? (
                <>
                  <Check size={12} color="#059669" />
                  <Text style={[styles.actionBtnText, { color: '#059669', fontWeight: '600' }]}>
                    Đã sao chép
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={12} color="#64748B" />
                  <Text style={styles.actionBtnText}>Sao chép</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.feedbackDivider} />

            <View style={styles.feedbackRow}>
              <TouchableOpacity
                style={[
                  styles.feedbackBtn,
                  currentFeedback === 'HELPFUL' && styles.feedbackBtnHelpfulActive,
                ]}
                onPress={() => handleFeedback(item.id, 'HELPFUL')}
                activeOpacity={0.7}
              >
                <ThumbsUp
                  size={12}
                  color={currentFeedback === 'HELPFUL' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    currentFeedback === 'HELPFUL' && styles.feedbackTextHelpfulActive,
                  ]}
                >
                  Hữu ích
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.feedbackBtn,
                  currentFeedback === 'UNHELPFUL' && styles.feedbackBtnUnhelpfulActive,
                ]}
                onPress={() => handleFeedback(item.id, 'UNHELPFUL')}
                activeOpacity={0.7}
              >
                <ThumbsDown
                  size={12}
                  color={currentFeedback === 'UNHELPFUL' ? '#DC2626' : '#64748B'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    currentFeedback === 'UNHELPFUL' && styles.feedbackTextUnhelpfulActive,
                  ]}
                >
                  Chưa rõ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (initializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang kết nối với Gia sư AI...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Modern Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.botIconBadge}>
            <Sparkles size={20} color={COLORS.surface} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Gia sư AI SmartStudy</Text>
            <View style={styles.statusRow}>
              <View style={styles.activeDot} />
              <Text style={styles.headerStatus}>Sẵn sàng hỗ trợ 24/7</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={handleNewChat}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityLabel="Tạo cuộc trò chuyện mới"
        >
          <Plus size={16} color={COLORS.primary} />
          <Text style={styles.newChatText}>Mới</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Bot size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Xin chào! Mình là Gia sư AI</Text>
            <Text style={styles.emptySubtitle}>
              Hỏi bất kỳ kiến thức môn học, giải thích bài tập, giải mã lỗi lập trình hay chiến lược cải thiện điểm số.
            </Text>

            {/* Quick Prompts */}
            <View style={styles.quickPromptsSection}>
              <View style={styles.promptHeaderRow}>
                <Compass size={14} color={COLORS.textSecondary} />
                <Text style={styles.promptSectionLabel}>Gợi ý câu hỏi bắt đầu:</Text>
              </View>
              {quickPrompts.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickPromptChip}
                  onPress={() => sendMessageContent(prompt)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickPromptText}>💡 {prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={loading ? <TypingIndicator /> : undefined}
      />

      {/* Pill-shaped Bottom Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.inputPill}>
          <TextInput
            style={styles.textInput}
            placeholder="Hỏi AI về bài tập, giải thích code..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={600}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.7}
            accessibilityLabel="Gửi tin nhắn"
          >
            <Send size={18} color={COLORS.surface} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.m,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.m,
    paddingTop: SIZES.m,
    paddingBottom: SIZES.m,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.soft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.s,
    flex: 1,
  },
  botIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  headerStatus: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.success,
    fontWeight: '600',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
  },
  newChatText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
  },
  chatList: {
    paddingHorizontal: SIZES.m,
    paddingTop: SIZES.m,
    paddingBottom: SIZES.l,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.m,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.m,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.titleMedium.fontSize,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.bodySmall.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZES.xl,
    maxWidth: 320,
  },
  quickPromptsSection: {
    width: '100%',
    gap: 8,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  promptSectionLabel: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  quickPromptChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.m,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  quickPromptText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    marginBottom: 12,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    ...SHADOWS.soft,
  },
  msgTextUser: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  aiBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginBottom: 16,
    gap: 8,
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  bubbleAIWrapper: {
    flex: 1,
  },
  bubbleAI: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.soft,
  },
  aiActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  actionBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  actionBtnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  feedbackDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  feedbackBtnHelpfulActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  feedbackTextHelpfulActive: {
    color: '#059669',
    fontWeight: '700',
  },
  feedbackBtnUnhelpfulActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  feedbackTextUnhelpfulActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  msgTextAI: {
    color: '#1F2937',
    fontSize: 15,
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#9CA3AF',
  },
  inputContainer: {
    paddingHorizontal: SIZES.m,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sendBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#9CA3AF',
  },
});
