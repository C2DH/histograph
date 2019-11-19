import fastjsonschema
from urllib.request import urlopen
import json, ssl

SCHEMAS = [
  'http://c2dh.uni.lu/histograph/api/management/create_resource/payload.json',
  'http://c2dh.uni.lu/histograph/db/resource.json',
  'http://c2dh.uni.lu/histograph/db/entity.json'
]

CREATE_PAYLOAD_SCHEMA = 'http://c2dh.uni.lu/histograph/api/management/create_resource/payload.json'

SCHEMA_LOCATION_PREFIX_MAPPING = [
  'http://c2dh.uni.lu/histograph',
  'http://raw.githubusercontent.com/C2DH/histograph/master/schema/json'
]

def get_schema_content(uri):
  ctx = ssl.create_default_context()
  ctx.check_hostname = False
  ctx.verify_mode = ssl.CERT_NONE

  with urlopen(uri, context=ctx) as req:
    encoding = req.info().get_content_charset() or 'utf-8'
    return json.loads(req.read().decode(encoding))

def get_validator():
  handlers = {}
  prefix, replacement_prefix = SCHEMA_LOCATION_PREFIX_MAPPING
  for schema in SCHEMAS:
    schema_location = schema.replace(prefix, replacement_prefix)
    handlers[schema] = get_schema_content(schema_location)

  return fastjsonschema.compile(handlers[CREATE_PAYLOAD_SCHEMA], handlers={ 'http': lambda uri: handlers[uri] })

if __name__ == '__main__':
  validate = get_validator()
  print(validate({ 'resource': {} }))