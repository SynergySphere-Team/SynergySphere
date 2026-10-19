const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

// Windows / OneDrive reparse point fix: Ensure @expo/metro-file-map handles EINVAL safely
try {
  const metroFileMapPath = require.resolve('@expo/metro-file-map/build/index.js');
  let content = fs.readFileSync(metroFileMapPath, 'utf8');
  if (!content.includes('EINVAL')) {
    content = content.replace(
      'fileMetadata[constants_1.default.SYMLINK] = (0, normalizePathSeparatorsToPosix_1.default)(this.#pathUtils.resolveSymlinkToNormal(normalPath, symlinkTarget));\n            });',
      "fileMetadata[constants_1.default.SYMLINK] = (0, normalizePathSeparatorsToPosix_1.default)(this.#pathUtils.resolveSymlinkToNormal(normalPath, symlinkTarget));\n            }).catch((error) => {\n                if (['EINVAL', 'UNKNOWN', 'ENOTDIR'].includes(error.code ?? '')) {\n                    fileMetadata[constants_1.default.VISITED] = 1;\n                    fileMetadata[constants_1.default.SYMLINK] = 0;\n                    return;\n                }\n                throw error;\n            });"
    );
    content = content.replace(
      "['ENOENT', 'EACCESS'].includes(error.code ?? '')",
      "['ENOENT', 'EACCESS', 'EINVAL', 'UNKNOWN', 'ENOTDIR'].includes(error.code ?? '')"
    );
    fs.writeFileSync(metroFileMapPath, content, 'utf8');
  }
} catch {
  // Non-fatal if read-only or not found
}

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

config.resolver.disableHierarchicalLookup = false;

// Exclude other workspaces and unnecessary folders from Metro file mapping
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
  ? [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  new RegExp(`^${path.resolve(workspaceRoot, 'backend').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`),
  new RegExp(`^${path.resolve(workspaceRoot, 'frontend').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`),
  new RegExp(`^${path.resolve(workspaceRoot, 'docs').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`),
  new RegExp(`^${path.resolve(workspaceRoot, 'build').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`),
  new RegExp(`^${path.resolve(workspaceRoot, '.local-postgres').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`),
];

// Explicitly map react-native-screens and its subpaths so Metro can resolve
// them correctly in the monorepo (fixes "react-native-screens/experimental" error)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-glass-effect': path.resolve(projectRoot, 'src/shims/expo-glass-effect.js'),
  'react-native-screens': rnScreensRoot,
  'react-native-screens/experimental': path.resolve(rnScreensRoot, 'experimental'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-glass-effect') {
    return {
      filePath: path.resolve(projectRoot, 'src/shims/expo-glass-effect.js'),
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
