const addChannelNpm = require('@semantic-release/npm/lib/add-channel')
const getPkg = require('@semantic-release/npm/lib/get-pkg')
const prepareNpm = require('@semantic-release/npm/lib/prepare')
const publishNpm = require('@semantic-release/npm/lib/publish')
const setLegacyToken = require('@semantic-release/npm/lib/set-legacy-token')
const verifyNpmAuth = require('@semantic-release/npm/lib/verify-auth')
const verifyNpmConfig = require('@semantic-release/npm/lib/verify-config')
const AggregateError = require('aggregate-error')
const { defaultTo, castArray } = require('lodash')
const tempy = require('tempy')

let verified
const npmrc = tempy.file({ name: '.npmrc' })

async function verifyConditions (pluginConfig, context) {
  // If the npm publish plugin is used and has `npmPublish`, `tarballDir` or `pkgRoot` configured, validate them now in order to prevent any release if the configuration is wrong
  if (context.options.publish) {
    const publishPlugin = castArray(context.options.publish).find((config) => config.path && config.path === '@semantic-release/npm') || {}

    pluginConfig.npmPublish = defaultTo(pluginConfig.npmPublish, publishPlugin.npmPublish)
    pluginConfig.tarballDir = defaultTo(pluginConfig.tarballDir, publishPlugin.tarballDir)
    pluginConfig.pkgRoot = defaultTo(pluginConfig.pkgRoot, publishPlugin.pkgRoot)
  }

  const errors = verifyNpmConfig(pluginConfig)

  setLegacyToken(context)

  try {
    const pkg = await getPkg(pluginConfig, context)

    // Verify the npm authentication only if `npmPublish` is not false and `pkg.private` is not `true`
    if (pluginConfig.npmPublish !== false && pkg.private !== true) {
      await verifyNpmAuth(npmrc, pkg, context)
    }
  } catch (error) {
    errors.push(...error)
  }

  if (errors.length > 0) {
    throw new AggregateError(errors)
  }

  verified = true
}

async function prepare (pluginConfig, context) {
  const errors = verified ? [] : verifyNpmConfig(pluginConfig)

  setLegacyToken(context)

  try {
    // Reload package.json in case a previous external step updated it
    const pkg = await getPkg(pluginConfig, context)
    if (!verified && pluginConfig.npmPublish !== false && pkg.private !== true) {
      await verifyNpmAuth(npmrc, pkg, context)
    }
  } catch (error) {
    errors.push(...error)
  }

  if (errors.length > 0) {
    throw new AggregateError(errors)
  }

  await prepareNpm(npmrc, pluginConfig, context)
}

async function publish (pluginConfig, context) {
  let pkg
  const errors = verified ? [] : verifyNpmConfig(pluginConfig)

  setLegacyToken(context)

  console.log(process.env.LEGACY_TOKEN)

  try {
    // Reload package.json in case a previous external step updated it
    pkg = await getPkg(pluginConfig, context)
    if (!verified && pluginConfig.npmPublish !== false && pkg.private !== true) {
      await verifyNpmAuth(npmrc, pkg, context)
    }
  } catch (error) {
    errors.push(...error)
  }

  if (errors.length > 0) {
    throw new AggregateError(errors)
  }

  console.log(context, npmrc, pluginConfig)

  await prepareNpm(npmrc, pluginConfig, context)

  return publishNpm(npmrc, pluginConfig, pkg, context)
}

async function addChannel (pluginConfig, context) {
  let pkg
  const errors = verified ? [] : verifyNpmConfig(pluginConfig)

  setLegacyToken(context)

  try {
    // Reload package.json in case a previous external step updated it
    pkg = await getPkg(pluginConfig, context)
    if (!verified && pluginConfig.npmPublish !== false && pkg.private !== true) {
      await verifyNpmAuth(npmrc, pkg, context)
    }
  } catch (error) {
    errors.push(...error)
  }

  if (errors.length > 0) {
    throw new AggregateError(errors)
  }

  return addChannelNpm(npmrc, pluginConfig, pkg, context)
}

module.exports = {
  verifyConditions,
  prepare,
  publish,
  addChannel
}
