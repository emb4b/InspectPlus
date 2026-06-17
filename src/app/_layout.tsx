import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuthContext } from '../core/providers/AuthProvider';
import { Colors } from '../constants/colors';
import { ActivityIndicator, View } from 'react-native';

function RootNavigator() {
  const { session, loading } = useAuthContext();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/home');
    } else {
      router.replace('/');
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="inspection/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Inspection Report',
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.textWhite,
          headerTitleStyle: { fontWeight: '700' },
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="survey/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Survey Report',
          headerStyle: { backgroundColor: Colors.navy },
          headerTintColor: Colors.textWhite,
          headerTitleStyle: { fontWeight: '700' },
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}