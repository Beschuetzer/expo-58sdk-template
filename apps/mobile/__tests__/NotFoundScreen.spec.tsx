import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import NotFoundScreen from '../app/+not-found';

import { I18nProvider } from '@/utils/i18n';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('de')),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-router', () => ({
  Link: 'LinkHost',
  Stack: { Screen: 'StackScreenHost' },
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareText: 'TextHost',
}));
jest.mock('@/components/ui/ThemeAwareScreen', () => ({
  ThemeAwareScreen: 'ScreenHost',
}));

describe('NotFoundScreen', () => {
  it('uses the saved language instead of the device language', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <I18nProvider>
          <NotFoundScreen />
        </I18nProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@mobile/locale');
    expect(
      screen.root.find(
        (instance) => String(instance.type) === 'StackScreenHost',
      ).props.options.title,
    ).toBe('Hoppla!');
    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toEqual(['Diese Seite existiert nicht.', 'Zur Startseite']);
    expect(
      screen.root.find((instance) => String(instance.type) === 'ScreenHost'),
    ).toBeDefined();

    act(() => screen.unmount());
  });
});
