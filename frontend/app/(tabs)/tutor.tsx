
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
} from 'react-native';
import {
Bot,
Send,
User,
Sparkles,
Plus,
} from 'lucide-react-native';
import { COLORS, SIZES } from '../../src/constants/theme';
import axiosClient from '../../src/api/axiosClient';
import { TutorMessage } from '../../src/types';

type TutorSession = {
id: number;
topic?: string;
created_at?: string;
};

export default function TutorScreen() {
const [messages, setMessages] = useState<TutorMessage[]>([]);
const [sessions, setSessions] = useState<TutorSession[]>([]);
const [inputText, setInputText] = useState('');
const [sessionId, setSessionId] = useState<number | null>(null);
const [loading, setLoading] = useState(false);
const [initializing, setInitializing] = useState(true);

const flatListRef = useRef<FlatList<TutorMessage>>(null);

const loadSessionMessages = useCallback(async (id: number) => {
    const response = await axiosClient.get(
    `/tutor/sessions/${id}/messages`
    );

    setSessionId(id);
    setMessages(response.data);
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
        // Mở phiên gần nhất.
        await loadSessionMessages(sessionList[0].id);
    } else {
        // Chưa có phiên nào: sẵn sàng tạo phiên khi gửi tin đầu tiên.
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

const handleSendMessage = async () => {
    const userText = inputText.trim();

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
        ...(previousSessionId != null
        ? { session_id: previousSessionId }
        : {}),
        message: userText,
    });

    const data = response.data;
    const newSessionId = Number(data.session_id);

    if (!Number.isInteger(newSessionId) || newSessionId <= 0) {
        throw new Error('API không trả về session_id hợp lệ');
    }

    setSessionId(newSessionId);

    // Cập nhật ID phiên cho tin nhắn vừa gửi.
    setMessages((prev) =>
        prev.map((item) =>
        item.id === tempId
            ? { ...item, session_id: newSessionId }
            : item
        )
    );

    // Backend trả về { session_id, reply: { id, content, ... } }.
    const reply = data.reply;
    const aiContent =
        typeof reply === 'string' ? reply : reply?.content;

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

    // Cập nhật danh sách phiên sau khi phiên đầu tiên được tạo.
    if (
        !sessions.some((session) => session.id === newSessionId)
    ) {
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

    // Giữ tin nhắn người dùng để không mất nội dung đã nhập.
    const errorMsg: TutorMessage = {
        id: Date.now() + 2,
        session_id: previousSessionId ?? 0,
        sender: 'AI',
        content:
        'Rất tiếc, chưa thể nhận phản hồi từ Gia sư AI. Vui lòng kiểm tra kết nối và thử lại.',
        created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, errorMsg]);

    Alert.alert(
        'Không thể gửi tin nhắn',
        error?.response?.data?.message ??
        'Vui lòng kiểm tra backend và AI Service.'
    );
    } finally {
    setLoading(false);
    }
};

const renderMessageItem = ({
    item,
}: {
    item: TutorMessage;
}) => {
    const isAI = item.sender === 'AI';

    return (
    <View
        style={[
        styles.msgWrapper,
        isAI ? styles.msgWrapperAI : styles.msgWrapperUser,
        ]}
    >
        <View
        style={[
            styles.avatar,
            isAI ? styles.avatarAI : styles.avatarUser,
        ]}
        >
        {isAI ? (
            <Bot size={18} color={COLORS.surface} />
        ) : (
            <User size={18} color={COLORS.surface} />
        )}
        </View>

        <View
        style={[
            styles.bubble,
            isAI ? styles.bubbleAI : styles.bubbleUser,
        ]}
        >
        <Text
            style={[
            styles.msgText,
            isAI ? styles.msgTextAI : styles.msgTextUser,
            ]}
        >
            {item.content}
        </Text>
        </View>
    </View>
    );
};

if (initializing) {
    return (
    <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
        Đang kết nối với Gia sư AI...
        </Text>
    </View>
    );
}

return (
    <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.container}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <View style={styles.header}>
        <View style={styles.headerLeft}>
        <View style={styles.botIconBadge}>
            <Sparkles size={20} color={COLORS.surface} />
        </View>

        <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
            Gia sư AI SmartStudy
            </Text>
            <Text style={styles.headerStatus}>
            ● Sẵn sàng hỗ trợ 24/7
            </Text>
        </View>
        </View>

        <TouchableOpacity
        style={styles.newChatBtn}
        onPress={handleNewChat}
        disabled={loading}
        accessibilityLabel="Tạo cuộc trò chuyện mới"
        >
        <Plus size={20} color={COLORS.primary} />
        <Text style={styles.newChatText}>Mới</Text>
        </TouchableOpacity>
    </View>

    <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
        <View style={styles.emptyChat}>
            <Bot size={42} color={COLORS.secondary} />
            <Text style={styles.emptyTitle}>
            Xin chào! Mình là Gia sư AI.
            </Text>
            <Text style={styles.emptyText}>
            Hãy hỏi mình về bài tập, lập trình, kiến thức hoặc
            những nội dung bạn đang cần ôn tập.
            </Text>
        </View>
        }
        onContentSizeChange={() =>
        flatListRef.current?.scrollToEnd({ animated: true })
        }
        keyboardShouldPersistTaps="handled"
    />

    {loading && (
        <View style={styles.typingIndicator}>
        <Bot size={16} color={COLORS.primary} />
        <Text style={styles.typingText}>
            Gia sư AI đang viết câu trả lời...
        </Text>
        <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
    )}

    <View style={styles.inputBar}>
        <TextInput
        style={styles.textInput}
        placeholder="Hỏi AI về bài tập, giải thích code..."
        placeholderTextColor={COLORS.textSecondary}
        value={inputText}
        onChangeText={setInputText}
        multiline
        maxLength={500}
        editable={!loading}
        onSubmitEditing={() => {
            if (Platform.OS !== 'ios') {
            handleSendMessage();
            }
        }}
        />

        <TouchableOpacity
        style={[
            styles.sendBtn,
            (!inputText.trim() || loading) && styles.sendBtnDisabled,
        ]}
        onPress={handleSendMessage}
        disabled={!inputText.trim() || loading}
        accessibilityLabel="Gửi tin nhắn"
        >
        <Send size={20} color={COLORS.surface} />
        </TouchableOpacity>
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
},
header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.m,
    paddingTop: SIZES.l,
    paddingBottom: SIZES.m,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
},
headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.s,
    flex: 1,
},
headerInfo: {
    flex: 1,
},
botIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
},
headerTitle: {
    fontWeight: '600',
    color: COLORS.text,
    fontSize: 16,
},
headerStatus: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: 'bold',
    marginTop: 3,
},
newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
},
newChatText: {
    color: COLORS.primary,
    fontWeight: '600',
},
chatList: {
    padding: SIZES.m,
    paddingBottom: SIZES.m,
    flexGrow: 1,
},
emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
    marginTop: SIZES.xl,
},
emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SIZES.m,
},
emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: SIZES.s,
},
msgWrapper: {
    flexDirection: 'row',
    marginBottom: SIZES.m,
    gap: SIZES.s,
    maxWidth: '90%',
},
msgWrapperAI: {
    alignSelf: 'flex-start',
},
msgWrapperUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
},
avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
},
avatarAI: {
    backgroundColor: COLORS.secondary,
},
avatarUser: {
    backgroundColor: COLORS.primary,
},
bubble: {
    padding: SIZES.m,
    borderRadius: SIZES.radius,
    flexShrink: 1,
},
bubbleAI: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 0,
},
bubbleUser: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 0,
},
msgText: {
    fontSize: 15,
    lineHeight: 22,
},
msgTextAI: {
    color: COLORS.text,
},
msgTextUser: {
    color: COLORS.surface,
},
typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SIZES.m,
    paddingVertical: SIZES.xs,
    backgroundColor: COLORS.surface,
},
typingText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
},
inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.s + 2,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SIZES.s,
},
textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: SIZES.m,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.text,
},
sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
},
sendBtnDisabled: {
    opacity: 0.4,
},
});
