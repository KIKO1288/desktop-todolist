const fs = require('node:fs');
const path = require('node:path');
const { NtExecutable, NtExecutableResource } = require('pe-library');
const ResEdit = require('resedit');

const targetPath = process.argv[2] || path.join('dist', 'win-unpacked', '桌面清单.exe');
const portablePath = process.argv[3] || path.join('dist', '桌面清单-1.0.0-portable.exe');
const outputPath = process.argv[4] || path.join('qa', 'portable-icon-rewritten.exe');

function readResources(filePath) {
  const executable = NtExecutable.from(fs.readFileSync(filePath), { ignoreCert: true });
  return { executable, resources: NtExecutableResource.from(executable) };
}

const target = readResources(targetPath);
const portable = readResources(portablePath);
const targetGroup = ResEdit.Resource.IconGroupEntry.fromEntries(target.resources.entries)[0];
const portableGroup = ResEdit.Resource.IconGroupEntry.fromEntries(portable.resources.entries)[0];
if (!targetGroup || !portableGroup) throw new Error('Could not find an icon group in one of the executables');

const targetIcons = targetGroup.getIconItemsFromEntries(target.resources.entries);
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  portable.resources.entries,
  portableGroup.id,
  portableGroup.lang,
  targetIcons
);
portable.resources.outputResource(portable.executable);

const generated = Buffer.from(portable.executable.generate());
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generated);

const verify = readResources(outputPath);
const verifyGroup = ResEdit.Resource.IconGroupEntry.fromEntries(verify.resources.entries)[0];
const verifyIcon = verifyGroup.getIconItemsFromEntries(verify.resources.entries)[0];
const targetIcon = targetGroup.getIconItemsFromEntries(target.resources.entries)[0];
const equal = Buffer.from(verifyIcon.bin).equals(Buffer.from(targetIcon.bin));
if (!equal) throw new Error('Icon resource verification failed');

console.log(JSON.stringify({
  target: path.resolve(targetPath),
  portable: path.resolve(portablePath),
  output: path.resolve(outputPath),
  targetGroup: targetGroup.id,
  portableGroup: portableGroup.id,
  iconBytes: targetIcon.bin.byteLength,
  outputBytes: generated.length,
  iconMatches: equal
}, null, 2));
