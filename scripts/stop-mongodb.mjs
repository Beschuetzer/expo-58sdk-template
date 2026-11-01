import { execFileSync } from 'child_process';

const containerName = 'expo-58sdk-template';

try {
  execFileSync('podman', ['stop', containerName], {
    stdio: 'inherit',
  });
} catch (error) {
  if (error?.status !== 125) {
    throw error;
  }
}