'use strict';

var gutil = require('gulp-util');
var semver = require('semver');

function init()
{
    var JscsChecker = require('jscs');
    var eslint = require('gulp-eslint');
    var jscsCliConfig = require('jscs/lib/cli-config');
    var lazypipe = require('lazypipe');
    var pkg = require('./package.json');
    var through = require('through2');
    var util = require('util');
    
    function combine()
    {
        var obj = { };
        var callback = extend.bind(null, obj);
        forEach.call(arguments, callback);
        return obj;
    }
    
    function createError(message)
    {
        var error = new PluginError(pkgName, message);
        return error;
    }
    
    function failValidation()
    {
        function end(callback)
        {
            if (errorCount)
            {
                var message =
                    'Validation failed with ' + errorCount +
                    (errorCount === 1 ? ' error' : ' errors');
                var error = createError(message);
                this.emit('error', error);
            }
            callback();
        }
        
        function write(chunk, enc, callback)
        {
            var eslintData = chunk.eslint;
            if (eslintData)
                errorCount += eslintData.errorCount;
            var jscsData = chunk.jscs;
            if (jscsData)
                errorCount += jscsData.errorCount;
            callback(null, chunk);
        }
        
        var errorCount = 0;
        var stream = through.obj(write, end);
        return stream;
    }
    
    function jscs(config)
    {
        function write(chunk, enc, callback)
        {
            if (chunk.isStream())
            {
                var error = createError('Streaming not supported');
                callback(error);
                return;
            }
            if (!chunk.isNull() && !jscsChecker.getConfiguration().isFileExcluded(chunk.path))
            {
                var contents = chunk.contents.toString();
                var errors = jscsChecker.checkString(contents, chunk.path);
                var errorList = errors.getErrorList();
                var errorCount = errorList.length;
                chunk.jscs = { errorCount: errorCount, errors: errors };
            }
            callback(null, chunk);
        }
        
        var jscsChecker = new JscsChecker();
        jscsChecker.registerDefaultRules();
        jscsChecker.configure(config);
        var stream = through.obj(write);
        return stream;
    }
    
    function jscsReportErrors()
    {
        function write(chunk, enc, callback)
        {
            var jscsData = chunk.jscs;
            if (jscsData && jscsData.errorCount)
                jscsReporter([jscsData.errors]);
            callback(null, chunk);
        }
        
        var stream = through.obj(write);
        return stream;
    }
    
    function lint(opts)
    {
        opts = opts || { };
        var eslintOptions =
        {
            envs:           opts.envs,
            globals:        opts.globals,
            parserOptions:  opts.parserOptions,
            rules:          combine(ESLINT_RULES, opts.eslintRules)
        };
        var jscsConfig = combine(JSCS_RULES, opts.jscsRules);
        var createStream =
            lazypipe()
            .pipe(eslint, eslintOptions)
            .pipe(eslint.format)
            .pipe(jscs, jscsConfig)
            .pipe(jscsReportErrors)
            .pipe(failValidation);
        var stream = createStream();
        return stream;
    }
    
    var ESLINT_RULES =
    {
        /* Possible Errors */
        'no-cond-assign':                   'off',
        'no-console':                       'off',
        'no-constant-condition':            'error',
        'no-control-regex':                 'error',
        'no-debugger':                      'error',
        'no-dupe-args':                     'error',
        'no-dupe-keys':                     'error',
        'no-duplicate-case':                'error',
        'no-empty':                         ['error', { allowEmptyCatch: true }],
        'no-empty-character-class':         'error',
        'no-ex-assign':                     'error',
        'no-extra-boolean-cast':            'error',
        'no-extra-parens':                  'error',
        'no-extra-semi':                    'error',
        'no-func-assign':                   'error',
        'no-inner-declarations':            'error',
        'no-invalid-regexp':                'error',
        'no-irregular-whitespace':          'error',
        'no-obj-calls':                     'error',
        'no-prototype-builtins':            'off',
        'no-regex-spaces':                  'off',
        'no-sparse-arrays':                 'off',
        'no-template-curly-in-string':      'off',
        'no-unexpected-multiline':          'off',
        'no-unreachable':                   'error',
        'no-unsafe-finally':                'error',
        'no-unsafe-negation':               'error',
        'use-isnan':                        'error',
        'valid-jsdoc':                      'error',
        'valid-typeof':                     'error',
        
        /* Best Practices */
        'accessor-pairs':                   'error',
        'array-callback-return':            'off',
        'block-scoped-var':                 'off',
        'class-methods-use-this':           'off',
        'complexity':                       'off',
        'consistent-return':                'off',
        'curly':                            ['error', 'multi-or-nest'],
        'default-case':                     'off',
        'dot-location':                     ['error', 'property'],
        'dot-notation':                     'error',
        'eqeqeq':                           ['error', 'allow-null'],
        'guard-for-in':                     'off',
        'no-alert':                         'error',
        'no-caller':                        'error',
        'no-case-declarations':             'error',
        'no-div-regex':                     'error',
        'no-else-return':                   'error',
        'no-empty-function':                'off',
        'no-empty-pattern':                 'error',
        'no-eq-null':                       'off',
        'no-eval':                          'off',
        'no-extend-native':                 'error',
        'no-extra-bind':                    'error',
        'no-extra-label':                   'error',
        'no-fallthrough':                   'error',
        'no-floating-decimal':              'error',
        'no-global-assign':                 'error',
        'no-implicit-coercion':             'off',
        'no-implicit-globals':              'off',
        'no-implied-eval':                  'error',
        'no-invalid-this':                  'off',
        'no-iterator':                      'error',
        'no-labels':                        ['error', { allowLoop: true, allowSwitch: true }],
        'no-lone-blocks':                   'error',
        'no-loop-func':                     'error',
        'no-magic-numbers':                 'off',
        'no-multi-spaces':                  'off',
        'no-multi-str':                     'error',
        'no-new':                           'off',
        'no-new-func':                      'off',
        'no-new-wrappers':                  'error',
        'no-octal':                         'error',
        'no-octal-escape':                  'error',
        'no-param-reassign':                'off',
        'no-proto':                         'error',
        'no-redeclare':                     'error',
        'no-restricted-properties':         'off',
        'no-return-assign':                 'error',
        'no-script-url':                    'error',
        'no-self-assign':                   'error',
        'no-self-compare':                  'error',
        'no-sequences':                     'error',
        'no-throw-literal':                 'error',
        'no-unmodified-loop-condition':     'error',
        'no-unused-expressions':            'error',
        'no-unused-labels':                 'error',
        'no-useless-call':                  'error',
        'no-useless-concat':                'error',
        'no-useless-escape':                'error',
        'no-useless-return':                'error',
        'no-void':                          'off',
        'no-warning-comments':              'error',
        'no-with':                          'error',
        'radix':                            'error',
        'vars-on-top':                      'off',
        'wrap-iife':                        'off',
        'yoda':                             'error',
        
        /* Strict Mode */
        'strict':                           ['error', 'safe'],
        
        /* Variables */
        'init-declarations':                'off',
        'no-catch-shadow':                  'error',
        'no-delete-var':                    'error',
        'no-label-var':                     'error',
        'no-restricted-globals':            'error',
        'no-shadow':                        'error',
        'no-shadow-restricted-names':       'error',
        'no-undef':                         'error',
        'no-undef-init':                    'error',
        'no-undefined':                     'error',
        'no-unused-vars':                   ['error', { vars: 'local' }],
        'no-use-before-define':             'off',
        
        /* Node.js and CommonJS */
        'callback-return':                  'off',
        'global-require':                   'off',
        'handle-callback-err':              'error',
        'no-mixed-requires':                'error',
        'no-new-require':                   'error',
        'no-path-concat':                   'error',
        'no-process-env':                   'error',
        'no-process-exit':                  'error',
        'no-restricted-modules':            'error',
        'no-sync':                          'off',
        
        /* Stylistic Issues */
        'array-bracket-spacing':            'error',
        'block-spacing':                    'error',
        'brace-style':                      ['error', 'allman'],
        'camelcase':                        'off',
        'comma-dangle':                     ['error', 'only-multiline'],
        'comma-spacing':                    'error',
        'comma-style':
        ['error', 'last', { exceptions: { ArrayExpression: true } }],
        'computed-property-spacing':        'error',
        'consistent-this':                  'off',
        'eol-last':                         'error',
        'func-call-spacing':                'off',
        'func-name-matching':               'off',
        'func-names':                       ['error', 'never'],
        'func-style':                       'off',
        'id-blacklist':                     'off',
        'id-length':                        'off',
        // Encourage use of abbreviations: "char", "obj", "str".
        'id-match':                         ['error', '^(?!(character|object|string)(?![_a-z]))'],
        'indent':                           ['error', 4, { VariableDeclarator: 0 }],
        'jsx-quotes':                       'error',
        'key-spacing':                      ['error', { mode: 'minimum' }],
        'keyword-spacing':                  'error',
        'line-comment-position':            'off',
        'linebreak-style':                  'error',
        'lines-around-comment':
        ['error', { allowBlockStart: true, allowObjectStart: true }],
        'lines-around-directive':           'error',
        'max-depth':                        'off',
        'max-len':                          ['error', { code: 100 }],
        'max-lines':                        'off',
        'max-nested-callbacks':             'error',
        'max-params':                       'off',
        'max-statements':                   'off',
        'max-statements-per-line':          'error',
        'multiline-ternary':                'off',
        'new-cap':                          ['error', { capIsNew: false }],
        'new-parens':                       'error',
        'newline-after-var':                'off',
        'newline-before-return':            'off',
        'newline-per-chained-call':         'off',
        'no-array-constructor':             'error',
        'no-bitwise':                       'off',
        'no-continue':                      'off',
        'no-inline-comments':               'off',
        'no-lonely-if':                     'off',
        'no-mixed-operators':               'off',
        'no-mixed-spaces-and-tabs':         'off',
        'no-multiple-empty-lines':          ['error', { max: 1 }],
        'no-negated-condition':             'off',
        'no-nested-ternary':                'off',
        'no-new-object':                    'error',
        'no-plusplus':                      'off',
        'no-restricted-syntax':             'error',
        'no-tabs':                          'error',
        'no-ternary':                       'off',
        'no-trailing-spaces':               ['error', { skipBlankLines: true }],
        'no-underscore-dangle':             'off',
        'no-unneeded-ternary':              'error',
        'no-whitespace-before-property':    'error',
        'object-curly-newline':             'off',
        'object-curly-spacing':             ['error', 'always'],
        'object-property-newline':          ['error', { allowMultiplePropertiesPerLine: true }],
        'one-var':                          ['error', 'never'],
        'one-var-declaration-per-line':     'error',
        'operator-assignment':              'error',
        'operator-linebreak':               ['error', 'after'],
        'padded-blocks':                    ['error', 'never'],
        'quote-props':                      'off',
        'quotes':                           ['error', 'single'],
        'require-jsdoc':                    'off',
        'semi':                             'error',
        'semi-spacing':                     'error',
        'sort-keys':                        'off',
        'sort-vars':                        'off',
        'space-before-blocks':              'error',
        'space-before-function-paren':      ['error', { anonymous: 'always', named: 'never' }],
        'space-in-parens':                  'error',
        'space-infix-ops':                  'error',
        'space-unary-ops':                  'error',
        'spaced-comment':                   'error',
        'unicode-bom':                      'error',
        'wrap-regex':                       'off',
    };
    
    var JSCS_RULES =
    {
        disallowSpacesInCallExpression: true,
        requireAlignedMultilineParams: true,
        requireKeywordsOnNewLine:
        [
            'break',
            'case',
            'catch',
            'continue',
            'default',
            'do',
            'else',
            'finally',
            'for',
            'return',
            'switch',
            'throw',
            'try',
            'while'
        ],
        requireSpaceBeforeKeywords: ['delete', 'if', 'in', 'instanceof'],
    };
    
    var PluginError = gutil.PluginError;
    var extend = util._extend;
    var forEach = Array.prototype.forEach;
    var jscsReporter = jscsCliConfig.getReporter().writer;
    var pkgName = pkg.name;
    
    module.exports = lint;
}

if (semver.satisfies(process.version, '>=4.0.0'))
    init();
else
{
    module.exports = gutil.noop;
    console.error(gutil.colors.red('Validation not available in Node.js < 4'));
}
