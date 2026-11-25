import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import {
  I18nProvider,
  getMessage,
  locales,
  messages,
  useI18n,
  type TranslationKey,
} from './i18n';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

describe('i18n', () => {
  async function renderConsumer() {
    let current: ReturnType<typeof useI18n> | undefined;
    let tree: renderer.ReactTestRenderer;
    const TestConsumer = () => {
      current = useI18n();
      return null;
    };

    await act(async () => {
      tree = renderer.create(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    return {
      current: () => current,
      unmount: () => act(() => tree.unmount()),
    };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('provides the supported locales', () => {
    expect(locales).toEqual({
      en: 'English',
      es: 'Español',
      de: 'Deutsch',
    });
  });

  it('returns localized messages', () => {
    expect(getMessage('es', 'tabs.home')).toBe('Inicio');
    expect(getMessage('en', 'tabs.home')).toBe('Home');
    expect(getMessage('en', 'tabs.money')).toBe('Money');
    expect(getMessage('es', 'tabs.money')).toBe('Dinero');
    expect(getMessage('en', 'tabs.rules')).toBe('Rules');
    expect(getMessage('es', 'tabs.rules')).toBe('Reglas');
    expect(getMessage('de', 'tabs.home')).toBe('Start');
    expect(getMessage('de', 'tabs.money')).toBe('Geld');
    expect(getMessage('de', 'tabs.rules')).toBe('Regeln');
    expect(getMessage('de', 'settings.title')).toBe('Einstellungen');
    expect(getMessage('de', 'dateNight.createTitle')).toBe(
      'Dateabend erfassen',
    );
    expect(getMessage('de', 'paymentRequests.activityCreated')).toBe(
      'Erstellt',
    );
    expect(getMessage('de', 'paymentRequests.activitySubmitted')).toBe(
      'Eingereicht',
    );
    expect(getMessage('de', 'paymentRequests.changesRequested')).toBe(
      'Änderungen angefordert',
    );
  });

  it('provides a nonempty German translation for every English message', () => {
    const sections = Object.keys(messages.en) as (keyof typeof messages.en)[];
    expect(Object.keys(messages.de).sort()).toEqual([...sections].sort());

    for (const section of sections) {
      const germanSection: Record<string, string> = messages.de[section];
      expect(Object.keys(germanSection).sort()).toEqual(
        Object.keys(messages.en[section]).sort(),
      );
      for (const [key, message] of Object.entries(germanSection)) {
        expect(message.trim()).not.toBe('');
        expect(getMessage('de', `${section}.${key}` as TranslationKey)).toBe(
          message,
        );
      }
    }
  });

  it.each([
    ['en', 'en', 'Home'],
    ['es', 'es', 'Inicio'],
    ['de', 'de', 'Start'],
    ['DE', 'de', 'Start'],
  ] as const)(
    'detects device language %s as %s',
    async (languageCode, expectedLocale, homeLabel) => {
      (getLocales as jest.Mock).mockReturnValue([{ languageCode }]);
      const consumer = await renderConsumer();

      expect(consumer.current()?.locale).toBe(expectedLocale);
      expect(consumer.current()?.t('tabs.home')).toBe(homeLabel);
      consumer.unmount();
    },
  );

  it('restores a saved German preference over the device language', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('de');
    const consumer = await renderConsumer();

    expect(consumer.current()?.locale).toBe('de');
    expect(consumer.current()?.t('language.label')).toBe('Sprache');
    consumer.unmount();
  });

  it.each(['fr', 'constructor', '__proto__'])(
    'uses the German device language if the saved locale %s is invalid',
    async (storedLocale) => {
      (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'de' }]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(storedLocale);
      const consumer = await renderConsumer();

      expect(consumer.current()?.locale).toBe('de');
      consumer.unmount();
    },
  );

  it('uses love-making session wording in the updated English sex messages', () => {
    const updatedSexMessageKeys = [
      'sex.overviewDescription',
      'sex.rulesDescription',
      'sex.memberSelectionHint',
      'sex.notEnoughActiveMembers',
      'sex.noFlipRequired',
      'sex.alreadyRecordedToday',
      'sex.noLastSexRecorded',
      'sex.lastRecordedEncounter',
      'sex.createEventTitle',
      'sex.createEvent',
      'sex.eventCreated',
      'sex.loadError',
    ] as const;

    for (const key of updatedSexMessageKeys) {
      const message = getMessage('en', key).toLowerCase();
      expect(message).toContain('love-making session');
      expect(message).not.toContain('encounter');
    }
  });

  it('provides date-night tracker labels in both locales', () => {
    expect(getMessage('en', 'dateNight.createTitle')).toBe(
      'Record a date night',
    );
    expect(getMessage('en', 'dateNight.calendarTitle')).toBe(
      'Date-night calendar',
    );
    expect(getMessage('es', 'dateNight.createTitle')).toBe(
      'Registrar una cita',
    );
    expect(getMessage('es', 'dateNight.calendarTitle')).toBe(
      'Calendario de citas',
    );
    expect(getMessage('en', 'dateNight.description')).toBe(
      'Description (optional)',
    );
    expect(getMessage('es', 'dateNight.description')).toBe(
      'Descripción (opcional)',
    );
  });

  it('uses warm landing copy and a Love label in both locales', () => {
    expect(getMessage('en', 'tabs.sex')).toBe('Love');
    expect(getMessage('es', 'tabs.sex')).toBe('Amor');
    expect(getMessage('en', 'home.title')).toBe('A little closer, every day.');
    expect(getMessage('es', 'home.title')).toBe('Un poco más cerca, cada día.');
    expect(getMessage('en', 'home.description')).toBe(
      'A calm place for shared plans, honest conversations, and the little moments that bring you closer.',
    );
    expect(getMessage('es', 'home.description')).toBe(
      'Un lugar tranquilo para compartir planes, conversaciones sinceras y esos pequeños momentos que os unen.',
    );
    expect(getMessage('en', 'home.activeRelationshipHeader')).toBe(
      'Active Relationship',
    );
    expect(getMessage('es', 'home.activeRelationshipHeader')).toBe(
      'Relación activa',
    );
    expect(getMessage('en', 'home.addRelationship')).toBe('Add Relationship');
    expect(getMessage('es', 'home.addRelationship')).toBe('Añadir relación');
    expect(getMessage('en', 'home.selectActiveRelationship')).toBe(
      'Choose an active relationship',
    );
    expect(getMessage('es', 'home.selectActiveRelationship')).toBe(
      'Elige una relación activa',
    );
    expect(getMessage('en', 'home.createRelationshipDescription')).toBe(
      'Start a new relationship space for shared plans and activities.',
    );
    expect(getMessage('es', 'home.createRelationshipDescription')).toBe(
      'Crea un nuevo espacio de relación para compartir planes y actividades.',
    );
    expect(getMessage('en', 'home.createRelationshipHint')).toBe(
      'Set up a new relationship space.',
    );
    expect(getMessage('es', 'home.createRelationshipHint')).toBe(
      'Configura un nuevo espacio de relación.',
    );
  });

  it('falls back to english strings for missing locale values', () => {
    expect(getMessage('es', 'tabs.missing' as never)).toBe('tabs.missing');
    expect(getMessage('es', 'settings.title')).toBe('Configuración');
  });

  it('loads a stored locale and exposes a translation function', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'es' }]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('en');

    let current: ReturnType<typeof useI18n> | undefined;

    const TestConsumer = () => {
      current = useI18n();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(current?.locale).toBe('en');
    expect(current?.t('tabs.home')).toBe('Home');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@mobile/locale');
  });

  it('updates locale and persists it to storage', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'en' }]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    let current: ReturnType<typeof useI18n> | undefined;

    const TestConsumer = () => {
      current = useI18n();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => current?.setLocale('de'));

    expect(current?.locale).toBe('de');
    expect(current?.t('tabs.home')).toBe('Start');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@mobile/locale', 'de');
  });

  it('throws when useI18n is called outside a provider', () => {
    const TestConsumer = () => {
      useI18n();
      return null;
    };
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      expect(() => {
        renderer.create(React.createElement(TestConsumer));
      }).toThrow('useI18n must be used within an I18nProvider');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('falls back to the device locale when a stored locale is invalid', async () => {
    (getLocales as jest.Mock).mockReturnValue([{ languageCode: 'fr' }]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fr');

    let current: ReturnType<typeof useI18n> | undefined;

    const TestConsumer = () => {
      current = useI18n();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(current?.locale).toBe('en');
  });

  it('ignores locale storage failures when hydrating and updating locale', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
      new Error('read failed'),
    );
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
      new Error('write failed'),
    );

    let current: ReturnType<typeof useI18n> | undefined;

    const TestConsumer = () => {
      current = useI18n();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      expect(() => current?.setLocale('es')).not.toThrow();
    });

    expect(current?.locale).toBe('es');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@mobile/locale', 'es');
  });
});
