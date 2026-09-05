import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, LayoutChangeEvent } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../design/colors';
import { HomeHeader } from '../../features/home/components/HomeHeader';
import { HomeFooter } from '../../features/home/components/HomeFooter';
import { SpeedDial } from '../../features/home/components/SpeedDial';
import { HeaderScrollProvider, useHeaderScroll } from '../../features/home/context/HeaderScrollContext';
import { ScreenFooterProvider, useActiveScreenFooter } from '../../features/home/context/ScreenFooterContext';
import { FabVisibilityProvider, useFabHidden } from '../../features/home/context/FabVisibilityContext';
import { isFabRoute } from '../../features/home/fabRoute';

// Header/footer chrome that reacts to the active route — split out so it can
// read scroll-collapse state from the provider below.
function AppChrome() {
  const pathname = usePathname();
  const isHome = pathname === '/home';
  const { collapsed, expand } = useHeaderScroll();
  const screenFooter = useActiveScreenFooter();
  const fabHidden = useFabHidden();

  // Measured height of the footer stack below (the active screen's own
  // registered footer, if any, plus HomeFooter) so SpeedDial can anchor its
  // trigger and rows above it instead of a fixed Spacing.lg that assumed no
  // footer was ever there. onLayout fires whenever that stack's height
  // actually changes — e.g. a screen registering (or clearing) a taller
  // Save/Cancel row through useScreenFooter.
  const [footerHeight, setFooterHeight] = useState(0);
  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

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
      <View onLayout={handleFooterLayout}>
        {screenFooter}
        <HomeFooter />
      </View>
      {/* Last child, so its scrim and rows layer over the chrome. Unmounting
          on a route change also closes any open dial. */}
      {isFabRoute(pathname) && !fabHidden && <SpeedDial bottomInset={footerHeight} />}
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
          <FabVisibilityProvider>
            <AppChrome />
          </FabVisibilityProvider>
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
