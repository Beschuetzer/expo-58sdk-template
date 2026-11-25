import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { AppRoutePaths } from '@/constants/navigation';
import { OAuthRedirectScreen } from '@/features/auth/OAuthRedirectScreen';

export default function OAuthLogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace(AppRoutePaths.account);
  }, [router]);

  return (
    <OAuthRedirectScreen
      icon="sign-out"
      title="auth.redirectingAccount"
      message="auth.redirectingAccountMessage"
    />
  );
}
