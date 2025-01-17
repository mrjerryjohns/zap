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

/**
 * This module provides queries for ZCL loading
 *
 * @module DB API: zcl loading queries
 */
const env = require('../util/env')
const dbApi = require('./db-api.js')
const dbEnum = require('../../src-shared/db-enum.js')

// Some loading queries that are reused few times.

const INSERT_CLUSTER_QUERY = `
INSERT INTO CLUSTER (
  PACKAGE_REF,
  CODE,
  MANUFACTURER_CODE,
  NAME,
  DESCRIPTION,
  DEFINE,
  DOMAIN_NAME,
  IS_SINGLETON,
  REVISION,
  INTRODUCED_IN_REF,
  REMOVED_IN_REF
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?,
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?),
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?)
)
`

const INSERT_EVENT_QUERY = `
INSERT INTO EVENT (
  CLUSTER_REF,
  PACKAGE_REF,
  CODE,
  MANUFACTURER_CODE,
  NAME,
  DESCRIPTION,
  SIDE,
  IS_OPTIONAL,
  PRIORITY,
  INTRODUCED_IN_REF,
  REMOVED_IN_REF
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?,
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?),
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?)
)
`
const INSERT_EVENT_FIELD_QUERY = `
INSERT INTO EVENT_FIELD (
  EVENT_REF,
  FIELD_IDENTIFIER,
  NAME,
  TYPE,
  INTRODUCED_IN_REF,
  REMOVED_IN_REF
) VALUES (
  ?, ?, ?, ?, 
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?),
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?)
)
`
const INSERT_COMMAND_QUERY = `
INSERT INTO COMMAND (
  CLUSTER_REF,
  PACKAGE_REF,
  CODE,
  NAME,
  DESCRIPTION,
  SOURCE,
  IS_OPTIONAL,
  RESPONSE_NAME,
  MANUFACTURER_CODE,
  INTRODUCED_IN_REF,
  REMOVED_IN_REF
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?,
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?),
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?)
)`

const INSERT_COMMAND_ARG_QUERY = `
INSERT INTO COMMAND_ARG (
  COMMAND_REF,
  NAME,
  TYPE,
  IS_ARRAY,
  PRESENT_IF,
  COUNT_ARG,
  FIELD_IDENTIFIER,
  INTRODUCED_IN_REF,
  REMOVED_IN_REF
) VALUES (
  ?, ?, ?, ?, ?, ?, ?,
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?),
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?)
)`

const INSERT_ATTRIBUTE_QUERY = `
INSERT INTO ATTRIBUTE (
  CLUSTER_REF,
  PACKAGE_REF,
  CODE,
  NAME,
  TYPE,
  SIDE,
  DEFINE,
  MIN,
  MAX,
  MIN_LENGTH,
  MAX_LENGTH,
  REPORT_MIN_INTERVAL,
  REPORT_MAX_INTERVAL,
  REPORTABLE_CHANGE,
  REPORTABLE_CHANGE_LENGTH,
  IS_WRITABLE,
  DEFAULT_VALUE,
  IS_OPTIONAL,
  IS_REPORTABLE,
  IS_SCENE_REQUIRED,
  ARRAY_TYPE,
  MANUFACTURER_CODE,
  INTRODUCED_IN_REF,
  REMOVED_IN_REF
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?),
  (SELECT SPEC_ID FROM SPEC WHERE CODE = ? AND PACKAGE_REF = ?)
)`

function attributeMap(clusterId, packageId, attributes) {
  return attributes.map((attribute) => [
    clusterId,
    packageId,
    attribute.code,
    attribute.name,
    attribute.type,
    attribute.side,
    attribute.define,
    attribute.min,
    attribute.max,
    attribute.minLength,
    attribute.maxLength,
    attribute.reportMinInterval,
    attribute.reportMaxInterval,
    attribute.reportableChange,
    attribute.reportableChangeLength,
    attribute.isWritable,
    attribute.defaultValue,
    dbApi.toDbBool(attribute.isOptional),
    dbApi.toDbBool(attribute.isReportable),
    dbApi.toDbBool(attribute.isSceneRequired),
    attribute.entryType,
    attribute.manufacturerCode,
    attribute.introducedIn,
    packageId,
    attribute.removedIn,
    packageId,
  ])
}

function eventMap(clusterId, packageId, events) {
  return events.map((event) => [
    clusterId,
    packageId,
    event.code,
    event.manufacturerCode,
    event.name,
    event.description,
    event.side,
    dbApi.toDbBool(event.isOptional),
    event.priority,
    event.introducedIn,
    packageId,
    event.removedIn,
    packageId,
  ])
}

function commandMap(clusterId, packageId, commands) {
  return commands.map((command) => [
    clusterId,
    packageId,
    command.code,
    command.name,
    command.description,
    command.source,
    dbApi.toDbBool(command.isOptional),
    command.responseName,
    command.manufacturerCode,
    command.introducedIn,
    packageId,
    command.removedIn,
    packageId,
  ])
}

function fieldMap(eventId, packageId, fields) {
  return fields.map((field) => [
    eventId,
    field.fieldIdentifier,
    field.name,
    field.type,
    field.introducedIn,
    packageId,
    field.removedIn,
    packageId,
  ])
}

function argMap(cmdId, packageId, args) {
  return args.map((arg) => [
    cmdId,
    arg.name,
    arg.type,
    dbApi.toDbBool(arg.isArray),
    arg.presentIf,
    arg.countArg,
    arg.fieldIdentifier,
    arg.introducedIn,
    packageId,
    arg.removedIn,
    packageId,
  ])
}

async function insertAttributes(db, attributesToLoad) {
  if (attributesToLoad == null || attributesToLoad.length == 0) return
  return dbApi.dbMultiInsert(db, INSERT_ATTRIBUTE_QUERY, attributesToLoad)
}

async function insertEvents(db, packageId, eventsToLoad, fieldsForEvents) {
  if (eventsToLoad == null || eventsToLoad.length == 0) return
  let eventIds = await dbApi.dbMultiInsert(db, INSERT_EVENT_QUERY, eventsToLoad)
  let fieldsToLoad = []
  for (let j = 0; j < eventIds.length; j++) {
    let lastEventId = eventIds[j]
    let fields = fieldsForEvents[j]
    if (fields != undefined && fields != null) {
      fieldsToLoad.push(...fieldMap(lastEventId, packageId, fields))
    }
  }
  return dbApi.dbMultiInsert(db, INSERT_EVENT_FIELD_QUERY, fieldsToLoad)
}

async function insertCommands(db, packageId, commandsToLoad, argsForCommands) {
  if (commandsToLoad == null || commandsToLoad.length == 0) return
  let commandIds = await dbApi.dbMultiInsert(
    db,
    INSERT_COMMAND_QUERY,
    commandsToLoad
  )
  let argsToLoad = []
  for (let j = 0; j < commandIds.length; j++) {
    let lastCmdId = commandIds[j]
    let args = argsForCommands[j]
    if (args != undefined && args != null) {
      argsToLoad.push(...argMap(lastCmdId, packageId, args))
    }
  }
  return dbApi.dbMultiInsert(db, INSERT_COMMAND_ARG_QUERY, argsToLoad)
}
/**
 * Inserts globals into the database.
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data
 * @returns Promise of globals insertion.
 */
async function insertGlobals(db, packageId, data) {
  env.logDebug(`Insert globals: ${data.length}`)
  let commandsToLoad = []
  let attributesToLoad = []
  let argsForCommands = []
  let i
  for (i = 0; i < data.length; i++) {
    if ('commands' in data[i]) {
      let commands = data[i].commands
      commandsToLoad.push(...commandMap(null, packageId, commands))
      argsForCommands.push(...commands.map((command) => command.args))
    }
    if ('attributes' in data[i]) {
      let attributes = data[i].attributes
      attributesToLoad.push(...attributeMap(null, packageId, attributes))
    }
  }
  let pCommand = insertCommands(db, packageId, commandsToLoad, argsForCommands)
  let pAttribute = insertAttributes(db, attributesToLoad)
  return Promise.all([pCommand, pAttribute])
}

/**
 *  Inserts cluster extensions into the database.
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data
 * @returns Promise of cluster extension insertion.
 */
async function insertClusterExtensions(db, dataPackageId, knownPackages, data) {
  return dbApi
    .dbMultiSelect(
      db,
      `SELECT CLUSTER_ID FROM CLUSTER WHERE PACKAGE_REF IN (${knownPackages.toString()}) AND CODE = ?`,
      data.map((cluster) => [cluster.code])
    )
    .then((rows) => {
      let commandsToLoad = []
      let attributesToLoad = []
      let argsForCommands = []
      let i, lastId
      for (i = 0; i < rows.length; i++) {
        let row = rows[i]
        if (row != null) {
          lastId = row.CLUSTER_ID
          if ('commands' in data[i]) {
            let commands = data[i].commands
            commandsToLoad.push(...commandMap(lastId, dataPackageId, commands))
            argsForCommands.push(...commands.map((command) => command.args))
          }
          if ('attributes' in data[i]) {
            let attributes = data[i].attributes
            attributesToLoad.push(
              ...attributeMap(lastId, dataPackageId, attributes)
            )
          }
        } else {
          // DANGER: We got here, but we don't have rows. Why not?
          // Because clusters at this point have not yet been created? Odd.
          env.logWarning(
            `Attempting to insert cluster extension, but the cluster was not found: ${data[i].code}`
          )
        }
      }
      let pCommand = insertCommands(
        db,
        dataPackageId,
        commandsToLoad,
        argsForCommands
      )
      let pAttribute = insertAttributes(db, attributesToLoad)
      return Promise.all([pCommand, pAttribute])
    })
}

/**
 * Inserts clusters into the database.
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data an array of objects that must contain: code, name, description, define. It also contains commands: and attributes:
 * @returns Promise of cluster insertion.
 */
async function insertClusters(db, packageId, data) {
  // If data is extension, we only have code there and we need to simply add commands and clusters.
  // But if it's not an extension, we need to insert the cluster and then run with
  return dbApi
    .dbMultiInsert(
      db,
      INSERT_CLUSTER_QUERY,
      data.map((cluster) => {
        return [
          packageId,
          cluster.code,
          cluster.manufacturerCode,
          cluster.name,
          cluster.description,
          cluster.define,
          cluster.domain,
          cluster.isSingleton,
          cluster.revision,
          cluster.introducedIn,
          packageId,
          cluster.removedIn,
          packageId,
        ]
      })
    )
    .then((lastIdsArray) => {
      let commandsToLoad = []
      let eventsToLoad = []
      let attributesToLoad = []
      let argsForCommands = []
      let fieldsForEvents = []
      let pTags = null

      let i
      for (i = 0; i < lastIdsArray.length; i++) {
        let lastId = lastIdsArray[i]
        if ('commands' in data[i]) {
          let commands = data[i].commands
          commandsToLoad.push(...commandMap(lastId, packageId, commands))
          argsForCommands.push(...commands.map((command) => command.args))
        }
        if ('attributes' in data[i]) {
          let attributes = data[i].attributes
          attributesToLoad.push(...attributeMap(lastId, packageId, attributes))
        }
        if ('events' in data[i]) {
          let events = data[i].events
          eventsToLoad.push(...eventMap(lastId, packageId, events))
          fieldsForEvents.push(...events.map((event) => event.fields))
        }
        if ('tags' in data[i]) {
          pTags = insertTags(db, packageId, data[i].tags, lastId)
        }
      }
      let pCommand = insertCommands(
        db,
        packageId,
        commandsToLoad,
        argsForCommands
      )
      let pAttribute = insertAttributes(db, attributesToLoad)
      let pEvent = insertEvents(db, packageId, eventsToLoad, fieldsForEvents)
      let pArray = [pCommand, pAttribute, pEvent]
      if (pTags != null) pArray.push(pTags)
      return Promise.all(pArray)
    })
}

/**
 * Inserts tags into the database.
 * data is an array of objects, containing 'name' and 'description'
 * @param {*} db
 * @param {*} packageId
 * @param {*} data
 * @returns A promise that resolves with array of rowids.
 */
async function insertTags(db, packageId, data, clusterRef) {
  return dbApi.dbMultiInsert(
    db,
    'INSERT INTO TAG (PACKAGE_REF, CLUSTER_REF, NAME, DESCRIPTION) VALUES (?, ?, ?, ?)',
    data.map((tag) => [packageId, clusterRef, tag.name, tag.description])
  )
}

/**
 *
 * Inserts domains into the database.
 * data is an array of objects that must contain: name
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data Data containing name and specRef
 * @returns A promise that resolves with an array of rowids of all inserted domains.
 */
async function insertDomains(db, packageId, data) {
  return dbApi.dbMultiInsert(
    db,
    'INSERT OR IGNORE INTO DOMAIN (PACKAGE_REF, NAME, LATEST_SPEC_REF) VALUES (?, ?, (SELECT SPEC_ID FROM SPEC WHERE PACKAGE_REF = ? AND CODE = ? ))',
    data.map((domain) => [packageId, domain.name, packageId, domain.specCode])
  )
}

/**
 * Inserts a spec into the database.
 *
 * @param {*} db
 * @param {*} packageId
 * @param {*} data Data contining specCode and specDescription.
 * @returns Promise of insertion.
 */
async function insertSpecs(db, packageId, data) {
  let olders = []
  data.forEach((domain) => {
    if ('older' in domain) {
      domain.older.forEach((older) => olders.push(older))
    }
  })
  if (olders.length > 0) {
    await dbApi.dbMultiInsert(
      db,
      'INSERT OR IGNORE INTO SPEC (PACKAGE_REF, CODE, DESCRIPTION, CERTIFIABLE) VALUES (?, ?, ?, ?)',
      olders.map((older) => [
        packageId,
        older.specCode,
        older.specDescription,
        older.specCertifiable ? 1 : 0,
      ])
    )
  }
  return dbApi.dbMultiInsert(
    db,
    'INSERT OR IGNORE INTO SPEC (PACKAGE_REF, CODE, DESCRIPTION, CERTIFIABLE) VALUES (?, ?, ?, ?)',
    data.map((domain) => [
      packageId,
      domain.specCode,
      domain.specDescription,
      domain.specCertifiable ? 1 : 0,
    ])
  )
}

/**
 * Inserts global attribute defaults into the database.
 *
 * @param {*} db
 * @param {*} packageId
 * @param {*} clusterData array of objects that contain: code, manufacturerCode and subarrays of globalAttribute[] which contain: side, code, value
 * @returns Promise of data insertion.
 */
async function insertGlobalAttributeDefault(db, packageId, clusterData) {
  let individualClusterPromise = []
  clusterData.forEach((cluster) => {
    let args = []
    cluster.globalAttribute.forEach((ga) => {
      args.push([
        packageId,
        cluster.code,
        packageId,
        ga.code,
        ga.side,
        ga.value,
      ])
    })
    let p = dbApi
      .dbMultiInsert(
        db,
        `
    INSERT OR IGNORE INTO GLOBAL_ATTRIBUTE_DEFAULT (
      CLUSTER_REF, ATTRIBUTE_REF, DEFAULT_VALUE
    ) VALUES (
      ( SELECT CLUSTER_ID FROM CLUSTER WHERE PACKAGE_REF = ? AND CODE = ? ),
      ( SELECT ATTRIBUTE_ID FROM ATTRIBUTE WHERE PACKAGE_REF = ? AND CODE = ? AND SIDE = ? ),
      ?)
      `,
        args
      )
      .then((individualGaIds) => {
        let featureBitArgs = []
        for (let i = 0; i < individualGaIds.length; i++) {
          let id = individualGaIds[i]
          let ga = cluster.globalAttribute[i]
          if (id != null && 'featureBit' in ga) {
            ga.featureBit.forEach((fb) => {
              featureBitArgs.push([
                id,
                fb.bit,
                dbApi.toDbBool(fb.value),
                packageId,
                fb.tag,
              ])
            })
          }
        }
        if (featureBitArgs.length == 0) {
          return
        } else {
          return dbApi.dbMultiInsert(
            db,
            `
INSERT OR IGNORE INTO GLOBAL_ATTRIBUTE_BIT (
  GLOBAL_ATTRIBUTE_DEFAULT_REF,
  BIT,
  VALUE,
  TAG_REF
) VALUES (
  ?,
  ?,
  ?,
  (SELECT TAG_ID FROM TAG WHERE PACKAGE_REF = ? AND NAME = ?)
)
        `,
            featureBitArgs
          )
        }
      })
    individualClusterPromise.push(p)
  })
  return Promise.all(individualClusterPromise)
}

/**
 *
 * Inserts structs into the database.
 * data is an array of objects that must contain: name
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data
 * @returns A promise that resolves with an array of struct item rowids.
 */
async function insertStructs(db, packageId, data) {
  const lastIdsArray = await dbApi.dbMultiInsert(
    db,
    'INSERT INTO STRUCT (PACKAGE_REF, NAME) VALUES (?, ?)',
    data.map((struct) => {
      return [packageId, struct.name]
    })
  )

  let clustersToLoad = []
  for (let i = 0; i < lastIdsArray.length; i++) {
    if ('clusters' in data[i]) {
      let lastId = lastIdsArray[i]
      let clusters = data[i].clusters
      clustersToLoad.push(...clusters.map((cl) => [lastId, cl]))
    }
  }
  if (clustersToLoad.length > 0)
    await dbApi.dbMultiInsert(
      db,
      `INSERT INTO STRUCT_CLUSTER ( STRUCT_REF, CLUSTER_CODE) VALUES (?,?)`,
      clustersToLoad
    )

  let itemsToLoad = []
  for (let i = 0; i < lastIdsArray.length; i++) {
    if ('items' in data[i]) {
      let lastId = lastIdsArray[i]
      let items = data[i].items
      itemsToLoad.push(
        ...items.map((item) => [
          lastId,
          item.name,
          item.type,
          item.fieldIdentifier,
          item.isArray,
          item.isEnum,
          item.minLength,
          item.maxLength,
          item.isWritable,
        ])
      )
    }
  }

  if (itemsToLoad.length > 0)
    await dbApi.dbMultiInsert(
      db,
      'INSERT INTO STRUCT_ITEM (STRUCT_REF, NAME, TYPE, FIELD_IDENTIFIER, IS_ARRAY, IS_ENUM, MIN_LENGTH, MAX_LENGTH, IS_WRITABLE) VALUES (?,?,?,?,?,?,?,?,?)',
      itemsToLoad
    )
}

/**
 * Inserts enums into the database.
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data an array of objects that must contain: name, type
 * @returns A promise of enum insertion.
 */
async function insertEnums(db, packageId, data) {
  const lastIdsArray = await dbApi.dbMultiInsert(
    db,
    'INSERT INTO ENUM (PACKAGE_REF, NAME, TYPE) VALUES (?, ?, ?)',
    data.map((en) => {
      return [packageId, en.name, en.type]
    })
  )

  let clustersToLoad = []
  for (let i = 0; i < lastIdsArray.length; i++) {
    if ('clusters' in data[i]) {
      let lastId = lastIdsArray[i]
      let clusters = data[i].clusters
      clustersToLoad.push(...clusters.map((cl) => [lastId, cl]))
    }
  }
  if (clustersToLoad.length > 0)
    await dbApi.dbMultiInsert(
      db,
      `INSERT INTO ENUM_CLUSTER ( ENUM_REF, CLUSTER_CODE) VALUES (?,?)`,
      clustersToLoad
    )

  let itemsToLoad = []
  for (let i = 0; i < lastIdsArray.length; i++) {
    if ('items' in data[i]) {
      let lastId = lastIdsArray[i]
      let items = data[i].items
      itemsToLoad.push(
        ...items.map((item) => [
          lastId,
          item.name,
          item.value,
          item.fieldIdentifier,
        ])
      )
    }
  }
  return dbApi.dbMultiInsert(
    db,
    'INSERT INTO ENUM_ITEM (ENUM_REF, NAME, VALUE, FIELD_IDENTIFIER) VALUES (?, ?, ?, ?)',
    itemsToLoad
  )
}

/**
 * Inserts bitmaps into the database. Data is an array of objects that must contain: name, type
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data Array of object containing 'name' and 'type'.
 * @returns A promise of bitmap insertions.
 */
async function insertBitmaps(db, packageId, data) {
  const lastIdsArray = await dbApi.dbMultiInsert(
    db,
    'INSERT INTO BITMAP (PACKAGE_REF, NAME, TYPE) VALUES (?, ?, ?)',
    data.map((bm) => [packageId, bm.name, bm.type])
  )

  let clustersToLoad = []
  for (let i = 0; i < lastIdsArray.length; i++) {
    if ('clusters' in data[i]) {
      let lastId = lastIdsArray[i]
      let clusters = data[i].clusters
      clustersToLoad.push(...clusters.map((cl) => [lastId, cl]))
    }
  }

  if (clustersToLoad.length > 0) {
    await dbApi.dbMultiInsert(
      db,
      `INSERT INTO BITMAP_CLUSTER ( BITMAP_REF, CLUSTER_CODE) VALUES (?,?)`,
      clustersToLoad
    )
  }

  let fieldsToLoad = []
  for (let i = 0; i < lastIdsArray.length; i++) {
    if ('fields' in data[i]) {
      let lastId = lastIdsArray[i]
      let fields = data[i].fields
      fieldsToLoad.push(
        ...fields.map((field) => [
          lastId,
          field.name,
          field.mask,
          field.type,
          field.fieldIdentifier,
        ])
      )
    }
  }
  return dbApi.dbMultiInsert(
    db,
    'INSERT INTO BITMAP_FIELD (BITMAP_REF, NAME, MASK, TYPE, FIELD_IDENTIFIER) VALUES (?, ?, ?, ?, ?)',
    fieldsToLoad
  )
}

/**
 * Insert atomics into the database.
 * Data is an array of objects that must contains: name, id, description.
 * Object might also contain 'size', but possibly not.
 *
 * @param {*} db
 * @param {*} packageId
 * @param {*} data
 */
async function insertAtomics(db, packageId, data) {
  return dbApi.dbMultiInsert(
    db,
    'INSERT INTO ATOMIC (PACKAGE_REF, NAME, DESCRIPTION, ATOMIC_IDENTIFIER, ATOMIC_SIZE, IS_DISCRETE, IS_SIGNED, IS_STRING, IS_LONG, IS_CHAR) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    data.map((at) => [
      packageId,
      at.name,
      at.description,
      at.id,
      at.size,
      at.isDiscrete,
      at.isSigned,
      at.isString,
      at.isLong,
      at.isChar,
    ])
  )
}

/**
 * Inserts device types into the database.
 *
 * @export
 * @param {*} db
 * @param {*} packageId
 * @param {*} data an array of objects that must contain: domain, code, profileId, name, description
 * @returns Promise of an insertion of device types.
 */
async function insertDeviceTypes(db, packageId, data) {
  return dbApi
    .dbMultiInsert(
      db,
      'INSERT INTO DEVICE_TYPE (PACKAGE_REF, DOMAIN, CODE, PROFILE_ID, NAME, DESCRIPTION) VALUES (?, ?, ?, ?, ?, ?)',
      data.map((dt) => {
        return [
          packageId,
          dt.domain,
          dt.code,
          dt.profileId,
          dt.name,
          dt.description,
        ]
      })
    )
    .then((lastIdsArray) => {
      let zclIdsPromises = []
      for (let i = 0; i < lastIdsArray.length; i++) {
        if ('clusters' in data[i]) {
          let lastId = lastIdsArray[i]
          let clusters = data[i].clusters
          // This is an array that links the generated deviceTyepRef to the cluster via generating an array of arrays,
          zclIdsPromises = Promise.all(
            clusters.map((cluster) =>
              dbApi
                .dbInsert(
                  db,
                  'INSERT INTO DEVICE_TYPE_CLUSTER (DEVICE_TYPE_REF, CLUSTER_NAME, INCLUDE_CLIENT, INCLUDE_SERVER, LOCK_CLIENT, LOCK_SERVER) VALUES (?,?,?,?,?,?)',
                  [
                    lastId,
                    cluster.clusterName,
                    cluster.client,
                    cluster.server,
                    cluster.clientLocked,
                    cluster.serverLocked,
                  ],
                  true
                )
                .then((deviceTypeClusterRef) => {
                  return {
                    dtClusterRef: deviceTypeClusterRef,
                    clusterData: cluster,
                  }
                })
            )
          ).then((dtClusterRefDataPairs) => {
            let promises = []
            promises.push(insertDeviceTypeAttributes(db, dtClusterRefDataPairs))
            promises.push(insertDeviceTypeCommands(db, dtClusterRefDataPairs))
            return Promise.all(promises)
          })
        }
      }
      return zclIdsPromises
    })
}

/**
 * This handles the loading of device type attribute requirements into the database.
 * There is a need to post-process to attach the actual attribute ref after the fact
 * @param {*} db
 * @param {*} dtClusterRefDataPairs
 */
async function insertDeviceTypeAttributes(db, dtClusterRefDataPairs) {
  let attributes = []
  dtClusterRefDataPairs.map((dtClusterRefDataPair) => {
    let dtClusterRef = dtClusterRefDataPair.dtClusterRef
    let clusterData = dtClusterRefDataPair.clusterData
    if ('requiredAttributes' in clusterData) {
      clusterData.requiredAttributes.forEach((attributeName) => {
        attributes.push([dtClusterRef, attributeName])
      })
    }
  })
  return dbApi.dbMultiInsert(
    db,
    'INSERT INTO DEVICE_TYPE_ATTRIBUTE (DEVICE_TYPE_CLUSTER_REF, ATTRIBUTE_NAME) VALUES (?, ?)',
    attributes
  )
}

/**
 * This handles the loading of device type command requirements into the database.
 * There is a need to post-process to attach the actual command ref after the fact
 * @param {*} db
 * @param {*} dtClusterRefDataPairs
 */
async function insertDeviceTypeCommands(db, dtClusterRefDataPairs) {
  let commands = []
  dtClusterRefDataPairs.map((dtClusterRefDataPair) => {
    let dtClusterRef = dtClusterRefDataPair.dtClusterRef
    let clusterData = dtClusterRefDataPair.clusterData
    if ('requiredCommands' in clusterData) {
      clusterData.requiredCommands.forEach((commandName) => {
        commands.push([dtClusterRef, commandName])
      })
    }
  })
  return dbApi.dbMultiInsert(
    db,
    'INSERT INTO DEVICE_TYPE_COMMAND (DEVICE_TYPE_CLUSTER_REF, COMMAND_NAME) VALUES (?, ?)',
    commands
  )
}

async function updateEnumClusterReferences(db, packageId) {
  return dbApi.dbUpdate(
    db,
    `
UPDATE
  ENUM_CLUSTER
SET
  CLUSTER_REF =
  (
    SELECT
      CLUSTER_ID
    FROM
      CLUSTER
    WHERE
      CLUSTER.CODE = ENUM_CLUSTER.CLUSTER_CODE
    AND
      CLUSTER.PACKAGE_REF = ?
  )
  
`,
    [packageId]
  )
}

async function updateStructClusterReferences(db, packageId) {
  return dbApi.dbUpdate(
    db,
    `
UPDATE
  STRUCT_CLUSTER
SET
  CLUSTER_REF =
  (
    SELECT
      CLUSTER_ID
    FROM
      CLUSTER
    WHERE
      CLUSTER.CODE = STRUCT_CLUSTER.CLUSTER_CODE
    AND
      CLUSTER.PACKAGE_REF = ?
  )
  
`,
    [packageId]
  )
}

async function updateBitmapClusterReferences(db, packageId) {
  return dbApi.dbUpdate(
    db,
    `
UPDATE
  BITMAP_CLUSTER
SET
  CLUSTER_REF =
  (
    SELECT
      CLUSTER_ID
    FROM
      CLUSTER
    WHERE
      CLUSTER.CODE = BITMAP_CLUSTER.CLUSTER_CODE
    AND
      CLUSTER.PACKAGE_REF = ?
  )
  
`,
    [packageId]
  )
}

exports.insertGlobals = insertGlobals
exports.insertClusterExtensions = insertClusterExtensions
exports.insertClusters = insertClusters
exports.insertDomains = insertDomains
exports.insertSpecs = insertSpecs
exports.insertGlobalAttributeDefault = insertGlobalAttributeDefault
exports.insertAtomics = insertAtomics
exports.insertStructs = insertStructs
exports.insertEnums = insertEnums
exports.insertBitmaps = insertBitmaps
exports.insertDeviceTypes = insertDeviceTypes
exports.insertTags = insertTags
exports.updateEnumClusterReferences = updateEnumClusterReferences
exports.updateStructClusterReferences = updateStructClusterReferences
exports.updateBitmapClusterReferences = updateBitmapClusterReferences
