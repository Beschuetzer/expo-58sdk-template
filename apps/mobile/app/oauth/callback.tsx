import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { OAuthRedirectScreen } from '@/features/auth/OAuthRedirectScreen';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { isAuthenticated, state } = useOAuth2Auth();

  useEffect(() => {
    if (isAuthenticated && state === 'success') {
      router.replace(AppRoutePaths.home);
    } else if (state === 'error' || state === 'cancelled') {
      router.replace(AppRoutePaths.account);
    }
  }, [isAuthenticated, router, state]);

  return (
    <OAuthRedirectScreen
      icon="shield"
      title="auth.redirectingHome"
      message="auth.redirectingHomeMessage"
    />
  );
}
