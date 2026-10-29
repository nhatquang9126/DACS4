import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import axiosClient from '../../src/api/axiosClient';

export default function LoginScreen() {
const router = useRouter();
const { login } = useAuth();

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [errorMsg, setErrorMsg] = useState('');

const handleLogin = async () => {
    if (!email || !password) {
    setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu');
    return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
    const response = await axiosClient.post('/auth/login', { email, password });
    // Giả sử API trả về { token, user: { id, email, role } }
    await login(response.data.token, response.data.user);
    router.replace('/(tabs)');
    } catch (error: any) {
    setErrorMsg(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
    setLoading(false);
    }
};

return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
    <View style={styles.content}>
        <View style={styles.header}>
        <Text style={styles.title}>SmartStudy AI</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục học tập</Text>
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

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.surface} /> : <Text style={styles.loginButtonText}>Đăng nhập</Text>}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
        <Text style={styles.registerText}>Chưa có tài khoản? </Text>
        <TouchableOpacity onPress={() => router.navigate('/(auth)/register' as any)}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
        </TouchableOpacity>
        </View>
    </View>
    </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: COLORS.background },
content: { flex: 1, justifyContent: 'center', padding: SIZES.xl },
header: { marginBottom: SIZES.xl * 1.5, alignItems: 'center' },
title: {
  fontSize: 32,
  fontWeight: 'bold',
  color: COLORS.primary,
  marginBottom: SIZES.xs,
},
subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
errorText: { color: COLORS.error, marginBottom: SIZES.m, textAlign: 'center' },
inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radius, marginBottom: SIZES.m, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SIZES.m, height: 56 },
inputIcon: { marginRight: SIZES.s },
input: { flex: 1, fontSize: 16, color: COLORS.text },
eyeIcon: { padding: SIZES.xs },
loginButton: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.m, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
loginButtonText: { color: COLORS.surface, fontSize: 18, fontWeight: 'bold' },
registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.xl },
registerText: { color: COLORS.textSecondary, fontSize: 16 },
registerLink: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
});