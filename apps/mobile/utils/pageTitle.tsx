import { HeaderBackButton, HeaderTitle } from '@react-navigation/elements';
import type { HeaderTitleProps as ReactNavigationHeaderTitleProps } from '@react-navigation/elements';
import { router } from 'expo-router';
import type { Href, NativeStackHeaderBackProps } from 'expo-router';
import { Platform } from 'react-native';
import type { ColorValue } from 'react-native';

export const MAX_PAGE_TITLE_LENGTH = 30;

const TRUNCATION_SUFFIX = '...';

type StackHeaderLeftProps = NativeStackHeaderBackProps;
type NavigationPageTitleProps = Omit<
  ReactNavigationHeaderTitleProps,
  'tintColor'
> & {
  tintColor?: ColorValue | null;
};

function NavigationBackButton({
  label,
  tintColor,
  onPress = () => router.back(),
}: Omit<StackHeaderLeftProps, 'canGoBack'> & { onPress?: () => void }) {
  return (
    <HeaderBackButton
      label={label ? truncatePageTitle(label) : undefined}
      tintColor={typeof tintColor === 'string' ? tintColor : undefined}
      onPress={onPress}
    />
  );
}

function renderNavigationBackButton({
  canGoBack,
  ...props
}: StackHeaderLeftProps) {
  return canGoBack ? <NavigationBackButton {...props} /> : null;
}

export function createNavigationBackButton(fallbackHref: Href) {
  return ({ canGoBack, ...props }: StackHeaderLeftProps) => (
    <NavigationBackButton
      {...props}
      onPress={() => {
        if (canGoBack || (Platform.OS !== 'web' && router.canGoBack())) {
          router.back();
          return;
        }

        router.dismissTo(fallbackHref);
      }}
    />
  );
}

export function truncatePageTitle(title: string): string {
  const characters = Array.from(title);

  if (characters.length <= MAX_PAGE_TITLE_LENGTH) {
    return title;
  }

  const visibleCharacterCount =
    MAX_PAGE_TITLE_LENGTH - TRUNCATION_SUFFIX.length;

  return `${characters.slice(0, visibleCharacterCount).join('')}${TRUNCATION_SUFFIX}`;
}

function NavigationPageTitle({
  children,
  tintColor,
  ...headerTitleProps
}: NavigationPageTitleProps) {
  return (
    <HeaderTitle
      {...headerTitleProps}
      tintColor={typeof tintColor === 'string' ? tintColor : undefined}
    >
      {truncatePageTitle(children)}
    </HeaderTitle>
  );
}

export const pageTitleScreenOptions = {
  headerTitle: NavigationPageTitle,
};

export const stackPageTitleScreenOptions = {
  ...pageTitleScreenOptions,
  headerBackVisible: false,
  headerLeft: renderNavigationBackButton,
};
