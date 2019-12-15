#!/bin/sh

echo "
  This is an example of a Histograph data ingestion pipeline.
  It assumes you have prepared a file with Histograph JSON objects
  that match schema described here: 
  https://github.com/C2DH/histograph/blob/master/schema/json/api/management/create_resource/payload.json
  
  There are two steps in the process.

  1) Resources are converted into Neo4j CSV files that can be 
  understood by the Neo4j import tool.

  2) A database folder is created from the CSV files using Neo4j
  import tool.

"

SCRIPT_PATH=$0
SCRIPT_REAL_PATH=$(realpath $SCRIPT_PATH)
SCRIPT_BASE_PATH=$(dirname $SCRIPT_REAL_PATH)
WORK_DIR=$1
JSONS_PATH=$2

CSV_DIR="csv"
DB_DIR="db"

work_dir_abs_path=$(realpath $WORK_DIR)
jsons_abs_path=$(realpath $JSONS_PATH)

print_help_and_exit() {
  if [ -n "$1" ]; then
    echo "Error: $1"
  fi
  echo "Usage: $SCRIPT_PATH <Work Directory> <JSONS file path>"
  exit 1
}

[ -d "$WORK_DIR" ] || print_help_and_exit "Work directory $WORK_DIR does not exist"
[ -f "$jsons_abs_path" ] || print_help_and_exit "JSONS file is not found in $JSONS_PATH"

prepare_neo4j_csv_files() {
  echo "2. Preparing Neo4j CSV files"

  [ -d "$WORK_DIR/$CSV_DIR" ] || mkdir -p $WORK_DIR/$CSV_DIR

  work_dir_abs_path=$(realpath $WORK_DIR)
  docker run --name hg_csvs --rm -it \
    -v $work_dir_abs_path/$CSV_DIR:/csv_files \
    -v $jsons_abs_path:/histograph_corpus.jsons \
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

prepare_neo4j_csv_files
prepare_neo4j_db
