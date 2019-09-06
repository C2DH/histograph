// name: merge_version_from_service
// DEPRECATED. (unique key constraint: url...)
MERGE (ver:version:annotation { resource: {resource_id}, service: {service}, language:{language} })
  ON CREATE SET
    ver.creation_date = {creation_date},
    ver.creation_time = {creation_time},
    ver.unknowns = {unknowns},
    ver.persons = {persons},
    ver.yaml = {yaml}
  ON MATCH SET
    ver.language = {language},
    ver.unknowns = {unknowns},
    ver.persons = {persons},
    ver.yaml = {yaml}
  RETURN ver
  
// name: merge_relationship_version_resource
// DEPRECATED. link a resource with an entity, it it han't been done yet.
MATCH (ver:version), (res:resource)
  WHERE id(ver)={version_id} AND id(res)={resource_id}
WITH ver, res
  MERGE (ver)-[r:describes]->(res)
RETURN ver, res, r

// name: merge_relationship_resource_version
// merge at the same thie the version object
MATCH (res:resource {uuid: {resource_uuid}})
WITH res
MERGE (ver:version:annotation { resource: id(res), service: {service}, language:{language} })
  ON CREATE SET
    ver.creation_date = toString(datetime()),
    ver.creation_time = timestamp() / 1000,
    ver.yaml = {yaml}
  ON MATCH SET
    ver.language = {language},
    ver.yaml = {yaml}
WITH ver, res
MERGE (ver)-[r:describes]->(res)
  ON CREATE SET
    r.creation_date = toString(datetime()),
    r.creation_time = timestamp() / 1000
  ON MATCH SET
    r.last_modification_date = toString(datetime()),
    r.last_modification_time = timestamp() / 1000
RETURN {
  id: id(ver),
  type: last(labels(ver)),
  props: ver,
  rel: r
} as result

// name: save_or_update
// Parameters:
//  * resource_uuid - UUID of the resource the version is linked to (required)
//  * versions - a list of version payloads
MATCH (res:resource {uuid:{resource_uuid}})
WITH res, toString(datetime()) AS now_date, timestamp() / 1000 AS now_time
UNWIND {versions} AS properties
MERGE (ver:version:annotation { resource: id(res), service: properties.service, language: properties.language })
  ON CREATE SET
    ver += properties,
    ver.creation_date = now_date,
    ver.creation_time = now_time
  ON MATCH SET
    ver += properties
WITH ver, res, now_date, now_time
MERGE (ver)-[r:describes]->(res)
  ON CREATE SET
    r.creation_date = now_date,
    r.creation_time = now_time,
    r.last_modification_date = now_date,
    r.last_modification_time = now_time
  ON MATCH SET
    r.last_modification_date = now_date,
    r.last_modification_time = now_time
RETURN {
  id: id(ver),
  type: last(labels(ver)),
  props: ver,
  rel: r
} as result
