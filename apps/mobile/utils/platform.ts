function getRequiredPublicUrl(name: string, value: string | undefined) {
  const normalizedValue = value?.trim().replace(/\/+$/, '');
  if (!normalizedValue) {
    throw new Error(`${name} must be supplied by AppHost or EAS.`);
  }
  return normalizedValue;
}

export function getBackendUrl() {
  return getRequiredPublicUrl(
    'EXPO_PUBLIC_API_URL',
    process.env.EXPO_PUBLIC_API_URL,
  );
}

export function getIdentityProviderUrl() {
  return getRequiredPublicUrl(
    'EXPO_PUBLIC_IDP_URL',
    process.env.EXPO_PUBLIC_IDP_URL,
  );
}
