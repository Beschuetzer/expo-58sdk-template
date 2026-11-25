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
const apiPackagePath = path.join(root, 'apps', 'api', 'package.json');
const mobileAppConfigPath = path.join(root, 'apps', 'mobile', 'app.json');
const mobileRoot = path.dirname(mobileAppConfigPath);
const easConfigPath = path.join(root, 'apps', 'mobile', 'eas.json');
const sharedTypesReferenceFiles = [
  path.join(root, 'AGENTS.md'),
  rootPackagePath,
  apiPackagePath,
  path.join(
    root,
    'apps',
    'api',
    'src',
    'features',
    'notifications',
    'expoPush.ts',
  ),
  path.join(root, 'apps', 'api', 'src', 'logging.ts'),
  path.join(root, 'apps', 'api', 'src', 'routes', 'health.ts'),
  path.join(root, 'apps', 'api', 'src', 'routes', 'mobileLogs.spec.ts'),
  path.join(root, 'apps', 'api', 'tsconfig.build.json'),
  path.join(root, 'apps', 'api', 'tsconfig.json'),
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
    shell: process.platform === 'win32',
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

function renameDependency(dependencies, oldName, newName) {
  if (!dependencies || !Object.hasOwn(dependencies, oldName)) {
    return;
  }

  dependencies[newName] = dependencies[oldName];
  delete dependencies[oldName];
}

function renamePackageReferences(packageInfo, oldName, newName) {
  if (!packageInfo || typeof packageInfo !== 'object') {
    return;
  }

  if (packageInfo.name === oldName) {
    packageInfo.name = newName;
  }

  for (const referenceType of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
    'requires',
  ]) {
    const references = packageInfo[referenceType];
    renameDependency(references, oldName, newName);
    if (references && typeof references === 'object') {
      for (const nestedPackageInfo of Object.values(references)) {
        renamePackageReferences(nestedPackageInfo, oldName, newName);
      }
    }
  }
}

function updatePackageNames(packageName, sharedTypesName) {
  updateJson(rootPackagePath, (packageJson) => {
    packageJson.name = packageName;
  });

  updateJson(apiPackagePath, (packageJson) => {
    for (const dependencyType of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      renameDependency(
        packageJson[dependencyType],
        templateSharedTypesName,
        sharedTypesName,
      );
    }
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

    const lockfilePackageInfos = [
      ...Object.values(lockfile.packages),
      ...Object.values(lockfile.dependencies ?? {}),
    ];
    for (const packageInfo of lockfilePackageInfos) {
      renamePackageReferences(
        packageInfo,
        templateSharedTypesName,
        sharedTypesName,
      );
    }

    renameDependency(
      lockfile.dependencies,
      templateSharedTypesName,
      sharedTypesName,
    );
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

function createPrompt(rl) {
  const answers = rl[Symbol.asyncIterator]();
  return async (label, defaultValue) => {
    const defaultHint = defaultValue ? ` [${defaultValue}]` : '';
    output.write(`${label}${defaultHint}: `);
    const { value, done } = await answers.next();
    const answer = done ? '' : value.trim();
    return answer || defaultValue || '';
  };
}

async function askRequired(prompt, label, defaultValue) {
  const answer = await prompt(label, defaultValue);
  if (!answer) {
    throw new Error(`${label} is required.`);
  }

  return answer;
}

function normalizeServiceUrl(value, label) {
  const normalizedValue = value.trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(normalizedValue);
  } catch {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL.`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL.`);
  }

  return normalizedValue;
}

async function main() {
  const rl = readline.createInterface({ input, output });
  try {
    const prompt = createPrompt(rl);
    const defaultName =
      path.basename(root) === 'expo-50sdk-template'
        ? 'My Expo App'
        : path.basename(root);
    const displayName = await prompt('Display name', defaultName);
    const slug = await prompt('Expo slug', slugify(displayName));
    const identifier = compactIdentifier(slug);
    const mongoName = slugify(slug) || 'app';
    const sharedTypesName = `@${mongoName}/shared-types`;
    const bundleIdentifier = await prompt(
      'iOS bundle identifier',
      `com.${identifier}`,
    );
    const androidPackage = await prompt('Android package', bundleIdentifier);
    const scheme = await prompt('Deep-link scheme', identifier);
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    for (const profileName of ['preview', 'production']) {
      if (!easConfig.build?.[profileName]) {
        throw new Error(
          `apps/mobile/eas.json must define a ${profileName} build profile.`,
        );
      }
    }

    const productionEnv = easConfig.build.production.env ?? {};
    const apiUrl = normalizeServiceUrl(
      await askRequired(
        prompt,
        'Deployed API URL',
        productionEnv.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL,
      ),
      'Deployed API URL',
    );
    const issuerUrl = normalizeServiceUrl(
      await askRequired(
        prompt,
        'OAuth/OIDC issuer URL',
        productionEnv.EXPO_PUBLIC_IDP_URL || process.env.EXPO_PUBLIC_IDP_URL,
      ),
      'OAuth/OIDC issuer URL',
    );
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
          EXPO_PUBLIC_OAUTH_SCHEME: scheme,
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
