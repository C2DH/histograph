#!/bin/sh

echo "
  This is an example of a Histograph data ingestion pipeline.
  It assumes you have prepared document files as described in
  'Preparing documents' section here: 
  https://github.com/C2DH/histograph/tree/master/tools/resource_creator#preparing-documents
  and put these documents in a folder.
  
  There are several steps in the process.

  1) Documents are converted to Histograph 'resource' JSON objects.
  Entities are extracted and disambiguated at this point. Resource 
  objects are stored in a single file, one line per JSON.

  ***
  Depending on the corpus size and NER/NED model used this
  step may take a lot of time to complete. You may consider to
  run it in parallel potentially in a GPU enabled environment.
  At uni.lu this step is usually performed on one or more HPC nodes (https://hpc.uni.lu/).

  This step uses a `resource_creator` tool which is bundled as a docker image.
  The image is rather big (almost 4Gb) because it includes a 1Gb pytorch dependency
  and pretty big NER/NED models.
  ***

  2) Resources are converted into Neo4j CSV files that can be 
  understood by the Neo4j import tool.

  3) A database folder is created from the CSV files using Neo4j
  import tool.

"

SCRIPT_PATH=$0
SCRIPT_REAL_PATH=$(realpath $SCRIPT_PATH)
SCRIPT_BASE_PATH=$(dirname $SCRIPT_REAL_PATH)
WORK_DIR=$1
DOCUMENTS_DIR=$2

CSV_DIR="csv"
DB_DIR="db"
JSONS_FILENAME="resources.jsons"

work_dir_abs_path=$(realpath $WORK_DIR)
documents_dir_abs_path=$(realpath $DOCUMENTS_DIR)

print_help_and_exit() {
  if [ -n "$1" ]; then
    echo "Error: $1"
  fi
  echo "Usage: $SCRIPT_PATH <Work Directory> <Documents Directory>"
  exit 1
}

[ -d "$WORK_DIR" ] || print_help_and_exit "Work directory $WORK_DIR does not exist"
[ -d "$DOCUMENTS_DIR" ] || print_help_and_exit "Documents directory $DOCUMENTS_DIR does not exist"

prepare_json_resources() {
  echo "1. Preparing resource JSON objects"

  docker run --name hg_resource_creator --rm -it \
    -v $documents_dir_abs_path:/documents \
    -v $work_dir_abs_path:/jsons \
    theorm/histograph-resource-creator \
    python -m hg_resource_creator \
    --path /documents \
    --outpath /jsons/$JSONS_FILENAME \
    --language en --skip-validation --ner-method spacy_small_en
    echo "Prepared resources in file $WORK_DIR/$JSONS_FILENAME \n"
}

prepare_neo4j_csv_files() {
  echo "2. Preparing Neo4j CSV files"

  [ -d "$WORK_DIR/$CSV_DIR" ] || mkdir -p $WORK_DIR/$CSV_DIR

  work_dir_abs_path=$(realpath $WORK_DIR)
  docker run --name hg_csvs --rm -it \
    -v $work_dir_abs_path/$CSV_DIR:/csv_files \
    -v $work_dir_abs_path/$JSONS_FILENAME:/histograph_corpus.jsons \
    --entrypoint node \
    theorm/histograph \
    lib/tools/neo4jImport/index.js /csv_files /histograph_corpus.jsons
  echo "Prepared Neo4j CSV files \n"
}

prepare_neo4j_db() {
  echo "3. Creating Neo4j database"
  [ -d "$WORK_DIR/$DB_DIR" ] || mkdir -p $WORK_DIR/$DB_DIR
  $SCRIPT_BASE_PATH/../tools/load-csv-into-db.sh $WORK_DIR/$CSV_DIR $WORK_DIR/$DB_DIR
  echo "Prepared Neo4j database: $WORK_DIR/$DB_DIR \n"
}

prepare_json_resources
prepare_neo4j_csv_files
prepare_neo4j_db
