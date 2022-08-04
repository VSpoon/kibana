import './index.scss';

import { GuidedOnboardingPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new GuidedOnboardingPlugin();
}
export { GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart } from './types';
