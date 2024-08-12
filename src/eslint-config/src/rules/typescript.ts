/**
 * See https://eslint.style/packages/ts#rules
 */
const rules = {
  "@stylistic/brace-style": ["error", "stroustrup"],
  "@stylistic/comma-dangle": ["error", "never"],
  "@stylistic/comma-spacing": [
    "error", { before: false, after: true }
  ],
  "@stylistic/func-call-spacing": ["error", "never"],
  "@stylistic/key-spacing": ["error", { beforeColon: false }],
  "@stylistic/keyword-spacing": ["error", { before: true }],
  "@stylistic/lines-around-comment": "off",
  "@stylistic/lines-between-class-members": "off",
  "@stylistic/member-delimiter-style": [
    "error", {
      multiline: {
        delimiter: "semi",
        requireLast: true
      },
      singleline: {
        delimiter: "semi",
        requireLast: true
      },
      multilineDetection: "brackets"
    }
  ],
  "@stylistic/no-extra-parens": "off",
  "@stylistic/no-extra-semi": "error",
  "@stylistic/object-curly-newline": "off",
  "@stylistic/object-curly-spacing": ["error", "always"],
  "@stylistic/object-property-newline": "off",
  "@stylistic/padding-line-between-statements": [
    "error",
    {
      blankLine: "always",
      prev: "*",
      next: "return"
    }
  ],
  "@stylistic/quote-props": ["error", "as-needed"],
  "@stylistic/quotes": [
    "error",
    "double",
    {
      allowTemplateLiterals: true
    }
  ],
  "@stylistic/semi": ["error", "always"],
  "@stylistic/space-before-blocks": "error",
  "@stylistic/space-before-function-paren": ["error", "never"],
  "@stylistic/space-infix-ops": "error",
  "@stylistic/type-annotation-spacing": [
    "error",
    {
      before: false,
      after: true,
      overrides: {
        arrow: { before: true, after: true }
      }
    }
  ]
};
export default rules;
