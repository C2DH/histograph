# Histograph

Histograph is a text content exploration tool for digital humanities specialists.

## installation
Once cloned,
	
```shell
npm install && cd client && npm install
```

and install mocha globally (to test settings)

	npm install -g mocha

Then copy the `settings.example.js` file to `settings.js`
	
	cp settings.example.js settings.js

adjust the `paths` section of your `settings.js` file, then create the folders and permissions accordingly. For instance, if using the default settings:
	
	cd histograph
    mkdir contents
 	mkdir contents/media	
    mkdir contents/txt
    mkdir contents/cache
	mkdir contents/cache/disambiguation
    mkdir contents/cache/dbpedia
    mkdir contents/cache/queries
    mkdir contents/cache/services

Install [Neo4j](http://neo4j.com/) (v 2.3.*) and configure the database indexing by adding auto_indexing features in `conf/neo4j.properties` file.

	# Autoindexing

	# Enable auto-indexing for nodes, default is false
	# NOTE: renamed to "dbms.auto_index.nodes.enabled" in Neo4j 3x (https://neo4j.com/developer/kb/manually-migrating-configuration-settings-from-neo4j-2x-to-neo4j-3x/) and then deprecated. 
	# See here: http://neo4j-contrib.github.io/neo4j-apoc-procedures/3.5/indexes/fulltext-index/
	node_auto_indexing=true

	# The node property keys to be auto-indexed, if enabled
	# NOTE: renamed "dbms.auto_index.nodes.keys". See above.
	node_keys_indexable=full_search,name_search

Complete the neo4j installation by pointing to a location in your system that will store the neo4j data in `conf/neo4j-server.properties`:

	
	# location of the database directory
	org.neo4j.server.database.location=data/graph.db

Always in `conf/neo4j-server.properties`, enable *temporary* access to neo4j browser (remember to comment the related line later):
	
	# Let the webserver only listen on the specified IP. Default is localhost (only
	# accept local connections). Uncomment to allow any connection. Please see the
	# security section in the neo4j manual before modifying this.
	org.neo4j.server.webserver.address=0.0.0.0
	
start the neo4j server, e.g for unix terminal:
	
	~/tools/neo4j-community-2.3.2/bin/neo4j start

Once started, modify the default password and fill the `neo4j.host` section in `settings.js`:

  	neo4j : { // > 2.2
    	host : {
      		server: 'http://localhost:7474',
      		user: 'neo4j',
      		pass: '*************'
    	}
  	},

Run then the setup script: it will add the required constraints to neo4j db.

	node scripts/manage.js --task=setup

Modify neo4j related configuration in your histograph `settings.js` file, then run the unit tests (using mocha) in order to check that the settings have been set properly.

	npm run-script test-settings

If everything is ok, run global unit tests

	npm test
	

### Running in development mode

1. Start API on port `8000`

```
npm start
```

2. Start web app on port `8080`

```
cd client && npm start
```

3. Web app will open in the browser.

### Running in production mode

Option 1: Build docker image and run it.

```
make build
```

Option 2: Compile client app and get API/Express app serve it.

```
cd client && npm run build
npm start # then visit `http://localhost:8000/`
```

## import data: manage.js script
Once histograph has been installed, documents and links can be loaded from a JSON graph file via the **import** script by running:
	
	node scripts/manage.js --task=import.fromJSON --src=/your/data/**/*.json 

For detailed instructions about import and annotation process, see the [related wiki page](https://github.com/CVCEeu-dh/histograph/wiki/importing-text-documents-and-configure-the-annotation-script)
	
## Named Entity Recognition
Histograph enable the enrichment of resources with different webservices that extract and disambiguate the name entities found. Among them, we use  [AIDA web service](https://github.com/yago-naga/aida), developed by Max Plank Institute.
AIDA entity extracton is enabled by default, but the disambiguation engine works only for english texts.

First of all, set the correct endpoint to yago aida in settings.js:


  	yagoaida: {
    	endpoint: 'https://gate.d5.mpi-inf.mpg.de/aida/service/disambiguate' 
  	},

Then make sure that the disambiguation services include AIDA:

  	disambiguation: {
    	fields: [
      		"title",
      		"caption"
    	],
        services: {
            "yagoaida": ['en']
        }
	}
 

## troubleshooting

### enable cache with redis-server (optional)
For production environment we use redis-server to store api result cache (60 seconds cache).
For OSx, you can use brew to install redis:

	brew install redis
	redis-server /usr/local/etc/redis.conf

And uncomment the section cache in `settings.js`

### geocoding api setup
Create a new project at [console.developers.google](https://console.developers.google.com/project "https://console.developers.google.com/project"), then select the **geocoding api**
under the `api & auth` menu, copy the api key to the geocoding section of your `settings.js` file.
	
	geocoding: { // google geocoding api
    	endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
    	key: ''
  	},

 More info available at [geocoding documentation page](https://developers.google.com/maps/documentation/geocoding/)

## enabling google analytics
Just set the correct parameters in the google analytics section of the `settings.js` file.

	analytics: {
      account: 'UA-XXXXXXXXX-1',
      domainName: 'example.com'
  	}


# Ingesting data and preparing database

## Preparing resources
*TODO: link to hg_c2dhnerd_worker*

## Converting resources to Neo4j CSV files

```shell
docker run --name hg_csvs --rm -it \
  -v <directory_where_csv_files_will_be_written>:/csv_files \
  -v <path_to_corpus_jsons_file>:/histograph_corpus.jsons \
  --entrypoint node \
  theorm/histograph \
  lib/tools/neo4jImport/index.js /csv_files /histograph_corpus.jsons
```

## Creating database from CSV files

```shell
./scripts/tools/load-csv-into-db.sh <csv_file_directory> <database_directory>
```
