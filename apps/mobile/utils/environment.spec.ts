import { getIsDevelopmentMode } from './environment';

describe('environment helpers', () => {
  it('reads the development marker from the supplied environment', () => {
    expect(getIsDevelopmentMode({ EXPO_PUBLIC_ENV: 'development' })).toBe(true);
    expect(getIsDevelopmentMode({ EXPO_PUBLIC_ENV: 'production' })).toBe(false);
    expect(getIsDevelopmentMode({})).toBe(false);
  });

  it('reads the development marker from process.env', () => {
    const previousValue = process.env.EXPO_PUBLIC_ENV;
    process.env.EXPO_PUBLIC_ENV = 'development';

    try {
      expect(getIsDevelopmentMode()).toBe(true);
    } finally {
      if (previousValue === undefined) {
        delete process.env.EXPO_PUBLIC_ENV;
      } else {
        process.env.EXPO_PUBLIC_ENV = previousValue;
      }
    }
  });
});
