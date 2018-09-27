const penthouse = require('penthouse');

const opts = { forceInclude: [],
  timeout: 30000,
  maxEmbeddedBase64Length: 10240,
  cssString:
    '@media screen and (min-width: 900px) {\n    div  {\n        height: 400px;\n        background: brown;\n    }\n}\n\n#revenge {\n    background: papayawhip;\n}\n\n#of {\n    background: teal;\n}\n\n#guybrush {\n    color: pink;\n}\n\n#threepwood {\n    background: orange;\n    content: \'monkey island\';\n}\n',
  url:
    'file:///Users/bzoerb/Github/critical/test/fixtures/generate-adaptive.html',
  width: 1000,
  height: 70 };

const opts2 = { forceInclude: [],
  timeout: 30000,
  maxEmbeddedBase64Length: 10240,
  url:
    'file:///Users/bzoerb/Github/critical/test/fixtures/test-adaptive2.html',
  cssString:
    '\n@media screen and (min-width: 900px) {\n    div  {\n        height: 400px;\n        background: brown;\n    }\n}\n\n#revenge {\n    background: papayawhip;\n}\n\n#of {\n    background: teal;\n}\n\n#guybrush {\n    color: pink;\n}\n\n#threepwood {\n    background: orange;\n    content: \'monkey island\';\n}\n',
  width: 1000,
  height: 70,
  userAgent: undefined };


const opts3 = { forceInclude: [],
  timeout: 30000,
  maxEmbeddedBase64Length: 10240,
  cssString:
    '@media screen and (min-width: 900px) {\n    div  {\n        height: 400px;\n        background: brown;\n    }\n}\n\n#revenge {\n    background: papayawhip;\n}\n\n#of {\n    background: teal;\n}\n\n#guybrush {\n    color: pink;\n}\n\n#threepwood {\n    background: orange;\n    content: \'monkey island\';\n}\n',
  url:
    'file:///Users/bzoerb/Github/critical-rewrite/test2.html',
  width: 1000,
  height: 70 };



Promise.all([
  penthouse(opts),
  penthouse(opts2),
  penthouse(opts3),
]).then(css => console.log(css))
