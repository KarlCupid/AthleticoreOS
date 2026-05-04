import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import type { ComponentType } from 'react';

import { addMonitoringBreadcrumb } from './lib/observability/breadcrumbs';
import { wrapRootComponent } from './lib/observability/monitoring';
import { logError } from './lib/utils/logger';

declare const require: (moduleName: string) => { default: ComponentType<Record<string, never>> };

let App: ComponentType<Record<string, never>>;

try {
  addMonitoringBreadcrumb('app', 'root_module_load_started');
  App = require('./App').default;
  addMonitoringBreadcrumb('app', 'root_module_load_succeeded');
} catch (error) {
  logError('index.loadRootModule', error, { appLoadStage: 'loadRootModule' });
  throw error;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
try {
  addMonitoringBreadcrumb('app', 'root_registration_started');
  registerRootComponent(wrapRootComponent(App));
  addMonitoringBreadcrumb('app', 'root_registration_succeeded');
} catch (error) {
  logError('index.registerRootComponent', error, { appLoadStage: 'registerRootComponent' });
  throw error;
}
