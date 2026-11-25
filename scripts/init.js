/* global __dirname */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { stdin: input, stdout: output } = require('node:process');
const readline = require('node:readline/promises');

const root = path.resolve(__dirname, '..');
const rootPackagePath = path.join(root, 'package.json');
const lockfilePath = path.join(root, 'package-lock.json');
const sharedTypesPackagePath = path.join(
  root,
  'libs',
  'shared-types',
  'package.json',
);
const mobileAppConfigPath = path.join(root, 'apps', 'mobile', 'app.json');
const mobileRoot = path.dirname(mobileAppConfigPath);
const easConfigPath = path.join(root, 'apps', 'mobile', 'eas.json');
const sharedTypesReferenceFiles = [
  path.join(root, 'apps', 'api', 'src', 'routes', 'health.ts'),
  path.join(root, 'apps', 'api', 'tsconfig.build.json'),
  path.join(root, 'apps', 'api', 'tsconfig.json'),
  path.join(root, 'apps', 'mobile', 'app', '(tabs)', 'index.tsx'),
  path.join(root, 'apps', 'mobile', 'features', 'backend', 'api.ts'),
  path.join(root, 'apps', 'mobile', 'tsconfig.json'),
  path.join(root, 'README.md'),
];
const templateSharedTypesName = '@expo-50sdk-template/shared-types';
const EAS_PROJECT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidEasProjectId(projectId) {
  return (
    typeof projectId === 'string' && EAS_PROJECT_ID_PATTERN.test(projectId)
  );
}

function ensureEasProject() {
  const appConfig = JSON.parse(fs.readFileSync(mobileAppConfigPath, 'utf8'));
  const projectId = appConfig.expo.extra?.eas?.projectId;
  if (isValidEasProjectId(projectId)) {
    return projectId;
  }

  console.log('\nCreate or link the EAS project for this app:');
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['--yes', 'eas-cli@latest', 'init'], {
    cwd: mobileRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw new Error(
      `Unable to start EAS project initialization: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error('EAS project initialization failed.');
  }

  const updatedConfig = JSON.parse(
    fs.readFileSync(mobileAppConfigPath, 'utf8'),
  );
  const initializedProjectId = updatedConfig.expo.extra?.eas?.projectId;
  if (!isValidEasProjectId(initializedProjectId)) {
    throw new Error(
      'EAS did not write a valid project ID to apps/mobile/app.json.',
    );
  }

  return initializedProjectId;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function compactIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function updateJson(filePath, update) {
  const document = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  update(document);
  fs.writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}

function updatePackageNames(packageName, sharedTypesName) {
  updateJson(rootPackagePath, (packageJson) => {
    packageJson.name = packageName;
  });

  updateJson(sharedTypesPackagePath, (packageJson) => {
    packageJson.name = sharedTypesName;
  });

  updateJson(lockfilePath, (lockfile) => {
    lockfile.name = packageName;
    lockfile.packages[''].name = packageName;

    const oldSharedTypesEntry =
      lockfile.packages['node_modules/@expo-50sdk-template/shared-types'];
    if (oldSharedTypesEntry) {
      delete lockfile.packages[
        'node_modules/@expo-50sdk-template/shared-types'
      ];
      lockfile.packages[`node_modules/${sharedTypesName}`] =
        oldSharedTypesEntry;
    }

    if (lockfile.dependencies?.['@expo-50sdk-template/shared-types']) {
      lockfile.dependencies[sharedTypesName] =
        lockfile.dependencies['@expo-50sdk-template/shared-types'];
      delete lockfile.dependencies['@expo-50sdk-template/shared-types'];
    }
  });

  for (const filePath of sharedTypesReferenceFiles) {
    const contents = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(
      filePath,
      contents.replaceAll(templateSharedTypesName, sharedTypesName),
      'utf8',
    );
  }
}

async function ask(rl, label, defaultValue) {
  const answer = (await rl.question(`${label} [${defaultValue}]: `)).trim();
  return answer || defaultValue;
}

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    const defaultName =
      path.basename(root) === 'expo-50sdk-template'
        ? 'My Expo App'
        : path.basename(root);
    const displayName = await ask(rl, 'Display name', defaultName);
    const slug = await ask(rl, 'Expo slug', slugify(displayName));
    const identifier = compactIdentifier(slug);
    const mongoName = slugify(slug) || 'app';
    const sharedTypesName = `@${mongoName}/shared-types`;
    const bundleIdentifier = await ask(
      rl,
      'iOS bundle identifier',
      `com.${identifier}`,
    );
    const androidPackage = await ask(rl, 'Android package', bundleIdentifier);
    const scheme = await ask(rl, 'Deep-link scheme', identifier);
    const apiUrl = await ask(
      rl,
      'Deployed API URL',
      'https://your-production-api.example.com',
    );
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    const issuerUrlDefault =
      easConfig.build.production.env?.EXPO_PUBLIC_IDP_URL;
    if (!issuerUrlDefault) {
      throw new Error(
        'EXPO_PUBLIC_IDP_URL must be set in the production EAS profile.',
      );
    }
    const issuerUrl = await ask(rl, 'OAuth/OIDC issuer URL', issuerUrlDefault);
    const normalizedIssuerUrl = issuerUrl.replace(/\/+$/, '');
    const audience = `${normalizedIssuerUrl}/resources/api`;

    updateJson(mobileAppConfigPath, (config) => {
      config.expo.name = displayName;
      config.expo.slug = slug;
      config.expo.scheme = scheme;
      config.expo.ios.bundleIdentifier = bundleIdentifier;
      config.expo.android.package = androidPackage;
      const easProjectId = config.expo.extra?.eas?.projectId;
      if (!isValidEasProjectId(easProjectId)) {
        delete config.expo.extra?.eas?.projectId;
      }
    });

    updatePackageNames(mongoName, sharedTypesName);

    updateJson(easConfigPath, (config) => {
      for (const profileName of ['preview', 'production']) {
        config.build[profileName].env = {
          ...config.build[profileName].env,
          EXPO_PUBLIC_ENV: 'production',
          EXPO_PUBLIC_API_URL: apiUrl,
          EXPO_PUBLIC_IDP_URL: normalizedIssuerUrl,
          EXPO_PUBLIC_OAUTH_AUDIENCE: audience,
        };
      }
    });

    rl.close();
    const easProjectId = ensureEasProject();

    console.log('\nInitialized mobile deployment configuration.');
    console.log(`- Expo slug: ${slug}`);
    console.log(`- Bundle/package identity: ${bundleIdentifier}`);
    console.log(`- EAS project: ${easProjectId}`);
    console.log(
      'Secrets and production provider credentials still need to be configured.',
    );
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`Initialization failed: ${error.message}`);
  process.exitCode = 1;
});
