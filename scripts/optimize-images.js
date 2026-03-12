const fs = require('fs');
const path = require('path');
const os = require('os');
const imageminModule = require('imagemin');
const imageminOptipngModule = require('imagemin-optipng');

const imagemin = imageminModule.default || imageminModule;
const imageminOptipng = imageminOptipngModule.default || imageminOptipngModule;

const ROOT = process.cwd();
const EXPLICIT_TARGETS = [path.join('assets', 'icon.png')];
const IMAGE_DIR = path.join(ROOT, 'assets', 'images');
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'athleticore-imgopt-'));

function bytesToKb(value) {
  return (value / 1024).toFixed(1);
}

function getTargets() {
  const candidates = [];

  for (const relativePath of EXPLICIT_TARGETS) {
    const absolutePath = path.join(ROOT, relativePath);
    if (fs.existsSync(absolutePath)) {
      candidates.push(absolutePath);
    }
  }

  if (fs.existsSync(IMAGE_DIR)) {
    const imageFiles = fs
      .readdirSync(IMAGE_DIR)
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .map((name) => path.join(IMAGE_DIR, name));
    candidates.push(...imageFiles);
  }

  return candidates
    .filter((filePath, index, all) => all.indexOf(filePath) === index)
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
}

async function optimizeOne(filePath) {
  const originalSize = fs.statSync(filePath).size;
  const output = await imagemin([filePath], {
    destination: TEMP_DIR,
    plugins: [imageminOptipng({ optimizationLevel: 5 })],
  });

  if (!output[0]) {
    return { filePath, originalSize, optimizedSize: originalSize, replaced: false };
  }

  const optimizedPath = output[0].destinationPath;
  const optimizedSize = fs.statSync(optimizedPath).size;

  if (optimizedSize < originalSize) {
    fs.copyFileSync(optimizedPath, filePath);
    return { filePath, originalSize, optimizedSize, replaced: true };
  }

  return { filePath, originalSize, optimizedSize, replaced: false };
}

async function main() {
  const targets = getTargets();
  if (targets.length === 0) {
    console.log('No PNG targets found.');
    return;
  }

  console.log(`Optimizing ${targets.length} PNG files with lossless optipng...`);
  const results = [];

  for (const target of targets) {
    const result = await optimizeOne(target);
    results.push(result);
    const relative = path.relative(ROOT, result.filePath);
    const delta = result.originalSize - result.optimizedSize;
    const label = result.replaced ? 'updated' : 'kept';
    console.log(
      `${label}: ${relative} (${bytesToKb(result.originalSize)} KB -> ${bytesToKb(
        result.optimizedSize
      )} KB, saved ${bytesToKb(Math.max(0, delta))} KB)`
    );
  }

  const totalBefore = results.reduce((sum, item) => sum + item.originalSize, 0);
  const totalAfter = results.reduce(
    (sum, item) => sum + (item.replaced ? item.optimizedSize : item.originalSize),
    0
  );
  const totalSaved = totalBefore - totalAfter;
  console.log(
    `Done. Total: ${bytesToKb(totalBefore)} KB -> ${bytesToKb(totalAfter)} KB (saved ${bytesToKb(
      totalSaved
    )} KB)`
  );
}

main()
  .catch((error) => {
    console.error('Image optimization failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  });
