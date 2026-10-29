import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';

export default function RegisterScreen() {
const router = useRouter();
const { login } = useAuth();

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [errorMsg, setErrorMsg] = useState('');

const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
    setErrorMsg('Vui lòng nhập đầy đủ tất cả thông tin');
    return;
    }

    if (password !== confirmPassword) {
    setErrorMsg('Mật khẩu xác nhận không khớp');
    return;
    }

    if (password.length < 6) {
    setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
    return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
    // Gửi đúng các trường Backend yêu cầu ({ email, password })
    const response = await axiosClient.post('/auth/register', { email, password });
    
    // Nếu API register tự động đăng nhập và trả về token:
    if (response.data.token && response.data.user) {
        await login(response.data.token, response.data.user);
        router.replace('/(tabs)');
    } else {
        // Nếu API register chỉ trả về thông báo thành công, chuyển sang màn login
        router.replace('/(auth)/login' as any);
    }
    } catch (error: any) {
    setErrorMsg(error.response?.data?.message || 'Đăng ký thất bại. Email có thể đã tồn tại.');
    } finally {
    setLoading(false);
    }
};

return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>

        <View style={styles.header}>
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Bắt đầu hành trình học tập thông minh với AI</Text>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.inputContainer}>
        <Mail color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
        <TextInput
            style={styles.input}
            placeholder="Email sinh viên"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
        />
        </View>

        <View style={styles.inputContainer}>
        <Lock color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
        <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            {showPassword ? <EyeOff color={COLORS.textSecondary} size={20} /> : <Eye color={COLORS.textSecondary} size={20} />}
        </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
        <Lock color={COLORS.textSecondary} size={20} style={styles.inputIcon} />
        <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
            {showConfirmPassword ? <EyeOff color={COLORS.textSecondary} size={20} /> : <Eye color={COLORS.textSecondary} size={20} />}
        </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.surface} /> : <Text style={styles.registerButtonText}>Đăng ký</Text>}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Đã có tài khoản? </Text>
        <TouchableOpacity onPress={() => router.navigate('/(auth)/login' as any)}>
            <Text style={styles.loginLink}>Đăng nhập</Text>
        </TouchableOpacity>
        </View>
    </ScrollView>
    </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SIZES.xl },
backButton: { marginBottom: SIZES.m, width: 40, height: 40, justifyContent: 'center' },
header: { marginBottom: SIZES.xl, alignItems: 'center' },
title: {
  fontSize: 32,
  fontWeight: 'bold',
  color: COLORS.primary,
  marginBottom: SIZES.xs,
},
subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },
errorText: { color: COLORS.error, marginBottom: SIZES.m, textAlign: 'center' },
inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radius, marginBottom: SIZES.m, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SIZES.m, height: 56 },
inputIcon: { marginRight: SIZES.s },
input: { flex: 1, fontSize: 16, color: COLORS.text },
eyeIcon: { padding: SIZES.xs },
registerButton: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.m, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
registerButtonText: { color: COLORS.surface, fontSize: 18, fontWeight: 'bold' },
loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.xl },
loginText: { color: COLORS.textSecondary, fontSize: 16 },
loginLink: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
});