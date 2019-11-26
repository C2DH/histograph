// name: get_resource_with_details
// get resource with its comments
MATCH (res:resource {uuid: {id}})
WITH res
OPTIONAL MATCH (res)-[appearance:appears_in]-(ent:entity)
WITH res, collect(appearance) as appearances, collect(ent) as entities
OPTIONAL MATCH (res)<-[r_cur:curates]-(u:user {username:{username}})
OPTIONAL MATCH (res)<-[r_lik:likes]-(u:user {username:{username}})
OPTIONAL MATCH (lover:user)-[:likes]->(res)
OPTIONAL MATCH (curator:user)-[:curates]->(res)
OPTIONAL MATCH (com)-[:mentions]->(res)
OPTIONAL MATCH (inq)-[:questions]->(res)
OPTIONAL MATCH (after:resource)-[:comes_after]->(res)
OPTIONAL MATCH (res)-[:comes_after]->(before:resource)

RETURN {
  id: res.uuid,
  resource: res,
  entities_and_appearances: [
    i IN range(0, size(entities) - 1) | {
      entity: entities[i], 
      appearance: appearances[i], 
      type: last(labels(entities[i]))
    }
  ],
  // entities_and_appearances: collect({ 
  //   entity: ent, 
  //   appearance: appearance, 
  //   type: last(labels(ent))
  // }),
  curated_by_user: count(r_cur),
  loved_by_user: count(r_lik)> 0,
  comments: count(distinct com),
  inquiries: count(distinct inq),
  lovers: count(lover),
  curators: count(curator),
  previous_resource_uuid: before.uuid,
  next_resource_uuid: after.uuid 
} AS result


// name: get_resources
// get resources with number of comments, if any
//
// NOTE: if `from_uuid` parameter is provided it assumes that `to_uuid` is provided as well.
{if:ids}
// UUID match
MATCH (r:resource)
WHERE r.uuid in {ids}
WITH collect(id(r)) AS ids
{/if}
{unless:ids}
WITH NULL AS ids
{/unless}

{if:fullTextQuery}
// match full text query
CALL db.index.fulltext.queryNodes({fullTextIndex}, {fullTextQuery})
YIELD node AS res
WHERE ids IS NULL OR id(res) IN ids
WITH DISTINCT collect(id(res)) AS ids
{/if}

{if:with}
// match belonging to resource
MATCH (r:resource)<-[:appears_in]-(ent:entity)
WHERE 
  ent.uuid IN {with} AND 
  (ids IS NULL OR id(r) IN ids)
WITH DISTINCT collect(id(r)) AS ids
{/if}

{if:from_uuid}
// match from/to UUID boundaries
// NOTE: if no path found - skip this constraint
MATCH p = shortestPath((b:resource { uuid: {from_uuid} })<-[:comes_after*]-(a:resource { uuid: {to_uuid} }))
WITH collect(DISTINCT [r IN nodes(p) WHERE (ids IS NULL OR id(r) IN ids) | id(r)]) AS ids
WITH coalesce(ids[0], NULL) as ids
{/if}

MATCH (res:resource)
WHERE 
  (ids IS NULL OR id(res) IN ids)
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time <= {end_time}
{/if}
{if:type}
  AND res.type IN {type}
{/if}
{if:mimetype}
  AND res.mimetype IN {mimetype}
{/if}

{if:topicModellingScoresLowerThreshold}
  AND res.topic_modelling__scores[{topicModellingIndex}] >= {topicModellingScoresLowerThreshold}
{/if}

WITH res

{if:orderby}
ORDER BY {:orderby}
{/if}
{unless:orderby}
ORDER BY res.last_modification_time DESC
{/unless}
SKIP {offset} 
LIMIT {limit}
WITH res
OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location` {status:1})
WITH res, r_loc, loc
ORDER BY r_loc.score DESC, r_loc.tfidf DESC, r_loc.frequency DESC
WITH res,  filter(x in collect({  
      id: loc.uuid,
      type: 'location',
      props: loc,
      rel: r_loc
    }) WHERE exists(x.id))[0..5] as locations   
OPTIONAL MATCH (res)<-[r_per:appears_in]-(per:`person` {status:1})
WITH res, locations, r_per, per
ORDER BY  r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH res, locations,  filter(x in collect({  
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE exists(x.id))[0..5] as persons
OPTIONAL MATCH (res)<-[r_org:appears_in]-(org:`organization` {status:1})
WITH res, locations, persons,  filter(x in collect({    
      id: org.uuid,
      type: 'organization',
      props: org,
      rel: r_org
    }) WHERE exists(x.id))[0..5] as organizations
OPTIONAL MATCH (res)<-[r_soc:appears_in]-(soc:`social_group` {status:1})
WITH res, locations, persons, organizations,  filter(x in collect({  
      id: soc.uuid,
      type: 'social_group',
      props: soc,
      rel: r_soc
    }) WHERE exists(x.id))[0..5] as social_groups
OPTIONAL MATCH (res)<-[r_the:appears_in]-(the:`theme` {status:1})
WITH res, locations, persons, organizations, social_groups, filter(x in collect({    
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE exists(x.id))[0..5] as themes

WITH res, locations, persons, organizations, themes, social_groups
RETURN {
  id: res.uuid,
  type: 'resource',
  props: res,
  persons:     persons,
  themes:     themes,
  organizations: organizations,
  locations:    locations,
  social_groups:   social_groups
} as resource
{if:orderby}
ORDER BY {:orderby}
{/if}
{unless:orderby}
ORDER BY resource.props.start_time ASC
{/unless}


// name: count_resources
// count resources with current filters
{if:ids}
// UUID match
MATCH (r:resource)
WHERE r.uuid in {ids}
WITH collect(id(r)) AS ids
{/if}
{unless:ids}
WITH NULL AS ids
{/unless}

{if:fullTextQuery}
// match full text query
CALL db.index.fulltext.queryNodes({fullTextIndex}, {fullTextQuery})
YIELD node AS res
WHERE ids IS NULL OR id(res) IN ids
WITH DISTINCT collect(id(res)) AS ids
{/if}

{if:with}
// match belonging to resource
MATCH (r:resource)<-[:appears_in]-(ent:entity)
WHERE 
  ent.uuid IN {with} AND 
  (ids IS NULL OR id(r) IN ids)
WITH DISTINCT collect(id(r)) AS ids
{/if}

{if:from_uuid}
// match from/to UUID boundaries
// NOTE: if no path found - skip this constraint
MATCH p = shortestPath((b:resource { uuid: {from_uuid} })<-[:comes_after*]-(a:resource { uuid: {to_uuid} }))
WITH collect(DISTINCT [r IN nodes(p) WHERE (ids IS NULL OR id(r) IN ids) | id(r)]) AS ids
WITH coalesce(ids[0], NULL) as ids
{/if}

MATCH (res:resource)
WHERE 
  (ids IS NULL OR id(res) IN ids)
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time <= {end_time}
{/if}
{if:type}
  AND res.type IN {type}
{/if}

{if:topicModellingScoresLowerThreshold}
  AND res.topic_modelling__scores[{topicModellingIndex}] >= {topicModellingScoresLowerThreshold}
{/if}

WITH collect(res) as resources
WITH resources, length(resources) as total_items
UNWIND resources as res

RETURN {
  group: {if:group}res.{:group}{/if}{unless:group}res.type{/unless}, 
  count_items: count(res),
  total_items: total_items
} // count per type

// name: count_related_resources
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH (res:resource)
  WHERE res.uuid = {id} 
WITH res
MATCH (res)<-[r1:appears_in]-(ent:entity)
WITH res, r1, ent
  ORDER BY r1.tfidf DESC
  LIMIT 9
WITH ent
MATCH (ent)-[:appears_in]->(res2:resource)
{if:with}
  WHERE res2.uuid <> {id}

  WITH res2
  MATCH (res2)<-[:appears_in]-(ent2:entity) 
  WHERE ent2.uuid IN {with}

{/if}
{unless:with}
  WHERE res2.uuid <> {id}
{/unless}

  {if:mimetype}
  AND res2.mimetype IN {mimetype}
  {/if}
  {if:type}
  AND res2.type IN {type}
  {/if}
  {if:start_time}
  AND res2.start_time >= {start_time}
  {/if}
  {if:end_time}
  AND res2.end_time <= {end_time}
  {/if}
WITH res2
RETURN {
  group: {if:group}res2.{:group}{/if}{unless:group}res2.type{/unless}, 
  count_items: count(res2)
} // count per type


// name: get_related_resources
// top 20 entities attached to the person
MATCH (res1:resource {uuid: {id}})<-[r1:appears_in]-(ent:entity)
WITH res1, r1, ent
  ORDER BY r1.score DESC, r1.tfidf DESC
  LIMIT 9
WITH res1, r1, ent
MATCH (ent)-[r2:appears_in]->(res2:resource){if:with}, (res2)<-[:appears_in]-(ent2:entity) WHERE id(ent2) IN {with} AND id(res2) <> {id}{/if}
{unless:with} WHERE res2.uuid <> {id} {/unless}

    {if:mimetype}
    AND res2.mimetype IN {mimetype}
    {/if}
    {if:type}
    AND res2.type IN {type}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time <= {end_time}
    {/if}

WITH res1, res2, count(*) as intersection

// MATCH (res1)<-[rel:appears_in]-(r1:entity)
// WITH res1, res2, intersection, count(rel) as H1

// MATCH (res2)<-[rel:appears_in]-(r1:entity)
// WITH res1,res2, intersection, H1, count(rel) as H2
// WITH res1, res2, intersection, H1+H2 as union
// WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD

// {unless:orderby}
// ORDER BY JACCARD DESC
// SKIP {offset}
// LIMIT {limit}
// {/unless}
{unless:orderby}
 ORDER BY intersection DESC
 SKIP {offset}
 LIMIT {limit}
{/unless}
WITH res1, res2, intersection
OPTIONAL MATCH (res2)<-[r_per:appears_in]-(per:`person`)
WITH res1, res2, intersection, r_per, per
ORDER BY  r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH res1, res2, intersection, filter(x in collect({  
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE exists(x.id))[0..5] as persons

WITH res1, res2, intersection, persons
OPTIONAL MATCH (res2)<-[r_the:appears_in]-(the:`theme`)
WITH res1, res2, intersection, persons, r_the, the
ORDER BY  r_the.score DESC, r_the.tfidf DESC, r_the.frequency DESC
WITH res1, res2, intersection, persons, filter(x in collect({  
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE exists(x.id))[0..5] as themes

RETURN {
  id: res2.uuid,
  props: res2,
  persons: persons,
  themes: themes,
  target: res2.uuid,
  type: LAST(labels(res2)),
  dst : abs(coalesce(res1.start_time, 1000000000) - coalesce(res2.start_time, 0)),
  det : abs(coalesce(res1.end_time, 1000000000) - coalesce(res2.end_time, 0)),
  // weight: JACCARD
  weight : intersection
} as result
{if:orderby}
  ORDER BY {:orderby}
  SKIP {offset}
  LIMIT {limit}
{/if}

// name: add_comment_to_resource
// add a comment to a resource, by user username. At least one #tag should be provided
START res=node({id})
  MATCH (u:user {username:{username}})
  WITH res, u 
    CREATE (com:`comment` {
      creation_date: {creation_date},
      creation_time: {creation_time},
      content: {content},
      tags: {tags}
    })
    CREATE (u)-[:says]->(com)
    CREATE (com)-[:mentions]->(res)
  WITH u, com, res
    MATCH (u:user)-[r4:says]-(com)-[r5:mentions]-(res)
    WITH res, {
      id: com.uuid,
      comment: com,
      user: u
    } AS coms
  RETURN {
    comments: collect(DISTINCT coms)
  } AS result


// name: get_resource_by_doi
// FOR MIGRATION ONLY
MATCH (res:resource {doi:{doi}})
RETURN res

// name: get_resource_by_uuid
MATCH (res:resource { uuid:{uuid} })
RETURN res

// name: merge_collection_by_name
// add a collection (it is basically a tag for resource) FOR MIGRATION ONLY
MERGE (col:collection {name:{name}})
RETURN col


// name: merge_resource
// also assign a default curator for the resource
//
// NOTE  fields that are obsolete:
//  * "name_search" - was used by lucene. Now "name_<lang>" is indexed
//  * "full_search" - was used by lucene. Now "caption_<lang>" is indexed
//  * "url" - "url_<lang>" is now used
{if:slug}
  MERGE (res:resource {slug:{slug}})
{/if}
{unless:slug}
  MERGE (res:resource {doi:{doi}})
{/unless}
  ON CREATE set
    res.uuid = {uuid},
    res.name = {name},
    res.mimetype = {mimetype},
    res.languages = {languages},
    {if:start_time}
      res.start_time = toInt({start_time}),
      res.end_time   = toInt({end_time}),
      res.start_date = {start_date},
      res.end_date   = {end_date},
    {/if}
    {if:start_month}
      res.start_month = toInt({start_month}),
      res.end_month   = toInt({end_month}),
    {/if}
    {if:start_year}
      res.start_year = toInt({start_year}),
    {/if}
    {if:full_search}
      res.full_search = {full_search},
    {/if}
    {if:title_search}
      res.title_search = {title_search},
    {/if}
    {if:url}
      res.url = {url},
    {/if}
    {if:url_en}
      res.url_en = {url_en},
    {/if}
    {if:url_fr}
      res.url_fr = {url_fr},
    {/if}
    {if:url_de}
      res.url_de = {url_de},
    {/if}
    {if:title_it}
      res.title_it = {title_it},
    {/if}
    {if:title_en}
      res.title_en = {title_en},
    {/if}
    {if:title_es}
      res.title_es = {title_es},
    {/if}
    {if:title_fr}
      res.title_fr = {title_fr},
    {/if}
    {if:title_de}
      res.title_de = {title_de},
    {/if}
    {if:title_und}
      res.title_und = {title_und},
    {/if}
    {if:caption_en}
      res.caption_en = {caption_en},
    {/if}
    {if:caption_fr}
      res.caption_fr = {caption_fr},
    {/if}
    {if:caption_it}
      res.caption_it = {caption_it},
    {/if}
    {if:caption_es}
      res.caption_es = {caption_es},
    {/if}
    {if:caption_de}
      res.caption_de = {caption_de},
    {/if}
    {if:caption_und} 
      res.caption_und = {caption_und},
    {/if}
    {if:content_en}
      res.content_en = {content_en},
    {/if}
    {if:content_fr}
      res.content_fr = {content_fr},
    {/if}
    {if:content_it}
      res.content_it = {content_it},
    {/if}
    {if:content_es}
      res.content_es = {content_es},
    {/if}
    {if:content_de}
      res.content_de = {content_de},
    {/if}
    {if:content_und} 
      res.content_und = {content_und},
    {/if}
    {if:type}
      res.type = {type},
    {/if}
    {if:iiif_url}
      res.iiif_url = {iiif_url},
    {/if}
    res.creation_date = toString(datetime()),
    res.creation_time = timestamp() / 1000
  ON MATCH SET
    {if:start_time}
      res.start_time = toInt({start_time}),
      res.end_time   = toInt({end_time}),
      res.start_date = {start_date},
      res.end_date   = {end_date},
    {/if}
    {if:start_month}
      res.start_month = toInt({start_month}),
      res.end_month   = toInt({end_month}),
    {/if}
    {if:start_year}
      res.start_year = toInt({start_year}),
    {/if}
    {if:full_search}
      res.full_search = {full_search},
    {/if}
    {if:title_search}
      res.title_search = {title_search},
    {/if}
    {if:url}
      res.url = {url},
    {/if}
    {if:url_en}
      res.url_en = {url_en},
    {/if}
    {if:url_fr}
      res.url_fr = {url_fr},
    {/if}
    {if:url_de}
      res.url_de = {url_de},
    {/if}
    {if:title_und}
      res.title_und = {title_und},
    {/if}
    {if:title_en}
      res.title_en = {title_en},
    {/if}
    {if:title_es}
      res.title_es = {title_es},
    {/if}
    {if:title_it}
      res.title_it = {title_it},
    {/if}
    {if:title_fr}
      res.title_fr = {title_fr},
    {/if}
    {if:title_de}
      res.title_de = {title_de},
    {/if}
    {if:caption_en}
      res.caption_en = {caption_en},
    {/if}
    {if:caption_fr}
      res.caption_fr = {caption_fr},
    {/if}
    {if:caption_it}
      res.caption_it = {caption_it},
    {/if}
    {if:caption_es}
      res.caption_es = {caption_es},
    {/if}
    {if:caption_de}
      res.caption_de = {caption_de},
    {/if}
    {if:caption_und} 
      res.caption_und = {caption_und},
    {/if}
        {if:content_en}
      res.content_en = {content_en},
    {/if}
    {if:content_fr}
      res.content_fr = {content_fr},
    {/if}
    {if:content_it}
      res.content_it = {content_it},
    {/if}
    {if:content_es}
      res.content_es = {content_es},
    {/if}
    {if:content_de}
      res.content_de = {content_de},
    {/if}
    {if:content_und} 
      res.content_und = {content_und},
    {/if}
    {if:type}
      res.type = {type},
    {/if}
    {if:iiif_url}
      res.iiif_url = {iiif_url},
    {/if}
    res.last_modification_date = toString(datetime()),
    res.last_modification_time = timestamp() / 1000
WITH res
{if:username}
OPTIONAL MATCH (u:user {username: {username}})
  MERGE (u)-[r:curates]->(res)
{/if}
{if:previous_resource_uuid}
WITH res, u
OPTIONAL MATCH (prev:resource { uuid: {previous_resource_uuid} })
  MERGE (res)-[ca:comes_after]->(prev)
{/if}
RETURN {
  id: id(res),
  props: res,
  curated_by: u.username
}

// name: remove_resource
// WARNING!!!! destroy everything related to the resource, as if it never existed. Should not be used while comments are in place
MATCH (n:resource)
WHERE n.uuid = {id}
OPTIONAL MATCH (n)-[r]-()
DELETE n, r


// name: merge_relationship_resource_collection
// link a resource with an entity, it it han't been done yet.
MATCH (col:collection), (res:resource)
  WHERE col.uuid={collection_id} AND res.uuid={resource_id}
WITH col, res
  MERGE (res)-[r:belongs_to]->(col)
RETURN col, res


// name: get_precomputated_cooccurrences
//
MATCH (p1:{:entity} {status:1})-[r:appear_in_same_document]-(p2:{:entity} {status:1})
WHERE id(p1) < id(p2)
WITH p1,p2,r
ORDER BY r.intersections DESC
LIMIT {limit}
WITH p1,p2,r
RETURN {
  source: {
    id: p1.uuid,
    type: {entity},
    label: COALESCE(p1.name, p1.title_en, p1.title_fr),
    url: p1.thumbnail
  },
  target: {
    id: p2.uuid,
    type: {entity},
    label: COALESCE(p2.name, p2.title_en, p2.title_fr),
    url: p2.thumbnail
  },
  weight: r.intersections
} as result



// name: get_cooccurrences
// 
{if:with}
MATCH (ent2:entity)
  WHERE ent2.uuid IN {with}
WITH ent2
MATCH (res:resource)<-[:appears_in]-(ent2 {status:1})
WITH res
  MATCH (p1:{:entity} {status:1})-[r1:appears_in]->(res)<-[r2:appears_in]-(p2:{:entity} {status:1})
{/if}
{unless:with}
MATCH (p1:{:entity} {status:1})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entity} {status:1})
{/unless}
  WHERE id(p1) < id(p2)
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
  {if:without}
    AND NOT p1.uuid IN {without}
    AND NOT p2.uuid IN {without}
  {/if}
WITH p1, p2, count(res) as w
ORDER BY w DESC
LIMIT {limit}
RETURN {
    source: {
      id: p1.uuid,
      type: {entity},
      label: COALESCE(p1.name, p1.title_en, p1.title_fr),
      url: p1.thumbnail
    },
    target: {
      id: p2.uuid,
      type: {entity},
      label: COALESCE(p2.name, p2.title_en, p2.title_fr),
      url: p2.thumbnail
    },
    weight: w
  } as result


// name: get_bipartite_cooccurrences
//
{if:with}
MATCH (ent2:entity)
  WHERE ent2.uuid IN {with}
WITH ent2
MATCH (res:resource)<-[:appears_in]-(ent2)
WITH res
  MATCH (p1:{:entityA} {status:1})-[r1:appears_in]->(res)<-[r2:appears_in]-(p2:{:entityB} {status:1})
{/if}
{unless:with}
MATCH (p1:{:entityA} {status:1})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entityB} {status:1})
{/unless}
  WHERE true
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
  {if:without}
    AND NOT p1.uuid IN {without}
    AND NOT p2.uuid IN {without}
  {/if}
  
WITH p1, p2, count(res) as w
ORDER BY w DESC
LIMIT {limit}
RETURN {
    source: {
      id: p1.uuid,
      type: {entityA},
      label: p1.name,
      url: p1.thumbnail
    },
    target: {
      id: p2.uuid,
      type: {entityB},
      label: p2.name,
      url: p2.thumbnail
    },
    weight: w
  } as result



// name: get_related_entities_graph
//
MATCH (n:resource {uuid: {id}})<-[r1:appears_in]-(ent:{:entity})-[r2:appears_in]->(res:resource)
WITH r1, r2, res
  ORDER BY r1.tfidf DESC, r2.tfidf DESC
  LIMIT 100
WITH res
MATCH (p1:{:entity})-[:appears_in]->(res)<-[:appears_in]-(p2:{:entity})
 WHERE true
WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: LAST(labels(p1)),
      label: COALESCE(p1.name, p1.title_en, p1.title_fr,p1.title, '')
    },
    target: {
      id: id(p2),
      type: LAST(labels(p2)),
      label: COALESCE(p2.name, p2.title_en, p2.title_fr,p2.title, '')
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT 500



// name: get_related_resources_bipartite_graph
MATCH (res1:resource {uuid: {id}})<-[r1:appears_in]-(ent:entity)-[r2:appears_in]->(res2:resource)
  WHERE true
    {if:mimetype}
    AND res2.mimetype IN {mimetype}
    {/if}
    {if:type}
    AND res2.type IN {type}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time <= {end_time}
    {/if}

WITH  res1, res2, r1, r2, ent
{if:with}
  MATCH (ent2:entity)-[:appears_in]->(res2)
  WHERE ent2.uuid IN {with}
  WITH  res1, res2, r1, r2, ent
{/if}

WITH res1, res2, count(*) as intersection

MATCH (res1)<-[rel:appears_in]-(r1:entity)
WITH res1, res2, intersection, count(r1) as H1

MATCH (res2)<-[rel:appears_in]-(r1:entity)
WITH res1,res2, intersection, H1, count(r1) as H2
WITH res1, res2, intersection, H1+H2 as union
WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD
ORDER BY JACCARD DESC
LIMIT 50 // top 50 resources
WITH (collect(res2) + res1) as ghosts
UNWIND ghosts as ghost
MATCH (ghost)<-[r:appears_in]-(ent:person)
WITH ghost, r, ent
ORDER BY r.tfidf DESC
WITH ghost, collect(DISTINCT ent)[0..10] as entities
WHERE length(entities) > 1
UNWIND entities as ent
MATCH (ghost)<-[r:appears_in]-(ent)
RETURN {
  source: {
    id: ghost.uuid,
    type: 'resource',
    label: COALESCE(ghost.name, ghost.title_en, ghost.title_fr)
  },
  target: {
    id: ent.uuid,
    type: LAST(labels(ent)),
    label: ent.name
  },
  weight: r.frequency
} as result
ORDER BY r.tfidf DESC
LIMIT 250



// name: get_related_resources_graph
//
MATCH (res1:resource {uuid: {id}})<-[r1:appears_in]-(ent:entity)-[r2:appears_in]->(res2:resource)
  WHERE true
    {if:mimetype}
    AND res2.mimetype IN {mimetype}
    {/if}
    {if:type}
    AND res2.type IN {type}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time <= {end_time}
    {/if}

WITH  res1, res2, r1, r2, ent
{if:with}
  MATCH (ent2:entity)
  WHERE ent2.uuid IN {with}
  WITH ent2
  MATCH (ent2)-[:appears_in]->(res2)
  WITH  res1, res2, r1, r2, ent
{/if}

WITH res1, res2, count(*) as intersection

MATCH (res1)<-[rel:appears_in]-(r1:entity)
WITH res1, res2, intersection, count(r1) as H1

MATCH (res2)<-[rel:appears_in]-(r1:entity)
WITH res1,res2, intersection, H1, count(r1) as H2
WITH res1, res2, intersection, H1+H2 as union
WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD
ORDER BY JACCARD DESC
LIMIT 50 // top 50 resources
WITH (collect(res2) + res1) as resources
UNWIND resources as P
UNWIND resources as Q
MATCH (P)<-[rA:appears_in]-(ent:person)-[rB:appears_in]->(Q)
WHERE id(P) < id(Q)
WITH P, Q, ent
ORDER BY ent.specificity DESC

WITH P, Q, count(distinct ent) as intersection
RETURN {
  source: {
    id: P.uuid,
    type: 'resource',
    label: COALESCE(P.name, P.title_en, P.title_fr)
  },
  target: {
    id: Q.uuid,
    type:'resource',
    label: COALESCE(Q.name, Q.title_en, Q.title_fr)
  },
  weight: intersection
} as result
ORDER BY intersection DESC
LIMIT {limit}


// name: count_timeline
//
MATCH (res:resource)
WHERE res.start_time IS NOT NULL
{?res:start_time__gt} {AND?res:end_time__lt}
return count(distinct res.start_time)


// name: get_timeline
//
// NOTE: if `from_uuid` parameter is provided it assumes that `to_uuid` is provided as well.
{if:ids}
// UUID match
MATCH (r:resource)
WHERE r.uuid in {ids}
WITH collect(id(r)) AS ids
{/if}
{unless:ids}
WITH NULL AS ids
{/unless}

{if:fullTextQuery}
// match full text query
CALL db.index.fulltext.queryNodes({fullTextIndex}, {fullTextQuery})
YIELD node AS res
WHERE ids IS NULL OR id(res) IN ids
WITH DISTINCT collect(id(res)) AS ids
{/if}

{if:with}
// match belonging to resource
MATCH (r:resource)<-[:appears_in]-(ent:entity)
WHERE 
  ent.uuid IN {with} AND 
  (ids IS NULL OR id(r) IN ids)
WITH DISTINCT collect(id(r)) AS ids
{/if}

{if:from_uuid}
// match from/to UUID boundaries
// NOTE: if no path found - skip this constraint
MATCH p = shortestPath((b:resource { uuid: {from_uuid} })<-[:comes_after*]-(a:resource { uuid: {to_uuid} }))
WITH collect(DISTINCT [r IN nodes(p) WHERE (ids IS NULL OR id(r) IN ids) | id(r)]) AS ids
WITH coalesce(ids[0], NULL) as ids
{/if}


MATCH (res:resource)
WHERE 
  (ids IS NULL OR id(res) IN ids)
  AND exists(res.start_month)
{if:mimetype}
  AND res.mimetype = {mimetype}
{/if}
{if:type}
  AND res.type IN {type}
{/if}
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time <= {end_time}
{/if} 

{if:topicModellingScoresLowerThreshold}
  AND res.topic_modelling__scores[{topicModellingIndex}] >= {topicModellingScoresLowerThreshold}
{/if}

WITH  res.start_month as tm, min(res.start_time) as t, count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC

// name: get_related_resources_timeline
//
MATCH (res:resource)<-[:appears_in]-(ent:entity)
WHERE res.uuid = {id}
WITH ent
{if:with}
  MATCH (ent2:entity)
  WHERE ent2.uuid  IN {with}
  WITH ent2
  MATCH (ent2)-[:appears_in]->(res:resource)<-[r:appears_in]-(ent)
  WITH DISTINCT res
{/if}
{unless:with}
  MATCH (res:resource)<-[r:appears_in]-(ent)
  WITH DISTINCT res
{/unless}

WHERE res.uuid <> {id} AND exists(res.start_month)
  {if:mimetype}
  AND res.mimetype = {mimetype}
  {/if}
  {if:type}
  AND res.type IN {type}
  {/if}
  {if:start_time}
  AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
  AND res.end_time <= {end_time}
  {/if}
WITH DISTINCT res
  
WITH  res.start_month as tm, min(res.start_time) as t,  count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC



// name: get_timeline_per_day
//
MATCH (res:resource)
WHERE exists(res.start_time)
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time <= {end_time}
{/if} 
WITH  res.start_time as t, count(res) as weight
RETURN t, weight



// name: create_related_user
// create or merge the cureted by relationship on a specific entity
// create related user
MATCH (res:resource), (u:user {username:{username}})
WHERE res.uuid = {id}
WITH res, u
MERGE (u)-[r:likes]->(res)
ON CREATE SET
  r.creation_date = {creation_date},
  r.creation_time = {creation_time},
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
ON MATCH SET
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
RETURN {
  id: res.uuid,
  props: res,
  type: last(labels(res)),
  rel: r
} as result

// name: remove_related_user
// remove the relationship, if any
MATCH (u:user {username:{username}})-[r:likes]->(res:resource)
WHERE res.uuid = {id}
WITH res, u, r
DELETE r RETURN count(r)


// name:count_related_users
// get related users that 'curates's OR liked the resource
MATCH (u:user)-[*0..2]-(res:resource {uuid: {id}})
RETURN count(DISTINCT u) as count_items

// name:get_related_users
// get related users that 'curates'sthe resource
MATCH (res:resource {uuid: {id}})-[*0..2]-(u)
WITH res
OPTIONAL MATCH (u)-[r:curates]->(res)
OPTIONAL MATCH (u)-[r2:proposes]->(inq)-[:questions]->(res)
WITH u, r, {
    id: inq.uuid,
    type: last(labels(inq)),
    rel: r2,
    props: inq
  } as proposed_inquiries
RETURN  {
  id: u.uuid,
  username: u.username,
  props: u,
  type: last(labels(u)),
  favourites: COLLECT(DISTINCT r),
  proposes: COLLECT(DISTINCT proposed_inquiries)
} as users


// name:get_related_entities
// get related nodes that are connected with the entity. test with
// > node scripts/manage.js --task=common.cypher.query --cypher=resource/get_related_entities --id=N1frQNKD2g --limit=10 --entity=person --offset=0
MATCH (res:resource {uuid: {id}})
WITH res
MATCH (ent:{:entity})-[r:appears_in]->(res)
WITH ent, r
ORDER BY r.tfidf DESC
SKIP {offset}
LIMIT {limit}
RETURN {
  id: ent.uuid,
  type: last(labels(ent)),
  props: ent,
  weight: r.tfidf
}
ORDER BY r.tfidf DESC 


// name:count_related_entities
// get related nodes that are connected with the entity. test with
// > node scripts/manage.js --task=common.cypher.query --cypher=resource/count_related_entities --id=N1frQNKD2g --limit=10 --entity=person --offset=0
MATCH (n:resource {uuid:{id}})<-[r1:appears_in]-(ent:{:entity})
RETURN COUNT(DISTINCT ent) as count_items


// name:count_related_actions
// count related actions
MATCH (res:resource)
  WHERE res.uuid = {id}
WITH res
  MATCH (act:action{if:kind}:{:kind}{/if})-[r]->(res)
WITH last(labels(act)) as group, count(DISTINCT act) as count_items
RETURN {
  group: group,
  count_items: count_items
} AS result


// name:get_related_actions
// get actions getMany()
MATCH (res:resource)
  WHERE res.uuid = {id}
WITH res
  MATCH (act:action{if:kind}:{:kind}{/if})-[r]->(res)

WITH act
ORDER BY act.last_modification_time DESC
SKIP {offset}
LIMIT {limit}

WITH act
MATCH (u:user)-[r:performs]->(act)

WITH act, r, {
    id: u.uuid,
    username: u.username,
    picture: u.picture
  } as alias_u
MATCH (act)-[r_men:mentions]->(t:entity)
WITH act, alias_u, collect({
  id: t.uuid,
  type: last(labels(t)),
  props:t}) as mentioning
RETURN {
  id: act.uuid,
  type: last(labels(act)),
  props: act,
  performed_by: alias_u,
  mentioning: mentioning
}

// name:mark_discovered
// mark resource discovered
MATCH (r:resource { uuid: {uuid} })
SET r.discovered = true
RETURN r

// name:get_uuids_of_not_discovered_resources
// get uuid list of not yet discovered resources
MATCH(r:resource)
WHERE NOT EXISTS(r.discovered) OR r.discovered<>true
RETURN r.uuid


// name:get_linked_resources_uuids
// return UUIDs of resources that come before and after this resource
OPTIONAL MATCH (after:resource)-[:comes_after]->(current:resource { uid: {uuid} }) 
WITH after, current
OPTIONAL MATCH (current)-[:comes_after]->(before:resource)
RETURN after.uid as after_uid, before.uid as before_uid

// name: find_by_uuid_or_slug
OPTIONAL MATCH(r:resource {uuid: {uuidOrSlug}})
RETURN r
UNION
OPTIONAL MATCH(r:resource {slug: {uuidOrSlug}})
RETURN r

// name: update_topic_modelling_scores
MATCH(r:resource {uuid: {uuid}})
SET r.topic_modelling__scores = {scores}
RETURN r

// name: find_topic_modelling_scores
MATCH(r:resource)
WHERE
  {if:start_time}
    r.start_time >= {start_time} AND
  {/if}
  {if:end_time}
    r.start_time <= {end_time} AND
  {/if}

  true
RETURN {
  uuid: r.uuid,
  scores: r.topic_modelling__scores,
  startDate: r.start_date,
  endDate: r.end_date
}
ORDER BY r.start_time

// name: find_with_nationality_aspect
MATCH (r:resource)
WHERE
  {if:start_time}
    r.start_time >= {start_time} AND
  {/if}
  {if:end_time}
    r.start_time <= {end_time} AND
  {/if}

  true
OPTIONAL MATCH (r)-[]-(e:entity:person)
WITH { 
	uuid: r.uuid, 
  startDate: r.start_date, 
  endDate: r.end_date,
  nationalities: collect(e.metadata__nationality) 
} AS result, r
RETURN result
ORDER BY r.start_time

// name: find_keyword_frequency_aspect
CALL db.index.fulltext.queryNodes({fullTextIndex}, {keyword}) 
YIELD node as r 
WITH collect(r.uuid) as mentioned_ids
MATCH (r:resource) 
WHERE
  {if:fromTime}
    r.start_time >= {fromTime} AND
  {/if}
  {if:toTime}
    r.start_time <= {toTime} AND
  {/if}
  true
RETURN {
	uuid: r.uuid, 
  startDate: r.start_date, 
  mentions: CASE WHEN r.uuid in mentioned_ids THEN 1 ELSE 0 END
} as res
ORDER BY r.start_time

// name: save_or_update
// NOTE: preferred method to modify resource.
// Parameters:
//  * resources - a list of resource properties that satisfy flattened `http://c2dh.uni.lu/histograph/db/resource.json`
//  * username - a name of user to make 
WITH {username} AS username, toString(datetime()) AS date_now, timestamp() / 1000 AS time_now
UNWIND {resources} AS parameters 
MERGE (res:resource {slug: parameters.slug})
ON CREATE SET
  res += parameters,
  res.creation_date = date_now,
  res.creation_time = time_now,
  res.last_modification_date = date_now,
  res.last_modification_time = time_now
ON MATCH SET
  res.__existingUuid = res.uuid,
  res += parameters,
  res.uuid = res.__existingUuid,
  res.__existingUuid = null,
  res.last_modification_date = date_now,
  res.last_modification_time = time_now
// Add user if provided
WITH res, username
OPTIONAL MATCH (u:user {username: username})
WITH res, collect(u) as users, username
FOREACH (user in users | MERGE (user)-[:curates]-(res))
RETURN {
  id: id(res),
  props: res,
  curated_by: username
} as result
