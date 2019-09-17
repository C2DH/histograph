#!/bin/sh

SCRIPT_PATH=$0
CSV_ROOT=$1
DB_ROOT=$2
TAG=$3
DOCKER_EXEC=`which docker`

print_help_and_exit() {
  if [ -n "$1" ]; then
    echo "Error: $1"
  fi
  echo "Usage: $SCRIPT_PATH <CSV Files Root Directory> <DB Root Directory> <Tag>"
  exit 1
}

[ -d "$CSV_ROOT" ] || print_help_and_exit "CSV directory does not exist"
[ -d "$DB_ROOT" ] || print_help_and_exit "DB directory does not exist"
[ -n "$TAG" ] || print_help_and_exit "Tag must be provided"
[ -n "$DOCKER_EXEC" ] || print_help_and_exit "Docker executable not found"

CSV_ROOT=`realpath $CSV_ROOT`
DB_ROOT=`realpath $DB_ROOT`

echo "Reading file from '$CSV_ROOT' and writing to database in '$DB_ROOT'"

$DOCKER_EXEC \
  run -it --rm \
  --volume=$DB_ROOT:/data \
  --volume=$CSV_ROOT:/csvs \
  neo4j \
  neo4j-admin import \
  --nodes "/csvs/headers/entity.csv,/csvs/entity.csv" \
  --nodes "/csvs/headers/resource.csv,/csvs/resource/$TAG.csv" \
  --nodes "/csvs/headers/version.csv,/csvs/version/$TAG.csv" \
  --relationships "/csvs/headers/appears_in.csv,/csvs/appears_in/$TAG.csv" \
  --relationships "/csvs/headers/describes.csv,/csvs/describes/$TAG.csv" \
  --id-type=INTEGER \
  --multiline-fields=true

