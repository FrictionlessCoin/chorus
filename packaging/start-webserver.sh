#!/usr/bin/env bash
bin=`readlink "$0"`
if [ "$bin" == "" ]; then
 bin=$0
fi
bin=`dirname "$bin"`
bin=`cd "$bin"; pwd`

if [ -d $bin/current/packaging/ ]; then
    bin=$bin/current/packaging
fi

. "$bin"/chorus-config.sh

# start nginx and the application server
# in development, start mizuno in foreground
# in production, start jetty in background

STARTING="web server"
depends_on postgres solr

# If NGINX is already running
if ( test -f $NGINX_PID_FILE ) && ( kill -0 `cat $NGINX_PID_FILE` > /dev/null 2>&1 ); then
    log "nginx already running as process `cat $NGINX_PID_FILE`."
else
    log "Writing nginx config..."
    $RUBY vendor/nginx/generate_nginx_conf.rb
    cd $CHORUS_HOME/vendor/nginx/nginx_dist/

    ./$NGINX
    wait_for_start $NGINX_PID_FILE
    log "nginx started as pid `cat $NGINX_PID_FILE`"
fi

cd $CHORUS_HOME

case $RAILS_ENV in
    development )

        # If Mizuno is already running
        if ( test -f $MIZUNO_PID_FILE ) && ( kill -0 `cat $MIZUNO_PID_FILE` > /dev/null 2>&1 ); then
            log "Mizuno already running as process `cat $MIZUNO_PID_FILE`."
        else
            log "starting mizuno on port 8081..."
            if bundle exec mizuno -p 8081 --threads 10 -D --pidfile $MIZUNO_PID_FILE; then
                wait_for_start $MIZUNO_PID_FILE
            fi
        fi
        ;;
    * )
        log "starting jetty..."
        cd $CHORUS_HOME/vendor/jetty/
        JETTY_PID=$JETTY_PID_FILE RAILS_ENV=$RAILS_ENV ./jetty-init start &>/dev/null &
        cd $CHORUS_HOME
        wait_for_start $JETTY_PID_FILE
        ;;
esac
