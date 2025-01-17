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
 *
 *
 * @jest-environment node
 */

const path = require('path')
const genEngine = require('../src-electron/generator/generation-engine')
const env = require('../src-electron/util/env')
const dbApi = require('../src-electron/db/db-api')
const zclLoader = require('../src-electron/zcl/zcl-loader')
const importJs = require('../src-electron/importexport/import')
const testUtil = require('./test-util')
const queryPackage = require('../src-electron/db/query-package')
const queryZcl = require('../src-electron/db/query-zcl')

let db
const testFile = path.join(__dirname, 'resource/test-meta.zap')
let sessionId
let templateContext
let zclContext

beforeAll(async () => {
  env.setDevelopmentEnv()
  let file = env.sqliteTestFile('testmeta')
  db = await dbApi.initDatabaseAndLoadSchema(
    file,
    env.schemaFile(),
    env.zapVersion()
  )
}, testUtil.timeout.medium())

afterAll(() => dbApi.closeDatabase(db), testUtil.timeout.short())

test(
  'Meta test - template loading',
  async () => {
    templateContext = await genEngine.loadTemplates(
      db,
      testUtil.testTemplate.meta
    )
    expect(templateContext.crc).not.toBeNull()
    expect(templateContext.templateData).not.toBeNull()
    expect(templateContext.templateData.name).toEqual('Meta test templates')
    expect(templateContext.templateData.version).toEqual('meta-test')
    expect(templateContext.packageId).not.toBeNull()
  },
  testUtil.timeout.medium()
)

test(
  'Meta test - zcl loading',
  async () => {
    zclContext = await zclLoader.loadZcl(db, testUtil.testZclMetafile)

    const structs = await queryZcl.selectAllStructsWithItemCount(
      db,
      zclContext.packageId
    )
    for (const s of structs) {
      let clusters = await queryZcl.selectStructClusters(db, s.id)
      if (s.name == 'SimpleStruct' || s.name == 'StructWithArray') {
        expect(clusters.length).toBe(1)
        expect(clusters[0].code).toBe(0xabcd)
      } else {
        expect(clusters.length).toBe(0)
      }
    }

    const enums = await queryZcl.selectAllEnums(db, zclContext.packageId)
    for (const e of enums) {
      let clusters = await queryZcl.selectEnumClusters(db, e.id)
      if (e.name == 'TestEnum') {
        expect(clusters.length).toBe(1)
        expect(clusters[0].code).toBe(0xabcd)
      } else {
        expect(clusters.length).toBe(0)
      }
    }

    const bitmaps = await queryZcl.selectAllBitmaps(db, zclContext.packageId)
    expect(bitmaps.length).toBe(2)
    for (const b of bitmaps) {
      let clusters = await queryZcl.selectBitmapClusters(db, b.id)
      if (b.name == 'ClusterBitmap') {
        expect(clusters.length).toBe(1)
        expect(clusters[0].code).toBe(0xabcd)
      } else {
        expect(clusters.length).toBe(0)
      }
    }
  },
  testUtil.timeout.medium()
)

test(
  'Meta test - file import',
  async () => {
    let importResult = await importJs.importDataFromFile(db, testFile)
    sessionId = importResult.sessionId
    expect(sessionId).not.toBeNull()
    await queryPackage.insertSessionPackage(db, sessionId, zclContext.packageId)
  },
  testUtil.timeout.medium()
)

test(
  'Meta test - generation',
  async () => {
    let genResult = await genEngine.generate(
      db,
      sessionId,
      templateContext.packageId,
      {},
      {
        disableDeprecationWarnings: true,
      }
    )

    expect(genResult).not.toBeNull()
    expect(genResult.partial).toBeFalsy()
    expect(genResult.content).not.toBeNull()

    let epc = genResult.content['test1.out']
    expect(epc).not.toBeNull()
    expect(epc).toContain('Test1 template.')

    epc = genResult.content['out/test1.out']
    expect(epc).not.toBeNull()
    expect(epc).toContain('validating')

    epc = genResult.content['type-by-cluster.h']
    expect(epc).toContain('enum item: c')
    expect(epc).toContain('Bitmap: ClusterBitmap')

    epc = genResult.content['struct.h']
    expect(epc).toContain('Nest complex;// <- has nested array')
    expect(epc).toContain('// DoubleNest <- contains nested array')
  },
  testUtil.timeout.medium()
)
