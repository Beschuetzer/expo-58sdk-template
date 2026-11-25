import { HeaderBackButton } from '@react-navigation/elements';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import {
  createNavigationBackButton,
  MAX_PAGE_TITLE_LENGTH,
  stackPageTitleScreenOptions,
  truncatePageTitle,
} from '../utils/pageTitle';

import { AppRoutePaths } from '@/constants/navigation';

jest.mock('@react-navigation/elements', () => {
  const actual = jest.requireActual<
    typeof import('@react-navigation/elements')
  >('@react-navigation/elements');
  const React = jest.requireActual<typeof import('react')>('react');

  return {
    ...actual,
    HeaderBackButton: ({ onPress }: { onPress?: () => void }) =>
      React.createElement('mock-header-back-button', { onPress }),
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('truncatePageTitle', () => {
  it('renders a back button when a stack can go back', () => {
    const renderBackButton = stackPageTitleScreenOptions.headerLeft;

    expect(stackPageTitleScreenOptions.headerBackVisible).toBe(false);
    expect(renderBackButton({ canGoBack: false })).toBeNull();
    expect(renderBackButton({ canGoBack: true })).not.toBeNull();
  });

  it('navigates back without requiring a navigation context', () => {
    const routerBack = jest.spyOn(router, 'back').mockImplementation(() => {});
    const renderBackButton = stackPageTitleScreenOptions.headerLeft;
    const backButton = renderBackButton({ canGoBack: true });

    if (!backButton) {
      throw new Error('Expected a back button when the stack can go back');
    }

    const screen = renderer.create(backButton);
    const button = screen.root.findByType(HeaderBackButton);

    act(() => button.props.onPress());

    expect(routerBack).toHaveBeenCalledTimes(1);
  });

  it('returns to a fallback route when a creation screen has no stack history', () => {
    const routerCanGoBack = jest
      .spyOn(router, 'canGoBack')
      .mockReturnValue(false);
    const routerDismissTo = jest
      .spyOn(router, 'dismissTo')
      .mockImplementation(() => {});
    const renderBackButton = createNavigationBackButton(AppRoutePaths.money);
    const backButton = renderBackButton({ canGoBack: false });

    expect(backButton).not.toBeNull();

    const screen = renderer.create(backButton);
    const button = screen.root.findByType(HeaderBackButton);

    act(() => button.props.onPress());

    expect(routerDismissTo).toHaveBeenCalledWith(AppRoutePaths.money);
    if (Platform.OS !== 'web') {
      expect(routerCanGoBack).toHaveBeenCalledTimes(1);
    }
    act(() => screen.unmount());
  });

  it('uses app navigation history when a creation stack has no previous route', () => {
    const routerCanGoBack = jest
      .spyOn(router, 'canGoBack')
      .mockReturnValue(true);
    const routerBack = jest.spyOn(router, 'back').mockImplementation(() => {});
    const routerDismissTo = jest
      .spyOn(router, 'dismissTo')
      .mockImplementation(() => {});
    const renderBackButton = createNavigationBackButton(AppRoutePaths.time);
    const backButton = renderBackButton({ canGoBack: false });

    const screen = renderer.create(backButton);
    const button = screen.root.findByType(HeaderBackButton);

    act(() => button.props.onPress());

    if (Platform.OS === 'web') {
      expect(routerCanGoBack).not.toHaveBeenCalled();
      expect(routerBack).not.toHaveBeenCalled();
      expect(routerDismissTo).toHaveBeenCalledWith(AppRoutePaths.time);
    } else {
      expect(routerCanGoBack).toHaveBeenCalledTimes(1);
      expect(routerBack).toHaveBeenCalledTimes(1);
      expect(routerDismissTo).not.toHaveBeenCalled();
    }
    act(() => screen.unmount());
  });

  it('uses normal stack history when a creation screen has a previous route', () => {
    const routerBack = jest.spyOn(router, 'back').mockImplementation(() => {});
    const routerDismissTo = jest
      .spyOn(router, 'dismissTo')
      .mockImplementation(() => {});
    const renderBackButton = createNavigationBackButton(AppRoutePaths.money);
    const backButton = renderBackButton({ canGoBack: true });

    const screen = renderer.create(backButton);
    const button = screen.root.findByType(HeaderBackButton);

    act(() => button.props.onPress());

    expect(routerBack).toHaveBeenCalledTimes(1);
    expect(routerDismissTo).not.toHaveBeenCalled();
    act(() => screen.unmount());
  });

  it('preserves titles at the character limit', () => {
    const title = 'a'.repeat(MAX_PAGE_TITLE_LENGTH);

    expect(truncatePageTitle(title)).toBe(title);
  });

  it('truncates longer titles to the limit with an ellipsis', () => {
    const title = 'a'.repeat(MAX_PAGE_TITLE_LENGTH + 1);
    const truncatedTitle = truncatePageTitle(title);

    expect(truncatedTitle).toBe(`${'a'.repeat(MAX_PAGE_TITLE_LENGTH - 3)}...`);
    expect(Array.from(truncatedTitle)).toHaveLength(MAX_PAGE_TITLE_LENGTH);
  });

  it('does not split Unicode surrogate pairs', () => {
    const title = '😀'.repeat(MAX_PAGE_TITLE_LENGTH + 1);
    const truncatedTitle = truncatePageTitle(title);

    expect(truncatedTitle).toBe(`${'😀'.repeat(MAX_PAGE_TITLE_LENGTH - 3)}...`);
    expect(Array.from(truncatedTitle)).toHaveLength(MAX_PAGE_TITLE_LENGTH);
  });
});
