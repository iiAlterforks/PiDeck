const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { Icns, IcnsImage } = require('@fiahfy/icns');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default ?? pngToIcoModule;

const out = path.join(__dirname, '..', 'build');
const svgPath = path.join(out, 'icon.svg');
const pngSourcePath = path.join(out, 'icon-source.png');
// 优先使用位图源 build/icon-source.png（适合实底品牌图标，铺满生成）；
// 否则回退到矢量源 build/icon.svg（内容缩到 87.5% 居中、四周保留透明留白）。
const usePngSource = fs.existsSync(pngSourcePath);
const svg = usePngSource ? '' : fs.readFileSync(svgPath, 'utf8');
const pngSource = usePngSource ? fs.readFileSync(pngSourcePath) : null;

const iconsDir = path.join(out, 'icons');
const iconContentRatio = 0.875;
const pngSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const icnsSources = [
  [16, 'icp4'],
  [32, 'icp5'],
  [32, 'ic11'],
  [64, 'icp6'],
  [64, 'ic12'],
  [128, 'ic07'],
  [256, 'ic08'],
  [256, 'ic13'],
  [512, 'ic09'],
  [512, 'ic14'],
  [1024, 'ic10'],
];

async function renderPng(size, target) {
  if (usePngSource) {
    // 实底位图源：直接按目标尺寸铺满，保留原图底色与内容，不做透明留白。
    await sharp(pngSource)
      .resize(size, size)
      .png()
      .toFile(target);
    return;
  }
  let innerSize = Math.max(1, Math.round(size * iconContentRatio));
  if (innerSize > 1) innerSize -= innerSize % 2;
  const icon = await sharp(Buffer.from(svg))
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  // Dock/Finder 会优先使用 icns 内的小尺寸图；如果小尺寸直接铺满画布，
  // 视觉上会比系统应用图标大一圈。所有平台图标都统一保留 6.25% 留白。
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: icon,
        left: Math.floor((size - innerSize) / 2),
        top: Math.floor((size - innerSize) / 2),
      },
    ])
    .png()
    .toFile(target);
}

async function writeIcns(target) {
  const icns = new Icns();
  for (const [size, osType] of icnsSources) {
    const file = path.join(iconsDir, `${size}x${size}.png`);
    const buffer = await fs.promises.readFile(file);
    icns.append(IcnsImage.fromPNG(buffer, osType));
  }
  await fs.promises.writeFile(target, icns.data);

  const header = await fs.promises.readFile(target, { encoding: null });
  if (header.subarray(0, 4).toString('ascii') !== 'icns') {
    throw new Error('generated icon.icns is invalid: missing icns file header');
  }
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });
  // 位图源模式下不回写 icon.svg，保留矢量源文件原状。
  if (!usePngSource) {
    fs.writeFileSync(svgPath, svg);
  }
  console.log(usePngSource ? 'source: build/icon-source.png (raster)' : 'source: build/icon.svg (vector)');

  // electron-builder 在 Linux 下会从 build/icons 读取多尺寸 PNG；
  // Windows 安装包需要 .ico，macOS 需要 .icns。显式生成这些格式，
  // 避免只存在 SVG 时各平台回退到默认 Electron 图标。
  await Promise.all(
    pngSizes.map(size => renderPng(size, path.join(iconsDir, `${size}x${size}.png`))),
  );

  await fs.promises.copyFile(path.join(iconsDir, '512x512.png'), path.join(out, 'icon.png'));
  const ico = await pngToIco([16, 24, 32, 48, 64, 128, 256].map(size => path.join(iconsDir, `${size}x${size}.png`)));
  await fs.promises.writeFile(path.join(out, 'icon.ico'), ico);
  await writeIcns(path.join(out, 'icon.icns'));

  console.log('wrote build/icon.svg, build/icon.png, build/icon.ico, build/icon.icns and build/icons/*.png');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
