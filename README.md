# Histograph

Histograph is a text content exploration tool for digital humanities specialists.

# Running

The easiest way to run the app is to use a Docker Compose file shipped with this project. The file and all required configuration
files are in `docker` directory.

From the `docker` directory run:

```shell
docker-compose up
```

Histograph web app will be accessible on `http://localhost/`. If you are using Histograph for the first time you will be prompted to create an account on `Auth0` using your email and a password. Alternatively you can log in using `Google` or `Twitter` social log-in buttons.

# Ingesting data

## Sample corpus

Histograph is barely useful without data. Data ingestion is a multi step process. We have provided a sample script that executes all steps of the process using _War and Peace_ book as a toy corpus. The script is well documented and can be used as a starting point for developing a custom ingestion pipeline.

The script is located in `scripts/examples/prepare_war_and_peace_db.sh`. It can be run as follows:

```shell
scripts/examples/prepare_war_and_peace_db.sh ~/tmp_dir
```

Where `tmp_dir` is a temporary directory where the pipeline process stores temporary files and the new Histograph database.

**Make sure you have Python 3.5+ installed on your OS**

If the script is completed without errors a `tmp_dir/db` directory will be created. The content of this directory can be moved to `docker/data/neo4j` directory to be available for the `docker-compose` set-up. Histograph can then be restarted using the command from the previous section. 

## Custom corpus

### With text files ready

We have provided another script that assumes you have already created separate document files
from your corpus and named them according to the format described in [Preparing documents](tools/resource_creator#preparing-documents) section of the `resource creator` tool.

You can run this script as follows:

```shell
scripts/examples/prepare_db_simple.sh ~/tmp_dir ~/document_files_dir
```

Where:

 * `tmp_dir` is a temporary directory where the pipeline process stores temporary files and the new Histograph database
 * `document_files_dir` is a directory containing document files.

### With Histograph JSONs ready

We have provided another script that assumes you have already created a file with JSON objects (one per line) that follow
[Histograph payload schema format](https://github.com/C2DH/histograph/blob/master/schema/json/api/management/create_resource/payload.json).

You can run this script as follows:

```shell
scripts/examples/prepare_db_from_json.sh ~/tmp_dir ~/path_to_jsons_file.jsons
```

Where:

 * `tmp_dir` is a temporary directory where the pipeline process stores temporary files and the new Histograph database
 * `path_to_jsons_file.jsons` path to the file containing JSON objects.


## Notes

Ingestion pipeline uses a `resource_creator` tool which is bundled as a docker image. The image is rather big (almost 4Gb) because it includes a 1Gb pytorch dependency and pretty big NER/NED models. Plan your free space accordingly.

## Topic modelling

Custom topic modelling scores can be associated with documents in Histograph. To load topic modelling scores first topics need to be created. Afterwards scores for all topics can be loaded for every document. The Python code below can be used as a starting point of topic modelling ingestion script:

```python
import requests, json

API_KEY = '<api_key_from_the_top_right_menu_in_histograph>'
HISTOGRAPH_API_URL = 'http://localhost:8000/api'

headers = { 'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# add topics
topic_id = 0
payload = {
    "label": "topic one",
    "keywords": ["one", "keyword"]
}

response = requests.put(f'{HISTOGRAPH_API_URL}/v1/topics/default/{topic_id}', headers=headers, data=json.dumps(payload))
print(response.status_code, response.text)

topic_id = 1
payload = {
    "label": "topic two",
    "keywords": ["two", "keyword"]
}

response = requests.put(f'{HISTOGRAPH_API_URL}/v1/topics/default/{topic_id}', headers=headers, data=json.dumps(payload))
print(response.status_code, response.text)

# add topics scores

document_slug = 'book_SIX_CHAPTER_XXV'

payload = {
    "scores": [0.2, 0.7]
}

response = requests.put(
    f'{HISTOGRAPH_API_URL}/v1/resources/{document_slug}/topic-modelling-scores',
    headers=headers,
    data=json.dumps(payload)
)
print(response.status_code, response.text)
```

# Architecture

Histograph is made up of several components:

 * a web app
 * an API service the API talks to
 * a set of tools mostly used to ingest data into Histograph.

Histograph uses `Auth0` as an authentication provider.

# Developing Histograph

## Running in development mode

1. Start API on port `8000`

```
npm start
```

2. Start web app on port `8080`

```
cd client && npm start
```

3. Web app will open in the browser.

### Disabling authentication

It is possible to disable authentication during development:

Start API with authentication disabled:

```
NOAUTH=1 npm start
```

Start Web app with authentication disabled:

```
NOAUTH=1 npm start
```
