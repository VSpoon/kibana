import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface GuidedOnboardingPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GuidedOnboardingPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
