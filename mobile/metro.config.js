const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

// Resolve react-native-screens from root node_modules
const rnScreensRoot = path.resolve(workspaceRoot, 'node_modules', 'react-native-screens');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo root
config.watchFolders = [workspaceRoot];

// Let Metro resolve packages from both mobile/node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Explicitly map react-native-screens and its subpaths so Metro can resolve
// them correctly in the monorepo (fixes "react-native-screens/experimental" error)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-screens': rnScreensRoot,
  'react-native-screens/experimental': path.resolve(rnScreensRoot, 'experimental'),
};

module.exports = config;
