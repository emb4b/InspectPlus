import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { HomeHeader } from '../../features/home/components/HomeHeader';
import { HomeFooter } from '../../features/home/components/HomeFooter';
import { HeaderScrollProvider, useHeaderScroll } from '../../features/home/context/HeaderScrollContext';
import { ScreenFooterProvider, useActiveScreenFooter } from '../../features/home/context/ScreenFooterContext';

// Header/footer chrome that reacts to the active route — split out so it can
// read scroll-collapse state from the provider below.
function AppChrome() {
  const pathname = usePathname();
  const isHome = pathname === '/home';
  const { collapsed, expand } = useHeaderScroll();
  const screenFooter = useActiveScreenFooter();

  // Each screen mounts its own scroll container, so the collapsed state from
  // whatever page the user just left shouldn't carry over to the next one.
  useEffect(() => {
    expand();
  }, [pathname, expand]);

  return (
    <>
      <HomeHeader collapsed={collapsed} disableCollapse={isHome} />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </View>
      {screenFooter}
      <HomeFooter />
    </>
  );
}

// Shared chrome for every authenticated screen — mounted once so the header
// and footer stay fixed while only this inner Stack's content transitions.
export default function AppLayout() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <HeaderScrollProvider>
        <ScreenFooterProvider>
          <AppChrome />
        </ScreenFooterProvider>
      </HeaderScrollProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
});
