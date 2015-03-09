#!/bin/bash
#
# This script puts data to Fuseki if new commits are found in the remote git repo.
#
# Set RUBYENV to the value returned from `rvm env --path` to make the script find
# the RVM environment when run as a cronjob.
#
# Example crontab:
#
#  RUBYENV=/usr/local/rvm/environments/ruby-1.9.3-p551@global
#  10 * * * * /path/to/update-fuseki.sh

cd "$( dirname "${BASH_SOURCE[0]}" )"

test -z "$GRAPH" && GRAPH=http://trans.biblionaut.net/graph/real
test -z "$FUSEKIDIR" && FUSEKIDIR=/opt/fuseki
test -n "$RUBYENV" && source "$RUBYENV"

echo "FUSEKIDIR: $FUSEKIDIR"
echo "GRAPH: $GRAPH"

cd realfagstermer

echo "Fetching from git origin"
git fetch origin
if [ $? != 0 ]; then
    echo
    echo -----------------------------------------------------------
    echo ERROR:
    echo Could not fetch from git origin 
    echo -----------------------------------------------------------
    exit 1
fi

if [ -z "$(git log HEAD..origin/master --oneline)" ]; then
    # No changes
    echo "No changes, exiting"
    # exit 0
fi

git pull --force

cd ..

echo "Converting to SKOS-XL"
python skos-to-xl.py

echo "Pushing data to Fuseki"
$FUSEKIDIR/s-put http://localhost:3030/ds/data $GRAPH realfagstermer-xl.ttl
