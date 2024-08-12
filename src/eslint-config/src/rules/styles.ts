const rules = {
  // See: https://eslint.style/rules/js/array-bracket-newline
  "@stylistic/array-bracket-newline": "off",

  // See: https://eslint.style/rules/array-bracket-spacing
  "@stylistic/array-bracket-spacing": ["error", "never"],

  // See: https://eslint.style/rules/js/array-element-newline
  "@stylistic/array-element-newline": "off",

  // See: https://eslint.style/rules/block-spacing
  "@stylistic/block-spacing": ["error", "always"],

  // See: https://eslint.style/rules/brace-style
  "@stylistic/brace-style": ["error", "stroustrup"],

  // See: https://eslint.org/docs/rules/camelcase
  camelcase: "off",

  // See: https://eslint.org/docs/rules/capitalized-comments
  "capitalized-comments": "off",

  // See: https://eslint.style/rules/comma-dangle
  "@stylistic/comma-dangle": ["error", "never"],

  // See: https://eslint.style/rules/comma-spacing
  "@stylistic/comma-spacing": [
    "error", { before: false, after: true }
  ],

  // See: https://eslint.style/rules/js/comma-style
  "@stylistic/comma-style": "off",

  // See: https://eslint.style/rules/computed-property-spacing
  "@stylistic/computed-property-spacing": ["error", "never"],

  // See: https://eslint.org/docs/rules/consistent-this
  "consistent-this": ["error", "self"],

  // See: https://eslint.style/rules/eol-last
  "@stylistic/eol-last": ["error", "always"],

  // See: https://eslint.style/rules/func-call-spacing
  "@stylistic/func-call-spacing": ["error", "never"],

  // See: https://eslint.org/docs/rules/func-name-matching
  "func-name-matching": "off",

  // See: https://eslint.org/docs/rules/func-names
  "func-names": ["error", "always"],

  // See: https://eslint.org/docs/rules/func-style
  "func-style": ["error", "declaration"],

  // See: https://eslint.style/rules/js/function-paren-newline
  "@stylistic/function-paren-newline": "off",

  // See: https://eslint.org/docs/rules/id-blacklist
  "id-denylist": "off",

  // See: https://eslint.org/docs/rules/id-length
  "id-length": "off",

  // See: https://eslint.org/docs/rules/id-match
  "id-match": "off",

  // See: https://eslint.style/rules/implicit-arrow-linebreak
  "@stylistic/implicit-arrow-linebreak": ["error", "beside"],

  // See: https://eslint.style/rules/js/rules/indent
  "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],

  // See: https://eslint.style/rules/js/jsx-quotes
  "@stylistic/jsx-quotes": "off",

  // See: https://eslint.style/rules/js/key-spacing
  "@stylistic/key-spacing": ["error", { beforeColon: false }],

  // See: https://eslint.style/rules/js/keyword-spacing
  "@stylistic/keyword-spacing": ["error", { before: true }],

  // See: https://eslint.style/rules/js/line-comment-position
  "@stylistic/line-comment-position": ["error", { position: "above" }],

  // See: https://eslint.style/rules/js/linebreak-style
  "@stylistic/linebreak-style": "off",

  // See: https://eslint.style/rules/js/lines-around-comment
  "@stylistic/lines-around-comment": "off",

  // See: https://eslint.style/rules/js/lines-between-class-members
  "@stylistic/lines-between-class-members": "off",

  // See: https://eslint.org/docs/rules/max-depth
  "max-depth": ["error", 4],

  // See: https://eslint.style/rules/js/max-len
  "@stylistic/max-len": [
    "error",
    {
      code: 130,
      comments: 150
    }
  ],

  // See: https://eslint.org/docs/rules/max-lines
  "max-lines": [
    "error",
    {
      max: 700,
      skipComments: true,
      skipBlankLines: true
    }
  ],

  // See: https://eslint.org/docs/rules/max-lines-per-function
  "max-lines-per-function": "off",

  // See: https://eslint.org/docs/rules/max-nested-callbacks
  "max-nested-callbacks": ["error", 5],

  // See: https://eslint.org/docs/rules/max-params
  "max-params": ["error", 3],

  // See: https://eslint.org/docs/rules/max-statements
  "max-statements": "off",

  // See: https://eslint.style/rules/js/max-statements-per-line
  "@stylistic/max-statements-per-line": "off",

  // See: https://eslint.style/rules/js/multiline-comment-style
  "@stylistic/multiline-comment-style": "off",

  // See: https://eslint.style/rules/js/ultiline-ternary
  "@stylistic/multiline-ternary": "off",

  // See: https://eslint.org/docs/rules/new-cap
  "new-cap": "off",

  // See: https://eslint.style/rules/js/new-parens
  "@stylistic/new-parens": "error",

  // See: https://eslint.style/rules/js/newline-per-chained-call
  "@stylistic/newline-per-chained-call": ["error", { ignoreChainWithDepth: 4 }],

  // See: https://eslint.org/docs/rules/no-array-constructor
  "no-array-constructor": "off",

  // See: https://eslint.org/docs/rules/no-bitwise
  "no-bitwise": "off",

  // See: https://eslint.org/docs/rules/no-continue
  "no-continue": "off",

  // See: https://eslint.org/docs/rules/no-inline-comments
  "no-inline-comments": "error",

  // See: https://eslint.org/docs/rules/no-lonely-if
  "no-lonely-if": "error",

  // See: https://eslint.style/rules/js/no-mixed-operators
  "@stylistic/no-mixed-operators": "error",

  // See: https://eslint.style/rules/js/no-mixed-spaces-and-tabs
  "@stylistic/no-mixed-spaces-and-tabs": "error",

  // See: https://eslint.org/docs/rules/no-multi-assign
  "no-multi-assign": "error",

  // See: https://eslint.style/rules/js/no-multiple-empty-lines
  "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],

  // See: https://eslint.org/docs/rules/no-negated-condition
  "no-negated-condition": "error",

  // See: https://eslint.org/docs/rules/no-nested-ternary
  "no-nested-ternary": "error",

  // See: https://eslint.org/docs/rules/no-plusplus
  "no-plusplus": "off",

  // See: https://eslint.org/docs/rules/no-restricted-syntax
  "no-restricted-syntax": "off",

  // See: https://eslint.style/rules/js/no-tabs
  "@stylistic/no-tabs": "off",

  // See: https://eslint.org/docs/rules/no-ternary
  "no-ternary": "off",

  // See: https://eslint.style/rules/js/no-trailing-spaces
  "@stylistic/no-trailing-spaces": "error",

  // See: https://eslint.org/docs/rules/no-underscore-dangle
  "no-underscore-dangle": "off",

  // See: https://eslint.org/docs/rules/no-unneeded-ternary
  "no-unneeded-ternary": "error",

  // See: https://eslint.style/rules/js/no-whitespace-before-property
  "@stylistic/no-whitespace-before-property": "error",

  // See: https://eslint.style/rules/js/nonblock-statement-body-position
  "@stylistic/nonblock-statement-body-position": "off",

  // See: https://eslint.style/rules/js/object-curly-newline
  "@stylistic/object-curly-newline": "off",

  // See: https://eslint.style/rules/js/object-curly-spacing
  "@stylistic/object-curly-spacing": ["error", "always"],

  // See: https://eslint.style/rules/js/object-property-newline
  "@stylistic/object-property-newline": "off",

  // See: https://eslint.org/docs/rules/one-var
  "one-var": ["error", "never"],

  // See: https://eslint.style/rules/js/one-var-declaration-per-line
  "@stylistic/one-var-declaration-per-line": "error",

  // See: https://eslint.org/docs/rules/operator-assignment
  "operator-assignment": ["error", "always"],

  // See: https://eslint.style/rules/js/operator-linebreak
  "@stylistic/operator-linebreak": "off",

  // See: https://eslint.style/rules/js/padded-blocks
  "@stylistic/padded-blocks": ["error", "never"],

  // See: https://eslint.style/rules/js/padding-line-between-statements
  "@stylistic/padding-line-between-statements": [
    "error",
    {
      blankLine: "always",
      prev: "*",
      next: "return"
    }
  ],

  // See: https://eslint.org/docs/rules/prefer-object-spread
  "prefer-object-spread": "off",

  // See: https://eslint.style/rules/js/quote-props
  "@stylistic/quote-props": ["error", "as-needed"],

  // See: https://eslint.style/rules/js/quotes
  "@stylistic/quotes": [
    "error",
    "double",
    {
      allowTemplateLiterals: true
    }
  ],

  // See: https://eslint.style/rules/js/semi
  "@stylistic/semi": ["error", "always"],

  // See: https://eslint.style/rules/js/semi-style
  "@stylistic/semi-style": ["error", "last"],

  // See: https://eslint.org/docs/rules/sort-keys
  "sort-keys": "off",

  // See: https://eslint.org/docs/rules/sort-vars
  "sort-vars": "error",

  // See: https://eslint.style/rules/js/sspace-before-blocks
  "@stylistic/space-before-blocks": "error",

  // See: https://eslint.style/rules/js/sspace-before-function-paren
  "@stylistic/space-before-function-paren": ["error", "never"],

  // See: https://eslint.style/rules/js/sspace-in-parens
  "@stylistic/space-in-parens": ["error", "never"],

  // See: https://eslint.style/rules/js/sspace-infix-ops
  "@stylistic/space-infix-ops": "error",

  // See: https://eslint.style/rules/js/sspace-unary-ops
  "@stylistic/space-unary-ops": "error",

  // See: https://eslint.style/rules/js/spaced-comment
  "@stylistic/spaced-comment": ["error", "always"],

  // See: https://eslint.style/rules/js/sswitch-colon-spacing
  "@stylistic/switch-colon-spacing": "error",

  // See: https://eslint.style/rules/js/template-tag-spacing
  "@stylistic/template-tag-spacing": ["error", "never"],

  // See: https://eslint.org/docs/rules/unicode-bom
  "unicode-bom": "error",

  // See: https://eslint.style/rules/js/twrap-regex
  "@stylistic/wrap-regex": "off"
};
export default rules;
