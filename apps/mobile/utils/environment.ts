type EnvironmentVariables = Record<string, string | undefined>;

export function getIsDevelopmentMode(
  envVars: EnvironmentVariables = process.env,
) {
  return !!envVars.EXPO_PUBLIC_ENV?.match(/dev|development/i);
}
