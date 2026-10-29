import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/constants/theme';

function RootLayoutNav() {
const { user, isLoading } = useAuth();
const segments = useSegments();
const router = useRouter();

useEffect(() => {
if (isLoading) return;

const inAuthGroup = (segments as string[])[0] === '(auth)';

if (!user && !inAuthGroup) {
    router.replace('/(auth)/login' as any);
} else if (user && inAuthGroup) {
    router.replace('/(tabs)');
}
}, [user, isLoading, segments, router]);

if (isLoading) {
    return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
    );
}

return <Slot />;
}

export default function RootLayout() {
return (
    <AuthProvider>
    <RootLayoutNav />
    </AuthProvider>
);
}