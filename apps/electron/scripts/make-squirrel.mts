import type { Options as ElectronWinstallerOptions } from 'electron-winstaller';
import { convertVersion, createWindowsInstaller } from 'electron-winstaller';
import fs from 'fs-extra';
import path from 'path';

import {
  arch,
  buildType,
  iconUrl,
  platform,
  productName,
  ROOT,
} from './make-env';

async function ensureDirectory(dir: string) {
  if (await fs.pathExists(dir)) {
    await fs.remove(dir);
  }
  return fs.mkdirs(dir);
}

// taking from https://github.com/electron/forge/blob/main/packages/maker/squirrel/src/MakerSquirrel.ts
// it was for forge's maker, but can be used standalone as well
async function make() {
  const appName = productName;
  const makeDir = path.resolve(ROOT, 'out', buildType, 'make');
  const outPath = path.resolve(makeDir, `squirrel.windows/${arch}`);
  const appDirectory = path.resolve(
    ROOT,
    'out',
    buildType,
    `${appName}-${platform}-${arch}`
  );
  await ensureDirectory(outPath);

  const packageJSON = await fs.readJson(path.resolve(ROOT, 'package.json'));

  const winstallerConfig: ElectronWinstallerOptions = {
    name: appName,
    title: appName,
    noMsi: true,
    exe: `${appName}.exe`,
    setupExe: `${appName}-${packageJSON.version} Setup.exe`,
    version: packageJSON.version,
    appDirectory: appDirectory,
    outputDirectory: outPath,
    iconUrl: iconUrl,
    loadingGif: path.resolve(ROOT, './resources/icons/affine_installing.gif'),
  };

  await createWindowsInstaller(winstallerConfig);
  const nupkgVersion = convertVersion(packageJSON.version);
  const artifacts = [
    path.resolve(outPath, 'RELEASES'),
    path.resolve(outPath, winstallerConfig.setupExe || `${appName}Setup.exe`),
    path.resolve(
      outPath,
      `${winstallerConfig.name}-${nupkgVersion}-full.nupkg`
    ),
  ];
  const deltaPath = path.resolve(
    outPath,
    `${winstallerConfig.name}-${nupkgVersion}-delta.nupkg`
  );
  if (
    (winstallerConfig.remoteReleases && !winstallerConfig.noDelta) ||
    (await fs.pathExists(deltaPath))
  ) {
    artifacts.push(deltaPath);
  }
  const msiPath = path.resolve(
    outPath,
    winstallerConfig.setupMsi || `${appName}Setup.msi`
  );
  if (!winstallerConfig.noMsi && (await fs.pathExists(msiPath))) {
    artifacts.push(msiPath);
  }
  console.log('making squirrel.windows done:', artifacts);
  return artifacts;
}

make();
