const appConfig = require('./app.config');

const environmentNames = [
  'EAS_BUILD',
  'EAS_BUILD_PROFILE',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_ENV',
  'EXPO_PUBLIC_IDP_URL',
];
const originalEnvironment = Object.fromEntries(
  environmentNames.map((name) => [name, process.env[name]]),
);

beforeEach(() => {
  for (const name of environmentNames) {
    delete process.env[name];
  }
});

afterAll(() => {
  for (const name of environmentNames) {
    const value = originalEnvironment[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

test('production builds require both service URLs', () => {
  process.env.EXPO_PUBLIC_ENV = 'production';

  expect(() => appConfig({ config: {} })).toThrow(
    'Production and EAS builds require EXPO_PUBLIC_API_URL, EXPO_PUBLIC_IDP_URL.',
  );
});

test('EAS builds require both service URLs', () => {
  process.env.EAS_BUILD = 'true';

  expect(() => appConfig({ config: {} })).toThrow(
    'Production and EAS builds require EXPO_PUBLIC_API_URL, EXPO_PUBLIC_IDP_URL.',
  );
});

test('configured production builds include the notifications plugin', () => {
  process.env.EXPO_PUBLIC_ENV = 'production';
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  process.env.EXPO_PUBLIC_IDP_URL = 'https://identity.example.test';

  const result = appConfig({ config: {} });

  expect(result.plugins).toContainEqual([
    'expo-notifications',
    { defaultChannel: 'default' },
  ]);
});

test('local development adds Android CMake build properties', () => {
  process.env.EXPO_PUBLIC_ENV = 'development';

  const result = appConfig({ config: { plugins: [['existing-plugin', {}]] } });

  expect(result.plugins).toContainEqual(['existing-plugin', {}]);
  expect(result.plugins).toContainEqual([
    'expo-build-properties',
    { android: { cmakeVersion: '4.1.2' } },
  ]);
});

test('EAS builds do not add local development build properties', () => {
  process.env.EAS_BUILD = 'true';
  process.env.EXPO_PUBLIC_ENV = 'development';
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  process.env.EXPO_PUBLIC_IDP_URL = 'https://identity.example.test';

  const result = appConfig({ config: {} });

  expect(result.plugins).not.toContainEqual(
    expect.arrayContaining(['expo-build-properties']),
  );
});

test('an EAS build profile suppresses local development build properties', () => {
  process.env.EAS_BUILD_PROFILE = 'preview';
  process.env.EXPO_PUBLIC_ENV = 'development';

  const result = appConfig({ config: {} });

  expect(result.plugins).not.toContainEqual(
    expect.arrayContaining(['expo-build-properties']),
  );
});

test('default configuration omits local development build properties', () => {
  const result = appConfig({ config: {} });

  expect(result.plugins).not.toContainEqual(
    expect.arrayContaining(['expo-build-properties']),
  );
});
