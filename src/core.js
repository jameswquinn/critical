const path = require('path');
const CleanCSS = require('clean-css');
const invokeMap = require('lodash/invokeMap');
const postcss = require('postcss');
const discard = require('postcss-discard');
const imageInliner = require('postcss-image-inliner');
const penthouse = require('penthouse');
const inlineCritical = require('inline-critical');
const parseCssUrls = require('css-url-parser');
const {mapAsync, reduceAsync} = require('./array');
const {NoCssError} = require('./errors');
const {getDocument, getDocumentFromSource, token, getAssetPaths} = require('./file');

/**
 * Returns a string of combined and deduped css rules.
 * @param {array} cssArray
 * @returns {String}
 */
function combineCss(cssArray) {
  if (cssArray.length === 1) {
    return cssArray[0].toString();
  }

  return new CleanCSS({
    level: {
      1: {
        all: true
      },
      2: {
        all: false,
        removeDuplicateFontRules: true,
        removeDuplicateMediaBlocks: true,
        removeDuplicateRules: true,
        removeEmpty: true,
        mergeMedia: true
      }
    }
  }).minify(
    invokeMap(cssArray, 'toString').join(' ')
  ).styles;
}


/**
 * Let penthouse compute the critical css
 * @param {vinyl} document
 * @param {object} options Options passed to critical
 * @returns {function}
 */
async function callPenthouse(document, options) {
  const {dimensions, width, height, userAgent, user, pass, penthouse: params = {}} = options;
  const {customPageHeaders = {}} = params;
  const {css: cssString, url} = document;
  const config = {...params, cssString, url};
  const sizes = Array.isArray(dimensions) ? dimensions : [{width, height}];

  if (userAgent) {
    config.userAgent = userAgent;
  }

  if (user && pass) {
    config.customPageHeaders = {...customPageHeaders, Authorization: 'Basic ' + token(user, pass)};
  }

  const styles = await mapAsync(sizes, async ({width, height}) => await penthouse({...config, width, height}));

  return combineCss(styles);
}

/**
 * Critical path CSS generation
 * @param  {object} options Options
 * @accepts src, base, width, height, dimensions, dest
 * @return {Promise<vinyl>}
 */
async function create(options = {}) {
  const cleanCSS = new CleanCSS();
  const {src, html, inline, ignore, minify, inlineImages, maxImageFileSize, postcss: postProcess = [], strict, assetPaths = []} = options;
  const document = src ? await getDocument(src, options) : await getDocumentFromSource(html, options);

  if (!document.css || !document.css.toString()) {
    if (strict) {
      throw new NoCssError()
    }

    return {
      css: '',
      html: document.contents.toString(),
    }
  }

  let criticalCSS = await callPenthouse(document, options);

  if (ignore) {
    postProcess.push(discard(ignore));
  }

  if (inlineImages) {
    const referencedAssets = parseCssUrls(criticalCSS);
    const referencedAssetPaths = referencedAssets.reduce((res, file) => [...res, path.dirname(file)], []);
    const searchpaths = [];
    await reduceAsync([...new Set(referencedAssetPaths)], async (res, file) => {
      const paths = await getAssetPaths(document, file, options);
      return [new Set([...res, ...paths])];
    }, assetPaths);


    const inlineOptions = {
      assetPaths: searchpaths,
      maxFileSize: maxImageFileSize
    };

    postProcess.push(imageInliner(inlineOptions));
  }

  if (postProcess.length) {
    criticalCSS = await postcss(postProcess).process(criticalCSS, {from: undefined}).then(contents => contents.css);
  }

  if (minify) {
    criticalCSS = cleanCSS.minify(criticalCSS).styles;
  }

  // Inline
  if (inline) {
    const inlined = inlineCritical(document.contents.toString(), criticalCSS, inline);
    document.contents = Buffer.from(inlined);
  }

  // cleanup output
  return {
    css: criticalCSS,
    html: document.contents.toString(),
  };
}

module.exports = {
  create,
};
