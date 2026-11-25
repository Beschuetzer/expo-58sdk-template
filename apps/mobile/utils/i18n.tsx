import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const LOCALE_STORAGE_KEY = '@expo-58sdk-template/locale';

export const locales = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
} as const;

export type Locale = keyof typeof locales;

export const messages = {
  en: {
    'tabs.home': 'Home',
    'tabs.account': 'Account',
    'home.title': 'A starting point for your next idea',
    'home.description':
      'This neutral Expo starter gives you a place to build your own product experience.',
    'home.accountSettings':
      'Connect your identity provider and adjust app preferences from your account.',
    'home.openAccount': 'Open account',
    'account.title': 'Account',
    'account.description':
      'Manage your hosted identity-provider session and view your account details.',
    'account.signedInStatus': 'Signed in',
    'account.signedOutStatus': 'Not signed in',
    'account.signedInMessage': 'Your account is connected and ready to use.',
    'account.signedOutMessage':
      'Sign in with your configured identity provider to continue.',
    'account.signIn': 'Sign in',
    'account.signOut': 'Sign out',
    'account.profileTitle': 'Profile',
    'account.identityTitle': 'Identity',
    'account.displayName': 'Display name',
    'account.email': 'Email',
    'account.username': 'Username',
    'account.provider': 'Identity provider',
    'account.accountId': 'Account ID',
    'account.issuer': 'Issuer',
    'account.audience': 'Audience',
    'account.unavailable': 'Not available',
    'account.customProvider': 'Other',
    'account.setupFailed':
      'Authentication is not configured. Set the OAuth client ID and identity-provider URL.',
    'account.preparing': 'Preparing authentication…',
    'account.authFailed': 'Authentication could not be completed. Try again.',
    'account.authCancelled': 'Sign-in was cancelled.',
    'account.signOutFailed': 'Sign-out could not be completed. Try again.',
    'account.retry': 'Retry setup',
    'settings.title': 'Settings',
    'settings.theme': 'Appearance',
    'settings.themeDescription': 'Choose how the app looks.',
    'settings.language': 'Language',
    'settings.languageDescription': 'Choose the language used in the app.',
    'settings.preferenceSaveFailed':
      'Your preference changed, but could not be saved for next time.',
    'theme.system': 'System',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'provider.apple': 'Apple',
    'provider.discord': 'Discord',
    'provider.facebook': 'Facebook',
    'provider.github': 'GitHub',
    'provider.gitlab': 'GitLab',
    'provider.google': 'Google',
    'provider.linkedin': 'LinkedIn',
    'provider.microsoft': 'Microsoft',
    'provider.x': 'X',
    'common.loading': 'Loading…',
    'modal.title': 'Template starter',
    'modal.description':
      'Replace this sample screen with a flow for your product.',
  },
  es: {
    'tabs.home': 'Inicio',
    'tabs.account': 'Cuenta',
    'home.title': 'Un punto de partida para tu próxima idea',
    'home.description':
      'Este inicio neutral de Expo te ofrece un espacio para crear la experiencia de tu producto.',
    'home.accountSettings':
      'Conecta tu proveedor de identidad y ajusta las preferencias desde tu cuenta.',
    'home.openAccount': 'Abrir cuenta',
    'account.title': 'Cuenta',
    'account.description':
      'Gestiona la sesión de tu proveedor de identidad y consulta los datos de tu cuenta.',
    'account.signedInStatus': 'Sesión iniciada',
    'account.signedOutStatus': 'Sesión no iniciada',
    'account.signedInMessage': 'Tu cuenta está conectada y lista para usar.',
    'account.signedOutMessage':
      'Inicia sesión con el proveedor de identidad configurado para continuar.',
    'account.signIn': 'Iniciar sesión',
    'account.signOut': 'Cerrar sesión',
    'account.profileTitle': 'Perfil',
    'account.identityTitle': 'Identidad',
    'account.displayName': 'Nombre visible',
    'account.email': 'Correo electrónico',
    'account.username': 'Nombre de usuario',
    'account.provider': 'Proveedor de identidad',
    'account.accountId': 'ID de cuenta',
    'account.issuer': 'Emisor',
    'account.audience': 'Audiencia',
    'account.unavailable': 'No disponible',
    'account.customProvider': 'Otro',
    'account.setupFailed':
      'La autenticación no está configurada. Define el ID de cliente OAuth y la URL del proveedor de identidad.',
    'account.preparing': 'Preparando autenticación…',
    'account.authFailed':
      'No se pudo completar la autenticación. Inténtalo de nuevo.',
    'account.authCancelled': 'Se canceló el inicio de sesión.',
    'account.signOutFailed':
      'No se pudo cerrar la sesión. Inténtalo de nuevo.',
    'account.retry': 'Reintentar configuración',
    'settings.title': 'Ajustes',
    'settings.theme': 'Apariencia',
    'settings.themeDescription': 'Elige el aspecto de la aplicación.',
    'settings.language': 'Idioma',
    'settings.languageDescription':
      'Elige el idioma que se usa en la aplicación.',
    'settings.preferenceSaveFailed':
      'La preferencia cambió, pero no se pudo guardar para la próxima vez.',
    'theme.system': 'Sistema',
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'provider.apple': 'Apple',
    'provider.discord': 'Discord',
    'provider.facebook': 'Facebook',
    'provider.github': 'GitHub',
    'provider.gitlab': 'GitLab',
    'provider.google': 'Google',
    'provider.linkedin': 'LinkedIn',
    'provider.microsoft': 'Microsoft',
    'provider.x': 'X',
    'common.loading': 'Cargando…',
    'modal.title': 'Inicio de plantilla',
    'modal.description':
      'Sustituye esta pantalla de ejemplo por un flujo de tu producto.',
  },
  de: {
    'tabs.home': 'Start',
    'tabs.account': 'Konto',
    'home.title': 'Ein Ausgangspunkt für deine nächste Idee',
    'home.description':
      'Dieses neutrale Expo-Grundgerüst bietet Platz für deine eigene Produkterfahrung.',
    'home.accountSettings':
      'Verbinde deinen Identitätsanbieter und passe deine App-Einstellungen im Konto an.',
    'home.openAccount': 'Konto öffnen',
    'account.title': 'Konto',
    'account.description':
      'Verwalte deine Sitzung beim Identitätsanbieter und sieh dir deine Kontodaten an.',
    'account.signedInStatus': 'Angemeldet',
    'account.signedOutStatus': 'Nicht angemeldet',
    'account.signedInMessage': 'Dein Konto ist verbunden und einsatzbereit.',
    'account.signedOutMessage':
      'Melde dich mit deinem konfigurierten Identitätsanbieter an, um fortzufahren.',
    'account.signIn': 'Anmelden',
    'account.signOut': 'Abmelden',
    'account.profileTitle': 'Profil',
    'account.identityTitle': 'Identität',
    'account.displayName': 'Anzeigename',
    'account.email': 'E-Mail',
    'account.username': 'Benutzername',
    'account.provider': 'Identitätsanbieter',
    'account.accountId': 'Konto-ID',
    'account.issuer': 'Aussteller',
    'account.audience': 'Zielgruppe',
    'account.unavailable': 'Nicht verfügbar',
    'account.customProvider': 'Andere',
    'account.setupFailed':
      'Die Authentifizierung ist nicht konfiguriert. Lege die OAuth-Client-ID und die URL des Identitätsanbieters fest.',
    'account.preparing': 'Authentifizierung wird vorbereitet…',
    'account.authFailed':
      'Die Authentifizierung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
    'account.authCancelled': 'Die Anmeldung wurde abgebrochen.',
    'account.signOutFailed':
      'Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
    'account.retry': 'Konfiguration erneut versuchen',
    'settings.title': 'Einstellungen',
    'settings.theme': 'Darstellung',
    'settings.themeDescription': 'Wähle das Erscheinungsbild der App.',
    'settings.language': 'Sprache',
    'settings.languageDescription': 'Wähle die Sprache der App.',
    'settings.preferenceSaveFailed':
      'Die Einstellung wurde geändert, konnte aber nicht gespeichert werden.',
    'theme.system': 'System',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'provider.apple': 'Apple',
    'provider.discord': 'Discord',
    'provider.facebook': 'Facebook',
    'provider.github': 'GitHub',
    'provider.gitlab': 'GitLab',
    'provider.google': 'Google',
    'provider.linkedin': 'LinkedIn',
    'provider.microsoft': 'Microsoft',
    'provider.x': 'X',
    'common.loading': 'Wird geladen…',
    'modal.title': 'Vorlage',
    'modal.description':
      'Ersetze diesen Beispielbildschirm durch einen Ablauf für dein Produkt.',
  },
} as const;

export type TranslationKey = keyof typeof messages.en;

type I18nContextValue = {
  locale: Locale;
  locales: typeof locales;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'es' || value === 'de';
}

export function getDeviceLocale(
  languageCode: string | null | undefined = getLocales()[0]?.languageCode,
): Locale {
  const language = languageCode?.toLowerCase().split('-')[0];
  return language === 'es' || language === 'de' ? language : 'en';
}

export function getMessage(locale: Locale, key: TranslationKey): string {
  return messages[locale][key];
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getDeviceLocale());
  const hasUserSelectedLocale = useRef(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((storedLocale) => {
        if (
          isMounted &&
          !hasUserSelectedLocale.current &&
          isLocale(storedLocale)
        ) {
          setLocaleState(storedLocale);
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load the saved language preference.', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    hasUserSelectedLocale.current = true;
    setLocaleState(nextLocale);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale).catch(
      (error: unknown) => {
        console.error('Unable to save the language preference.', error);
      },
    );
  }, []);

  const t = useCallback(
    (key: TranslationKey) => getMessage(locale, key),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, locales, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider.');
  }
  return context;
}
