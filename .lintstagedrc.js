const path = require("path");

const buildNextEslintCommand = filenames => {
  const lintableFiles = filenames.filter(f => path.basename(f) !== "next-env.d.ts");

  if (lintableFiles.length === 0) {
    return "true";
  }

  return `yarn next:lint --fix --file ${lintableFiles
    .map(f => path.relative(path.join("packages", "nextjs"), f))
    .join(" --file ")}`;
};

const checkTypesNextCommand = () => "yarn next:check-types";

const buildHardhatEslintCommand = (filenames) =>
  `yarn hardhat:lint-staged --fix ${filenames
    .map((f) => path.relative(path.join("packages", "hardhat"), f))
    .join(" ")}`;

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
  "packages/hardhat/**/*.{ts,tsx}": [buildHardhatEslintCommand],
};
