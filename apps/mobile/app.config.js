const requiredServiceUrls = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_IDP_URL'];

function validateBuildServiceUrls(environment) {
  const isProductionOrEasBuild =
    environment.EAS_BUILD === 'true' ||
    environment.EXPO_PUBLIC_ENV?.trim().toLowerCase() === 'production';
  if (!isProductionOrEasBuild) return;

  const missing = requiredServiceUrls.filter(
    (name) => !environment[name]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(`Production and EAS builds require ${missing.join(', ')}.`);
  }
}

module.exports = ({ config }) => {
  const environment = process.env;
  validateBuildServiceUrls(environment);

  const isLocalDevelopment =
    /^(dev|development)$/i.test(environment.EXPO_PUBLIC_ENV?.trim() ?? '') &&
    environment.EAS_BUILD !== 'true' &&
    !environment.EAS_BUILD_PROFILE;

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['expo-notifications', { defaultChannel: 'default' }],
      ...(isLocalDevelopment
        ? [
            [
              'expo-build-properties',
              {
                android: {
                  cmakeVersion: '4.1.2',
                },
              },
            ],
          ]
        : []),
    ],
  };
};
