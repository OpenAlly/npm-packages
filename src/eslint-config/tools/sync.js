// Import Third-party Dependencies
const { request } = require("@myunisoft/httpie");
const { JSDOM } = require("jsdom");

// Import Internal Dependencies
const { rules: possibleErrors } = require("../src/possible-errors.js");
const { rules: bestPractices } = require("../src/best-practices.js");
const ecmascript6Rules = require("../src/ecmascript6.js");
const { rules: styles } = require("../src/styles.js");
const { rules: variables } = require("../src/variables.js");
const { rules: eslintv9 } = require("../src/eslintv9.js");
const { rules: ecmascript6 } = ecmascript6Rules;

// CONSTANTS
const kEslintRulesReferenceUrl = "https://eslint.org/docs/latest/rules/";
const kLocalRules = new Set([
  ...Object.keys(possibleErrors),
  ...Object.keys(bestPractices),
  ...Object.keys(ecmascript6),
  ...Object.keys(styles),
  ...Object.keys(variables),
  ...Object.keys(eslintv9)
]);

async function main() {
  const result = await request("GET", kEslintRulesReferenceUrl);
  const dom = new JSDOM(result.data);
  const rules = new Set([...parseESLintRulesReferences(dom)]);

  for (const rule of rules) {
    if (kLocalRules.has(rule.ruleName) && rule.isDeprecated) {
      console.error(`Rule "${rule.ruleName}" is deprecated! (https://eslint.org/docs/latest/rules/${rule.ruleName})`);
    }
    else if (kLocalRules.has(rule.ruleName) && rule.isRemoved) {
      console.error(`Rule "${rule.ruleName}" is removed! (https://eslint.org/docs/latest/rules/${rule.ruleName})`);
    }
    else if (!kLocalRules.has(rule.ruleName) && !rule.isDeprecated && !rule.isRemoved) {
      const label = kEslintRulesReferenceUrl + rule.ruleName;
      console.error(`Rule "${rule.ruleName}" is not present in the local ESLint configuration!(${label})`);
    }
  }
}

function* parseESLintRulesReferences(dom) {
  const rules = [...dom.window.document.querySelectorAll("article.rule")];
  for (const rule of rules) {
    const isDeprecated = rule.classList.contains("rule--deprecated");
    const isRemoved = rule.classList.contains("rule--removed");
    const ruleName = rule.textContent.replaceAll(/\n/g, " ").trimStart().split(" ")[0];

    yield {
      ruleName,
      isDeprecated,
      isRemoved
    };
  }
}

main().catch(console.error);
