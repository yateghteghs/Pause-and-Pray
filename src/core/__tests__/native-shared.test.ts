import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..', '..');

test('iOS GateShared.swift copies are identical', () => {
  const a = readFileSync(join(root, 'modules/app-gate/ios/GateShared.swift'), 'utf8');
  const b = readFileSync(join(root, 'targets/_shared/GateShared.swift'), 'utf8');
  expect(b).toBe(a);
});

test('Android deep-link scheme matches app.json', () => {
  const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
  const kt = readFileSync(
    join(root, 'modules/app-gate/android/src/main/java/org/pauseandpray/appgate/GateAccessibilityService.kt'),
    'utf8',
  );
  expect(kt).toContain(`const val SCHEME = "${app.expo.scheme}"`);
});
