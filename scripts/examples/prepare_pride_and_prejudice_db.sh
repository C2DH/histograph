#!/bin/sh

echo "
  This is an example of a Histograph data ingestion pipeline.
  It uses 'Pride and Prejudice' book as an example of a corpus.
  
  There are several steps in the process. The first one is corpus
  specific. The rest is the same for any corpus.

  1) First the book is split into chapters. Every chapter will represent
  a single document in Histograph. Chapters are stored in files, one
  file per chapter. File names contain some metadata associated with
  the document: document timestamp and document title. 
  See 'tools/resource_creator/README.md' for more information about
  the format of the filename.
  
  ***
  This is a custom step. Depending on your corpus
  you will most likely need to write your own script for creating
  documents.
  ***

  2) Chapters are converted to Histograph 'resource' JSON objects.
  Entities are extracted and disambiguated at this point. Resource 
  objects are stored in a single file, one line per JSON.

  ***
  Depending on the corpus size and NER/NED model used this
  step may take a lot of time to complete. You may consider to
  run it in parallel potentially in a GPU enabled environment.
  At uni.lu this step is usually performed on one or more HPC nodes (https://hpc.uni.lu/)
  ***

  3) Resources are converted into Neo4j CSV files that can be 
  understood by the Neo4j import tool.

  4) A database folder is created from the CSV files using Neo4j
  import tool.

"

SCRIPT_PATH=$0
SCRIPT_REAL_PATH=$(realpath $SCRIPT_PATH)
SCRIPT_BASE_PATH=$(dirname $SCRIPT_REAL_PATH)
WORK_DIR=$1

CORPUS_FILENAME="pride_and_prejudice.txt"
CHAPTERS_DIR="chapters"
CSV_DIR="csv"
DB_DIR="db"
JSONS_FILENAME="resources.jsons"

print_help_and_exit() {
  if [ -n "$1" ]; then
    echo "Error: $1"
  fi
  echo "Usage: $SCRIPT_PATH <Work Directory>"
  exit 1
}

[ -d "$WORK_DIR" ] || print_help_and_exit "Work directory $WORK_DIR does not exist"

download_corpus() {
  curl https://www.gutenberg.org/files/1342/1342-0.txt -o $WORK_DIR/$CORPUS_FILENAME 
  echo "Corpus downloaded into $WORK_DIR/$CORPUS_FILENAME"
}

split_corpus_into_chapters() {
  echo "1. Splitting corpus into documents"

  [ -d "$WORK_DIR/$CHAPTERS_DIR" ] || mkdir -p $WORK_DIR/$CHAPTERS_DIR
  python $SCRIPT_BASE_PATH/split_into_chapters.py "$WORK_DIR/$CORPUS_FILENAME" "$WORK_DIR/$CHAPTERS_DIR"
  total_chapters=$(ls $WORK_DIR/$CHAPTERS_DIR | wc -l)
  echo "Split corpus into $total_chapters chapters \n"
}

prepare_json_resources() {
  echo "2. Preparing resource JSON objects"

  PYTHONPATH=~/sandbox/c2dh/c2dh-nerd:~/sandbox/c2dh/projects_code/hg-nerd-worker python \
    -m hg_nerd_worker \
    --path $WORK_DIR/$CHAPTERS_DIR \
    --outpath $WORK_DIR/$JSONS_FILENAME \
    --language en --skip-validation
  echo "Prepared resources in file $WORK_DIR/$JSONS_FILENAME \n"
}

prepare_neo4j_csv_files() {
  echo "3. Preparing Neo4j CSV files"

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
  echo "4. Creating Neo4j database"
  [ -d "$WORK_DIR/$DB_DIR" ] || mkdir -p $WORK_DIR/$DB_DIR
  $SCRIPT_BASE_PATH/../tools/load-csv-into-db.sh $WORK_DIR/$CSV_DIR $WORK_DIR/$DB_DIR
  echo "Prepared Neo4j database: $WORK_DIR/$DB_DIR \n"
}

download_corpus
split_corpus_into_chapters
prepare_json_resources
prepare_neo4j_csv_files
prepare_neo4j_db
