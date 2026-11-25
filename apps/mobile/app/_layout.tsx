import '../globals.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { DiagnosticErrorBoundary } from '@/components/ErrorBoundary';
import { useAppState } from '@/components/hooks/tanstack/useAppState';
import { useOnlineManager } from '@/components/hooks/tanstack/useOnlineManager';
import { ErrorModal } from '@/components/modals/ErrorModal';
import { DetailNavigationProvider } from '@/components/ui/DetailSwipeNavigator';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { OAuth2AuthProvider } from '@/features/auth/OAuth2AuthProvider';
import { PushNotificationRegistrar } from '@/features/notifications/PushNotificationRegistrar';
import { queryClient, queryPersistOptions } from '@/state/queryClient';
import { persistor, store } from '@/state/store';
import { FontProvider } from '@/utils/font';
import { I18nProvider, useI18n } from '@/utils/i18n';
import { logError, logInfo } from '@/utils/logging';
import { stackPageTitleScreenOptions } from '@/utils/pageTitle';
import { ScreenBackgroundProvider } from '@/utils/screenBackground';
import {
  getNavigationHeaderOptions,
  getNavigationBarButtonStyle,
  getStatusBarStyle,
  ThemeModeProvider,
  useThemeMode,
} from '@/utils/theme';
import { TileSetProvider } from '@/utils/tileSet';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Codex: require('../assets/fonts/Codex.ttf'),
    CodexItalic: require('../assets/fonts/CodexItalic.ttf'),
    FallingSkySemibold: require('../assets/fonts/FallingSkySemibold.otf'),
    FallingSkyMediumOblique: require('../assets/fonts/FallingSkyMediumOblique.otf'),
    FallingSkyLight: require('../assets/fonts/FallingSkyLight.otf'),
    FallingSkyBlack: require('../assets/fonts/FallingSkyBlack.otf'),
    Fashionvictim: require('../assets/fonts/Fashionvictim.ttf'),
    Kindred: require('../assets/fonts/Kindred.ttf'),
    KindredItalic: require('../assets/fonts/KindredItalic.ttf'),
    Nesathoberyl: require('../assets/fonts/Nesathoberyl.ttf'),
    TimeburnerBold: require('../assets/fonts/TimeburnerBold.ttf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    TypeLightSans: require('../assets/fonts/TypeLightSans.otf'),
    Zomboid: require('../assets/fonts/Zomboid.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      logError('font_loading_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      logInfo('application_ready');
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <I18nProvider>
      <FontProvider>
        <ThemeModeProvider>
          <ScreenBackgroundProvider>
            <RootLayoutNav />
          </ScreenBackgroundProvider>
        </ThemeModeProvider>
      </FontProvider>
    </I18nProvider>
  );
}

function RootLayoutNav() {
  const { t } = useI18n();
  const { colorScheme: resolvedColorScheme } = useThemeMode();
  const navigationTheme =
    resolvedColorScheme === 'dark' ? DarkTheme : DefaultTheme;

  useOnlineManager();
  useAppState();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode={resolvedColorScheme}>
        <DiagnosticErrorBoundary>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={queryPersistOptions}
          >
            <ThemeProvider value={navigationTheme}>
              <StatusBar style={getStatusBarStyle(resolvedColorScheme)} />
              {Platform.OS === 'android' && (
                <NavigationBar
                  style={getNavigationBarButtonStyle(resolvedColorScheme)}
                />
              )}
              <Provider store={store}>
                <PersistGate
                  loading={
                    <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
                  }
                  persistor={persistor}
                >
                  <TileSetProvider>
                    <OAuth2AuthProvider>
                      <PushNotificationRegistrar />
                      <BottomSheetModalProvider>
                        <DetailNavigationProvider>
                          <Stack
                            screenOptions={{
                              ...stackPageTitleScreenOptions,
                              ...getNavigationHeaderOptions(
                                resolvedColorScheme,
                              ),
                              headerTitleAlign: 'center',
                            }}
                          >
                            <Stack.Screen
                              name="(tabs)"
                              options={{
                                headerShown: false,
                                headerTitleAlign: 'center',
                              }}
                            />
                          </Stack>
                        </DetailNavigationProvider>
                        <ErrorModal />
                      </BottomSheetModalProvider>
                    </OAuth2AuthProvider>
                  </TileSetProvider>
                </PersistGate>
              </Provider>
            </ThemeProvider>
          </PersistQueryClientProvider>
        </DiagnosticErrorBoundary>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
