const CleanCSS = require('clean-css');
const invokeMap = require('lodash/invokeMap');
const postcss = require('postcss');
const discard = require('postcss-discard');
const penthouse = require('penthouse');
const inlineCritical = require('inline-critical');
const {mapAsync} = require('./array');
const {NoCssError} = require('./errors');
const {getDocument, getDocumentFromSource, token} = require('./file');

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
  const {dimensions, width, height, userAgent, user, pass, penthouse:params = {}} = options;
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

  const browserPromise = puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ['--disable-setuid-sandbox', '--no-sandbox'],
    // not required to specify here, but saves Penthouse some work if you will
    // re-use the same viewport for most penthouse calls.
    defaultViewport: {
      width: 1300,
      height: 900
    }
  })

  const styles = await mapAsync(sizes, async ({width, height}) => console.log({...config, width, height}) || await penthouse({...config, width, height}).then(res => console.log(res) || res));

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
  const {src, html, inline, ignore, minify} = options;

  const document = src ? await getDocument(src, options) : await getDocumentFromSource(html, options);

  if (!document.css || !document.css.toString()) {
    if (options.strict) {
      throw new NoCssError()
    }

    return {
      css: '',
      html: document.contents.toString(),
    }
  }

  let criticalCSS = await callPenthouse(document, options);

  if (ignore) {
    criticalCSS = postcss([discard(ignore)]).process(criticalCSS, { from: undefined }).css;
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
