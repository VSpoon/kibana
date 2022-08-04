import { PluginInitializerContext } from '../../../../src/core/server';
import { GuidedOnboardingPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new GuidedOnboardingPlugin(initializerContext);
}

export { GuidedOnboardingPluginSetup, GuidedOnboardingPluginStart } from './types';
