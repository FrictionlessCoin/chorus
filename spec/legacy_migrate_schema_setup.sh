#!/bin/bash

if [ $# -eq 0 ] ; then
    echo 'USAGE: chorus_migrate.sh PATH/TO/CHORUS21_DUMP.sql'
    exit 0
fi

database=$2
[[ -z "$database" ]] && database=production

dropdb -p 8543 chorus_tmp_migrate
psql -p 8543 $database -c 'drop if exists schema legacy_migrate cascade' 2> /dev/null

# TODO: why do we do this twice?
dropdb -p 8543 chorus_tmp_migrate
psql -p 8543 $database -c 'drop if exists schema legacy_migrate cascade' 2> /dev/null

# Create a temporary database so we can namespace legacy tables into their own schema
createdb -p 8543 chorus_tmp_migrate
psql -p 8543 chorus_tmp_migrate < $1 > /dev/null
psql -p 8543 chorus_tmp_migrate -c 'alter schema public rename to legacy_migrate'

# Pipe the output of pg_dump into the chorus_rails db, namespaced under legacy_migrate
pg_dump --ignore-version -p 8543 chorus_tmp_migrate | psql -p 8543 $database > /dev/null