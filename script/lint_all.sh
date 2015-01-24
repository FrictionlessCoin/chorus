#!/bin/bash

if ! command -v jshint >/dev/null 2>&1; then
    echo 'jshint not found. Please install jshint by running "npm -g install jshint".  Aborting lint!'
    exit 1
fi

echo 'Running jshint for all javascript files...'

jshint --config config/jshint.json app/assets/javascripts spec/javascripts

echo 'END -> Running jshint for all javascript files...'
