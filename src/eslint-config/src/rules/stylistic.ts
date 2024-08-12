const rules = {
  // https://eslint.style/rules/js/function-call-argument-newline#consistent
  "@stylistic/function-call-argument-newline": ["error", "consistent"],
  // https://eslint.style/rules/js/function-call-spacing#never
  "@stylistic/function-call-spacing": ["error", "never"],
  // https://eslint.style/rules/plus/indent-binary-ops#options
  "@stylistic/indent-binary-ops": ["error", 2],
  // https://eslint.style/rules/js/semi-spacing#options
  "@stylistic/semi-spacing": ["error", { before: false, after: true }],
  // https://eslint.style/rules/plus/type-generic-spacing#options
  "@stylistic/type-generic-spacing": ["error"],
  // https://eslint.style/rules/plus/type-named-tuple-spacing#options
  "@stylistic/type-named-tuple-spacing": ["error"],

  // skip JSX rules
  "@stylistic/jsx-child-element-spacing": "off",
  "@stylistic/jsx-closing-bracket-location": "off",
  "@stylistic/jsx-closing-tag-location": "off",
  "@stylistic/jsx-curly-brace-presence": "off",
  "@stylistic/jsx-curly-newline": "off",
  "@stylistic/jsx-curly-spacing": "off",
  "@stylistic/jsx-equals-spacing": "off",
  "@stylistic/jsx-first-prop-new-line": "off",
  "@stylistic/jsx-function-call-newline": "off",
  "@stylistic/jsx-indent": "off",
  "@stylistic/jsx-indent-props": "off",
  "@stylistic/jsx-max-props-per-line": "off",
  "@stylistic/jsx-newline": "off",
  "@stylistic/jsx-one-expression-per-line": "off",
  "@stylistic/jsx-pascal-case": "off",
  "@stylistic/jsx-props-no-multi-spaces": "off",
  "@stylistic/jsx-self-closing-comp": "off",
  "@stylistic/jsx-sort-props": "off",
  "@stylistic/jsx-tag-spacing": "off",
  "@stylistic/jsx-wrap-multilines": "off"
};
export default rules;
