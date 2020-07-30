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

const queryZcl = require('../db/query-zcl.js')

function zcl_enums(options) {
  return queryZcl
    .selectAllEnums(this.db)
    .then((ens) => {
      var promises = []
      ens.forEach((element) => {
        var block = options.fn(element)
        promises.push(block)
      })
      return Promise.all(promises)
    })
    .then((blocks) => {
      var ret = ''
      blocks.forEach((b) => {
        ret = ret.concat(b)
      })
      return ret
    })
}

exports.zcl_enums = zcl_enums
