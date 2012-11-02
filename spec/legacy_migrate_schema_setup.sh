#!/bin/bash

if [ $# -eq 0 ] ; then
    echo 'USAGE: chorus_migrate.sh PATH/TO/CHORUS21_DUMP.sql'
    exit 0
fi

test "$RAILS_ENV" = "" && RAILS_ENV=production

PORT=`$RUBY script/get_db_port.rb`

dropdb -p $PORT chorus_tmp_migrate
psql -p $PORT chorus_rails_$RAILS_ENV -c 'drop schema legacy_migrate cascade' 2> /dev/null

# Create a temporary database so we can namespace legacy tables into their own schema
createdb -p $PORT chorus_tmp_migrate
psql -p $PORT chorus_tmp_migrate < $1 > /dev/null
psql -p $PORT chorus_tmp_migrate -c 'alter schema public rename to legacy_migrate'

# Pipe the output of pg_dump into the chorus_rails db, namespaced under legacy_migrate
pg_dump --ignore-version -p $PORT chorus_tmp_migrate | psql -p $PORT chorus_rails_$RAILS_ENV > /dev/null
