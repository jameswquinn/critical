const path = require('path');
const fs = require('fs-extra');
const through2 = require('through2');
const PluginError = require('plugin-error');
const replaceExtension = require('replace-ext');
const {create} = require('./src/core');
const {getOptions} = require('./src/config');

process.on('unhandledRejection', reason => {
  console.log('Unhandled Rejection at:', reason.stack || reason);
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});

/**
 * Critical path CSS generation
 * @param  {object} params Options
 * @param  {function} cb Callback
 * @return {Promise}
 */
async function generate(params, cb) {
  try {
    const options = getOptions(params);
    const {target = {}} = options;

    const {css, html} = await create(options);

    // Store generated css
    if (target.css) {
      await fs.outputFile(path.resolve(target.css), css);
    }

    // Store generated html
    if (target.html) {
      await fs.outputFile(path.resolve(target.html), html);
    }

    if (typeof cb === 'function') {
      cb(null, {css, html});
      return;
    }

    return {css, html};
  } catch (error) {
    if (typeof cb === 'function') {
      cb(error);
      return;
    }

    throw error;
  }
}

/**
 * Streams wrapper for critical
 *
 * @param {object} options
 * @returns {*}
 */
function stream(options) {
  // Return stream
  return through2.obj(function(file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return this.emit('error', new PluginError('critical', 'Streaming not supported'));
    }

    generate({...options, src: file}, (err, {css, html}) => {
      if (err) {
        return cb(new PluginError('critical', err.message));
      }

      // Rename file if not inlined
      if (options.inline) {
        file.contents = Buffer.from(html);
      } else {
        file.path = replaceExtension(file.path, '.css');
        file.contents = Buffer.from(css);
      }

      cb(err, file);
    });
  });
}

generate.stream = stream;

module.exports = {
  generate,
  stream,
};
