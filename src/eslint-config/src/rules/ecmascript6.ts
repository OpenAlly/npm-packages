const rules = {
  // See: https://eslint.org/docs/rules/arrow-body-style
  "arrow-body-style": ["error", "as-needed", { requireReturnForObjectLiteral: true }],

  // See: https://eslint.style/rules/arrow-parens
  "@stylistic/arrow-parens": ["error", "always"],

  // See: https://eslint.style/rules/arrow-spacing
  "@stylistic/arrow-spacing": "error",

  // See: https://eslint.org/docs/rules/constructor-super
  "constructor-super": "error",

  // See: https://eslint.style/rules/enerator-star-spacing
  "@stylistic/generator-star-spacing": ["error", { before: false, after: true }],

  // See: https://eslint.org/docs/rules/no-class-assign
  "no-class-assign": "error",

  // See: https://eslint.style/rules/js/no-confusing-arrow
  "@stylistic/no-confusing-arrow": ["error", { allowParens: true }],

  // See: https://eslint.org/docs/rules/no-const-assign
  "no-const-assign": "error",

  // See: https://eslint.org/docs/rules/no-dupe-class-members
  "no-dupe-class-members": "off",

  // See: https://eslint.org/docs/rules/no-duplicate-imports
  "no-duplicate-imports": "error",

  // See: https://eslint.org/docs/rules/no-restricted-imports
  "no-restricted-imports": "off",

  // See: https://eslint.org/docs/rules/no-this-before-super
  "no-this-before-super": "error",

  // See: https://eslint.org/docs/rules/no-useless-computed-key
  "no-useless-computed-key": "error",

  // See: https://eslint.org/docs/rules/no-useless-constructor
  "no-useless-constructor": "error",

  // See: https://eslint.org/docs/rules/no-useless-rename
  "no-useless-rename": "error",

  // See: https://eslint.org/docs/rules/no-var
  "no-var": "error",

  // See: https://eslint.org/docs/rules/object-shorthand
  "object-shorthand": "error",

  // See: https://eslint.org/docs/rules/prefer-arrow-callback
  "prefer-arrow-callback": "off",

  // See: https://eslint.org/docs/rules/prefer-const
  "prefer-const": "error",

  // See: https://eslint.org/docs/rules/prefer-destructuring
  "prefer-destructuring": "off",

  // See: https://eslint.org/docs/rules/prefer-numeric-literals
  "prefer-numeric-literals": "error",

  // See: https://eslint.org/docs/rules/prefer-rest-params
  "prefer-rest-params": "error",

  // See: https://eslint.org/docs/rules/prefer-spread
  "prefer-spread": "error",

  // See: https://eslint.org/docs/rules/prefer-template
  "prefer-template": "off",

  // See: https://eslint.org/docs/rules/require-yield
  "require-yield": "error",

  // See: https://eslint.style/rules/js/rest-spread-spacing
  "@stylistic/rest-spread-spacing": ["error", "never"],

  // See: https://eslint.org/docs/rules/sort-imports
  "sort-imports": "off",

  // See: https://eslint.org/docs/rules/symbol-description
  "symbol-description": "error",

  // See: https://eslint.style/rules/js/rtemplate-curly-spacing
  "@stylistic/template-curly-spacing": "error",

  // See: https://eslint.style/rules/js/ryield-star-spacing
  "@stylistic/yield-star-spacing": ["error", { before: false, after: true }]
};

export default rules;
