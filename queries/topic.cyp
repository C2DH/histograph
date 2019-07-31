// name: create_or_update
MERGE (t:Topic {index:{index}, set:{set}})
ON CREATE SET
  t.index = {index},
  t.set = {set},
  t.label = {label},
  t.keywords = {keywords}
ON MATCH SET
  t.label = {label},
  t.keywords = {keywords}
RETURN t

// name: get_all_for_set
MATCH (t:Topic {set:{set}})
RETURN t

// name: get
MATCH (t:Topic {index:{index}, set:{set}})
RETURN t
