import re
import logging
from c2dh_nerd import get_ner, get_ned
from c2dh_nerd.util.routes import json_dumps
import dateutil.parser
from datetime import timezone
from .schema import get_validator

ENTITY_TYPE_MAPPING = {
  'LOC': 'location',
  'PER': 'person',
  'ORG': 'organization'
}

NORMALISE_PATTERNS = [
  (r'\n', ' '),
  (r'^[^a-zA-Z0-9]+', ''),
  (r'[^a-zA-Z0-9]+$', ''),
]
def normalise_entity_name(string):
  new_string = string
  for p, r in NORMALISE_PATTERNS:
    new_string = re.sub(p, r, new_string)
    
  return new_string

SUPPORTED_ENTITY_TAGS = ['ORG', 'LOC', 'PER']

def to_normalised_entity(entity):
  mr = getattr(entity, 'matched_resource', None)

  if hasattr(entity ,'tag'):
    tag = entity.tag
  elif mr is not None:
    tag = getattr(mr, 'tag')
  else:
    return None

  if tag not in SUPPORTED_ENTITY_TAGS:
    return
  
  normalised_name = normalise_entity_name(getattr(mr, 'label', entity.entity))
  
  normalised_entity = {
    'name': normalised_name,
    'tag': tag,
    'left': entity.left,
    'right': entity.right,
    'score': entity.score,
  }

  if getattr(mr, 'id', None) is not None:
    normalised_entity['id'] = str(getattr(mr, 'id', None))

  if getattr(mr, 'metadata', None) is not None:
    normalised_entity['metadata'] = getattr(mr, 'metadata', None)

  return normalised_entity

def nerd_result_to_entities_and_locations(result, resource, language_code, ned_model):
  entities = [e for e in [to_normalised_entity(e) for e in result.entities] if e is not None]
  entity_index_mapping = {}
  
  prepared_entities = []
  for index, e in enumerate(entities):
    prepared_entity = {
      'type': ENTITY_TYPE_MAPPING[e['tag']],
      'name': e['name'],
      'entity': {
        'ned_model': ned_model,
      },
    }

    if 'id' in e:
      prepared_entity['entity']['ned_id'] = e['id']
    if 'metadata' in e:
      prepared_entity['metadata'] = e['metadata']

    if prepared_entity in prepared_entities:
      entity_index = prepared_entities.index(prepared_entity)
    else:
      prepared_entities.append(prepared_entity)
      entity_index = len(prepared_entities) - 1

    entity_index_mapping[index] = entity_index
    
  entities_locations = []

  for index, e in enumerate(entities):
    entities_locations.append({
      'entityIndex': entity_index_mapping[index],
      'languageCode': language_code,
      'leftOffset': e['left'],
      'rightOffset': e['right']
    })

  return prepared_entities, entities_locations


def get_slug_title_date_from_filename(filename):
  date = dateutil.parser.parse(re.sub(r'(.*)_title_.*', r'\g<1>', filename))
  slug = re.sub(r'(.*)_title_(.*)\.txt', r'\g<2>', filename)
  title = slug.replace('_', ' ')

  return slug, title, date.replace(tzinfo=timezone.utc).isoformat()

class Nerd:
  def __init__(self, ner, ned, custom_entities_url = None):
    self.ner = None
    self.ned = None
    if ner is not None:
      self.ner = get_ner(ner)
      self.model_name = ner
    else:
      self.ned = get_ned(ned)
      self.model_name = ned
    self.custom_entities_url = custom_entities_url
    self._validate_payload = None

  def validator(self):
    if not self._validate_payload:
      self._validate_payload = get_validator()
    return self._validate_payload


  async def extract_as_histograph_payload(self, text, filename, language_code, skip_validation = False):
    slug, title, date = get_slug_title_date_from_filename(filename)

    resource = {
      'slug': slug,
      'title': {
        language_code: title
      },
      'caption': {
        language_code: ''
      },
      'content': {
        language_code: text
      },
      'start_date': date,
      'end_date': date,
    } 
   
    content = f"{resource['title'][language_code]}. {resource['caption'][language_code]}. {resource['content'][language_code]}"
    
    entities, locations = [None, None]
    if self.ner:
      entities, locations = nerd_result_to_entities_and_locations(await self.ner.extract(content), resource, language_code, self.model_name)
    else:
      entities, locations = nerd_result_to_entities_and_locations(await self.ned.extract(content, url=self.custom_entities_url), resource, language_code, self.model_name)

    payload = {
      'resource': resource,
      'entities': entities,
      'entitiesLocations': locations
    }

    if skip_validation:
      return payload
    else:
      validate_payload = self.validator()
      try:
        return validate_payload(payload)
      except Exception as e:
        logging.error(json_dumps(payload))
        raise e

def create_nerd_with_ner(type, custom_entities_url):
  return Nerd(type, None, custom_entities_url)

def create_nerd_with_ned(type, custom_entities_url):
  return Nerd(None, type, custom_entities_url)
