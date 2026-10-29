import { Tabs } from 'expo-router';
import { LayoutDashboard, BookOpen, Target, Bot, User } from 'lucide-react-native';
import { COLORS } from '../../src/constants/theme';

export default function TabsLayout() {
return (
    <Tabs
    screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        },
        tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        },
    }}
    >
    <Tabs.Screen
        name="index"
        options={{
        title: 'Trang chủ',
        tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
    />
    <Tabs.Screen
        name="courses"
        options={{
        title: 'Môn học',
        tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
    />
    <Tabs.Screen
        name="plan"
        options={{
        title: 'Lộ trình',
        tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
    />
    <Tabs.Screen
        name="tutor"
        options={{
        title: 'Gia sư AI',
        tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />,
        }}
    />
    <Tabs.Screen
        name="profile"
        options={{
        title: 'Cá nhân',
        tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
    />
    </Tabs>
);
}