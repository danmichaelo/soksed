#!/bin/bash
#
# Starts a local development server

# Kill all background jobs on exit
trap 'kill $(jobs -p)' EXIT

# Start Fuseki using in-memory DB in background
fuseki-server --config fuseki-dev.ttl &
sleep 3
# Import data
./import/update-fuseki.sh

echo -----------------------------------
echo Fuseki listening on localhost:3030
echo PHP listening on localhost:8002
echo -----------------------------------

# Start PHP
cd public
php -S localhost:8002

# Start Gulp
# gulp

