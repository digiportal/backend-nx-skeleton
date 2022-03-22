/* eslint-disable import/no-extraneous-dependencies */
/** @type {import("eslint").Linter } */
module.exports = {
  extends: '../../.eslintrc.js',
  rules: {
    ...require('@digiportal/eslint-config/utils').generateImportGroups({ tsconfigDir: __dirname }),
    'import/exports-last': 'off'
  }
}
