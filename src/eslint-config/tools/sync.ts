// Import Third-party Dependencies
import { request } from "@myunisoft/httpie";
import { JSDOM } from "jsdom";

// Import Internal Dependencies
import possibleErrors from "../src/rules/possible-errors.js";
import bestPractices from "../src/rules/best-practices.js";
import ecmascript6 from "../src/rules/ecmascript6.js";
import styles from "../src/rules/styles.js";
import variables from "../src/rules/variables.js";
import eslintv9 from "../src/rules/eslintv9.js";
import typescript from "../src/rules/typescript.js";
import stylistic from "../src/rules/stylistic.js";

// CONSTANTS
const kEslintRulesReferenceUrl = "https://eslint.org/docs/latest/rules/";
const kStylisticRulesUrl = "https://eslint.style/rules";
const kLocalRules = new Set([
  ...Object.keys(possibleErrors),
  ...Object.keys(bestPractices),
  ...Object.keys(ecmascript6),
  ...Object.keys(styles),
  ...Object.keys(variables),
  ...Object.keys(eslintv9),
  ...Object.keys(typescript),
  ...Object.keys(stylistic)
]);

async function main() {
  try {
    const eslintResult = await request("GET", kEslintRulesReferenceUrl);
    const eslintDom = new JSDOM(eslintResult.data as string);
    const stylisticResult = await request("GET", kStylisticRulesUrl);
    const stylisticDom = new JSDOM(stylisticResult.data as string);
    const rules = new Set([
      ...parseESLintRulesReferences(eslintDom),
      ...parseStylisticRules(stylisticDom)
    ]);

    for (const rule of rules) {
      if (kLocalRules.has(rule.ruleName) && rule.isDeprecated) {
        console.error(
          `Rule "${rule.ruleName}" is deprecated! (https://eslint.org/docs/latest/rules/${rule.ruleName})`
        );
      }
      else if (kLocalRules.has(rule.ruleName) && rule.isRemoved) {
        console.error(
          `Rule "${rule.ruleName}" is removed! (https://eslint.org/docs/latest/rules/${rule.ruleName})`
        );
      }
      else if (
        !kLocalRules.has(rule.ruleName) &&
        !kLocalRules.has(`@stylistic/${rule.ruleName}`) &&
        !rule.isDeprecated &&
        !rule.isRemoved
      ) {
        const label = kEslintRulesReferenceUrl + rule.ruleName;
        console.error(
          `Rule "${rule.ruleName}" is not present in the local ESLint configuration!(${label})`
        );
      }
    }
  }
  catch (error) {
    console.error(error);
  }
  console.log("Done!");
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

function* parseStylisticRules(dom) {
  const rules = [...dom.window.document.querySelectorAll("td a code")];
  for (const rule of rules) {
    const isDeprecated = false;
    const isRemoved = false;
    const ruleName = rule.textContent.replaceAll(/\n/g, " ").trimStart().split(" ")[0];

    yield {
      ruleName,
      isDeprecated,
      isRemoved
    };
  }
}

main();
