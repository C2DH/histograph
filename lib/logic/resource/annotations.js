const {
  inRange, find, groupBy,
  get, toPairs, cloneDeep,
  set, flatten, range
} = require('lodash')

function rearrangeByStartPosition(entityIdAndContextList) {
  return flatten(entityIdAndContextList
    .map(([uuid, positionPairs]) => positionPairs.map(([start, end]) => [uuid, start, end])))
    .sort(([, startA], [, startB]) => startA > startB)
}

function annotateItem(item, uuidStartEndList, itemOffset) {
  let previousItemEnd = itemOffset
  const itemParts = uuidStartEndList.reduce((parts, [uuid, start, end]) => {
    const updatedParts = parts
      .concat(item.slice(previousItemEnd - itemOffset, start - itemOffset))
      .concat(`[${item.slice(start - itemOffset, end - itemOffset)}](${uuid})`)
    previousItemEnd = end
    return updatedParts
  }, [])
  return itemParts.concat(item.slice(previousItemEnd - itemOffset, item.length)).join('')
}

function annotate(items, entityIdAndContextList, separatorSize = 2) {
  const entityIdAndPositionsList = rearrangeByStartPosition(entityIdAndContextList)

  let offset = 0
  const itemOffsets = items.map((i, itemIndex) => {
    const start = offset
    const end = offset + i.length
    offset += i.length + separatorSize
    return [itemIndex, start, end]
  })
  const entityIdAndPositionsListByItemIndex = groupBy(
    entityIdAndPositionsList,
    ([, start]) => get(
      find(itemOffsets, ([, itemStart, itemEnd]) => inRange(start, itemStart, itemEnd)), 0
    )
  )
  range(items.length).forEach(idx => {
    if (entityIdAndPositionsListByItemIndex[idx] === undefined) {
      entityIdAndPositionsListByItemIndex[idx] = []
    }
  })

  return toPairs(entityIdAndPositionsListByItemIndex)
    .map(([idx, list]) => [parseInt(idx, 10), list])
    .sort(([indexA], [indexB]) => indexA > indexB)
    .map(([itemIndex, uuidStartEndList]) => {
      const item = items[itemIndex]
      const itemOffset = get(find(itemOffsets, ([idx]) => idx === itemIndex), 1)
      return annotateItem(item, uuidStartEndList, itemOffset)
    })
}

/**
 * Convert resource' `content.xx`, `title.xx` and `caption.xx` values from a regular
 * text into Markdown text annotated with links to entities.
 *
 * @param {object} resource resource db object (`db/resource.json` schema)
 * @param {*} entityAndAppearanceList a list of objects { entity, appearance } where
 * `entity` is `db/entity.json` and `appearance` is `db/appears_in.json`.
 */
function addAnnotations(resource, entityAndAppearanceList) {
  const languageAndItems = resource.languages
    .map(languageCode => {
      const annotatableItems = [
        resource.title[languageCode],
        resource.caption[languageCode],
        resource.content[languageCode],
      ]
      const entityIdAndContextList = entityAndAppearanceList
        .map(({
          entity: { uuid },
          appearance: { context }
        }) => [uuid, context[languageCode] || []])

      const annotatedItems = annotate(annotatableItems, entityIdAndContextList)
      return [languageCode, annotatedItems]
    })

  return languageAndItems.reduce((newResource, [languageCode, items]) => {
    set(newResource, `title.${languageCode}`, items[0])
    set(newResource, `caption.${languageCode}`, items[1])
    set(newResource, `content.${languageCode}`, items[2])
    return newResource
  }, cloneDeep(resource))
}

module.exports = { addAnnotations }
