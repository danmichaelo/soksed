#!/bin/bash
#
# This script puts data to Fuseki if new commits are found in the remote git repo.
#
# Set RUBYENV to the value returned from `rvm env --path` to make the script find
# the RVM environment when run as a cronjob.
#
# Example crontab:
#
#  PATH=PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/opt/fuseki/bin
#  RUBYENV=/usr/local/rvm/environments/ruby-1.9.3-p551@global
#  10 * * * * /path/to/update-fuseki.sh

die() {
    echo >&2
    echo >&2 -----------------------------------------------------------
    echo >&2 ERROR:
    echo >&2 $*
    echo >&2 -----------------------------------------------------------
    exit 1
}

try() { "$@" || die "$0: Cannot $*"; }

try cd "$( dirname "${BASH_SOURCE[0]}" )"

test -z "$GRAPH" && GRAPH=http://trans.biblionaut.net/graph/real
test -n "$RUBYENV" && source "$RUBYENV"

hash s-put 2>/dev/null || die "[update-fuseki.sh] Could not find the 's-put' command. Please make sure the Fuseki dir is part of your path!"

try cd realfagstermer

echo "[update-fuseki.sh] Fetching from git origin"
git fetch origin > /dev/null 2>&1 && {

	if [ -z "$(git log HEAD..origin/master --oneline)" ]; then
	    # No changes
	    echo "[update-fuseki.sh] No changes, exiting"
	    # exit 0
	fi

	try git reset --hard origin/master

} || {
	echo "[update-fuseki.sh] Failed to git fetch! We might be offline."
}

cd ..

echo "[update-fuseki.sh] Converting to SKOS-XL using skos-to-xl.py"
try python skos-to-xl.py

echo "[update-fuseki.sh] Pushing data to Fuseki"
try s-put http://localhost:3030/ds/data $GRAPH realfagstermer-xl.ttl
echo "[update-fuseki.sh] Successfully pushed data to <$GRAPH>"
