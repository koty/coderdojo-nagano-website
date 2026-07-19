const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 設定
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const templatePath = path.join(srcDir, 'index.html');
const mdPath = path.join(__dirname, 'recent_dojo.md');
const outputPath = path.join(distDir, 'index.html');

// コピーするアセットのリスト
const assets = [
  'logo.jpg',
  'favicon.png',
  'apple-touch-icon.png',
  'champion-img.jpg'
];

function build() {
  console.log('Building website...');

  // dist ディレクトリの作成
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. マークダウンの読み込みとパース
  if (!fs.existsSync(mdPath)) {
    console.error(`Error: ${mdPath} not found.`);
    process.exit(1);
  }
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  // marked.parse を使用してHTMLに変換
  const parsedHtml = marked.parse(mdContent);

  // 2. テンプレートHTMLの読み込みとプレースホルダーの置換
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: ${templatePath} not found.`);
    process.exit(1);
  }
  let templateHtml = fs.readFileSync(templatePath, 'utf8');
  
  // <!-- %RECENT_DOJO% --> を置換
  const finalHtml = templateHtml.replace('<!-- %RECENT_DOJO% -->', parsedHtml);

  // 3. dist/index.html への書き出し
  fs.writeFileSync(outputPath, finalHtml, 'utf8');
  console.log('Generated dist/index.html');

  // 4. アセットのコピー
  assets.forEach(asset => {
    const srcAssetPath = path.join(__dirname, asset);
    const destAssetPath = path.join(distDir, asset);

    if (fs.existsSync(srcAssetPath)) {
      fs.copyFileSync(srcAssetPath, destAssetPath);
      console.log(`Copied ${asset} to dist/`);
    } else {
      console.warn(`Warning: Asset ${asset} not found at root.`);
    }
  });

  console.log('Build completed successfully!');
}

build();
