const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// 設定
const siteBaseUrl = 'https://coderdojo-nagano.koty.dev';
const defaultSiteImage = `${siteBaseUrl}/logo.jpg`;
const defaultSiteDescription = '長野市で活動する、子どもたちのための無料プログラミングクラブ「CoderDojo長野」のWebサイトです。';

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

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractDescription(mdContent) {
  const plainText = mdContent
    .replace(/^#+\s.*$/gm, '') // Remove headers
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text
    .replace(/https?:\/\/\S+/g, '') // Remove bare URLs
    .replace(/[*_~`>#-]/g, '') // Remove markdown formatting chars
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  if (plainText.length > 120) {
    return plainText.slice(0, 117) + '...';
  }
  return plainText || defaultSiteDescription;
}

function extractImage(mdContent) {
  const match = mdContent.match(/!\[.*?\]\((.*?)\)/);
  if (match) {
    let imgUrl = match[1].trim();
    if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
      if (!imgUrl.startsWith('/')) {
        imgUrl = '/' + imgUrl;
      }
      return {
        url: `${siteBaseUrl}${imgUrl}`,
        cardType: 'summary_large_image'
      };
    }
    return {
      url: imgUrl,
      cardType: 'summary_large_image'
    };
  }
  return {
    url: defaultSiteImage,
    cardType: 'summary'
  };
}

function build() {
  console.log('Building website with archives...');

  // 出力ディレクトリの初期化（クリーン）
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(postsDistDir, { recursive: true });

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

    // OGPメタデータの抽出
    const description = extractDescription(mdContent);
    const imageInfo = extractImage(mdContent);
    const postUrl = `${siteBaseUrl}/posts/${htmlFileName}`;

    // 個別ポストHTMLの作成
    let postHtml = postTemplate
      .replaceAll('<!-- %POST_TITLE% -->', escapeHtmlAttr(title))
      .replaceAll('<!-- %POST_DESCRIPTION% -->', escapeHtmlAttr(description))
      .replaceAll('<!-- %POST_URL% -->', escapeHtmlAttr(postUrl))
      .replaceAll('<!-- %POST_IMAGE% -->', escapeHtmlAttr(imageInfo.url))
      .replaceAll('<!-- %TWITTER_CARD% -->', escapeHtmlAttr(imageInfo.cardType))
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

  // images ディレクトリが存在する場合は dist/images にコピー
  const imagesSrcDir = path.join(__dirname, 'images');
  const imagesDistDir = path.join(distDir, 'images');
  if (fs.existsSync(imagesSrcDir)) {
    fs.cpSync(imagesSrcDir, imagesDistDir, { recursive: true });
    console.log('Copied images/ to dist/images/');
  }

  console.log('Build completed successfully!');
}

build();
