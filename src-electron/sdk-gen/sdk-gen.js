/**
 *
 *    Copyright (c) 2020 Silicon Labs
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import * as QueryZcl from '../db/query-zcl'
import path from 'path'

function cleanse(name) {
  var ret = name.replace('-', '_')
  var ret = ret.replace(' ', '_')
  var ret = ret.toLowerCase()
  return ret
}

function generateSingleDeviceType(ctx, deviceType) {
  var fileName = path.join(
    ctx.generationDir,
    'device_type_' + cleanse(deviceType.label) + '.slcc'
  )
  console.log(`   - ${fileName}`)
  return Promise.resolve(1)
}

function generateSingleCluster(ctx, cluster) {
  var fileName = path.join(
    ctx.generationDir,
    'cluster_def_' + cleanse(cluster.label) + '.slcc'
  )
  console.log(`   - ${fileName}`)
  return Promise.resolve(1)
}

function generateSingleClusterImplementation(ctx, cluster) {
  var fileName = path.join(
    ctx.generationDir,
    'cluster_imp_' + cleanse(cluster.label) + '.slcc'
  )
  console.log(`   - ${fileName}`)
  return Promise.resolve(1)
}

function generateDeviceTypes(ctx) {
  return QueryZcl.selectAllDeviceTypes(ctx.db).then((deviceTypeArray) => {
    var promises = []
    console.log(`Generating ${deviceTypeArray.length} device types`)
    deviceTypeArray.forEach((element) => {
      promises.push(generateSingleDeviceType(ctx, element))
    })
    return Promise.all(promises)
  })
}

function generateClusters(ctx) {
  return QueryZcl.selectAllClusters(ctx.db).then((clustersArray) => {
    var promises = []
    console.log(`Generating ${clustersArray.length} clusters`)
    clustersArray.forEach((element) => {
      promises.push(generateSingleCluster(ctx, element))
      promises.push(generateSingleClusterImplementation(ctx, element))
    })
    return Promise.all(promises)
  })
}

/**
 * Using SDK generation templates it returns a promise of created files.
 *
 * @param {*} ctx Contains generationDir, templateDir, db and options dontWrite which can prevent final writing.
 */
export function runSdkGeneration(ctx) {
  console.log(
    `Generating SDK artifacts into ${ctx.generationDir}, using templates from ${ctx.templateDir}`
  )
  var promises = []

  promises.push(generateDeviceTypes(ctx))
  promises.push(generateClusters(ctx))

  return Promise.all(promises)
}
