const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 設定
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const postsSrcDir = path.join(__dirname, 'posts');
const postsDistDir = path.join(distDir, 'posts');

const indexTemplatePath = path.join(srcDir, 'index.html');
const postTemplatePath = path.join(srcDir, 'post.html');
const indexOutputPath = path.join(distDir, 'index.html');

// コピーするアセットのリスト
const assets = [
  'logo.jpg',
  'favicon.png',
  'apple-touch-icon.png',
  'champion-img.jpg'
];

function build() {
  console.log('Building website with archives...');

  // 必要なディレクトリの作成
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  if (!fs.existsSync(postsDistDir)) {
    fs.mkdirSync(postsDistDir, { recursive: true });
  }

  // 1. posts/ 内のマークダウンファイルを全スキャン
  if (!fs.existsSync(postsSrcDir)) {
    console.error(`Error: ${postsSrcDir} not found.`);
    process.exit(1);
  }

  const files = fs.readdirSync(postsSrcDir)
    .filter(file => file.endsWith('.md'))
    // ファイル名（例: dojo_014.md）を降順でソート (最新が配列の先頭 [0])
    .sort((a, b) => b.localeCompare(a));

  if (files.length === 0) {
    console.error('Error: No markdown files found in posts/.');
    process.exit(1);
  }

  console.log(`Found ${files.length} posts:`, files);

  // 記事データの一覧を格納する配列
  const postsData = [];

  // 各マークダウンをパースし、個別HTMLを生成
  const postTemplate = fs.readFileSync(postTemplatePath, 'utf8');

  files.forEach(file => {
    const mdPath = path.join(postsSrcDir, file);
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    
    // タイトルの抽出 (最初の見出し行を取得)
    const titleMatch = mdContent.match(/^#+\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'CoderDojo長野の様子';
    
    // HTMLへのパース
    const parsedHtml = marked.parse(mdContent);
    
    // ファイル名から拡張子を除いたベース名 (例: dojo_014)
    const baseName = path.basename(file, '.md');
    const htmlFileName = `${baseName}.html`;
    const postOutputPath = path.join(postsDistDir, htmlFileName);

    // 個別ポストHTMLの作成
    let postHtml = postTemplate
      .replace('<!-- %POST_TITLE% -->', title)
      .replace('<!-- %POST_CONTENT% -->', parsedHtml);

    fs.writeFileSync(postOutputPath, postHtml, 'utf8');
    console.log(`Generated individual post: posts/${htmlFileName}`);

    postsData.push({
      fileName: htmlFileName,
      title: title,
      htmlContent: parsedHtml
    });
  });

  // 2. インデックスページのビルド
  const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');

  // 最新記事（配列の最初の記事）をトップに埋め込む
  const latestPost = postsData[0];
  console.log(`Latest post embedded: ${latestPost.title}`);

  // 過去の記事（2番目以降）をアーカイブリンクにする
  const archivePosts = postsData.slice(1);
  let archiveListHtml = '';

  if (archivePosts.length > 0) {
    archiveListHtml = archivePosts.map(post => {
      return `<li><a href="./posts/${post.fileName}">${post.title}</a></li>`;
    }).join('\n');
  } else {
    archiveListHtml = '<li>過去の活動記録はありません。</li>';
  }

  // プレースホルダーの置換
  let finalIndexHtml = indexTemplate
    .replace('<!-- %RECENT_DOJO% -->', latestPost.htmlContent)
    .replace('<!-- %DOJO_ARCHIVES% -->', archiveListHtml);

  fs.writeFileSync(indexOutputPath, finalIndexHtml, 'utf8');
  console.log('Generated dist/index.html');

  // 3. アセットのコピー
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
