#!/bin/bash
#
# This script 
# - gets data from Fuseki
# - converts from SKOS-XL to SKOS 
#  (one file for verified terms, one for unverified)
# - and pushes original and converted data to Git.
#
# Set RUBYENV to the value returned from `rvm env --path` to make the script find
# the RVM environment when run as a cronjob.
#
# Example crontab:
#
#  PATH=PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/opt/fuseki/bin
#  RUBYENV=/usr/local/rvm/environments/ruby-1.9.3-p551@global
#  10 * * * *  /path/to/update-fuseki.sh
#
die() {
    echo >&2
    echo >&2 -----------------------------------------------------------
    echo >&2 ERROR:
    echo >&2 $*
    echo >&2 -----------------------------------------------------------
    exit 1
}

try() { "$@" || die "$0: Cannot $*"; }

SCRIPTDIR="$( cd $(dirname $0) ; pwd -P )"
try cd "$SCRIPTDIR"

test -z "$GRAPH" && GRAPH=http://trans.biblionaut.net/graph/trans
test -n "$RUBYENV" && source "$RUBYENV"

echo "SCRIPTDIR: $SCRIPTDIR"
echo "GRAPH: $GRAPH"

LOCAL_REPO=prosjekt-nynorsk

#==========================================================
# Setup environment 
#==========================================================

cd ..

function install_deps
{
    echo Installing/updating dependencies
    pip install -U rdflib requests
    if [ $? != 0 ]; then
        die Could not install dependencies using pip
    fi
}

if [ ! -f ENV/bin/activate ]; then

    echo
    echo ----------------------------------------------------------------
    echo Virtualenv not found. Trying to set up
    echo ----------------------------------------------------------------
    echo
    virtualenv ENV
    if [ $? != 0 ]; then
        die Virtualenv exited with code $xc. You may need to install or configure it.
    fi

    echo Activating virtualenv
    . ENV/bin/activate

    install_deps

else

    echo Activating virtualenv
    . ENV/bin/activate

fi

cd "$SCRIPTDIR"

#==========================================================
# Check repo, clone if necessary
#==========================================================

if [ ! -d "$LOCAL_REPO" ]; then
    try git clone "git@github.com:realfagstermer/prosjekt-nynorsk.git" "$LOCAL_REPO"
fi

#==========================================================
# Produce RDF
#==========================================================

echo "Get data from Fuseki"
s-get http://localhost:3030/ds/get $GRAPH > current.ttl
if [ $? != 0 ]; then
    die "Could not fetch data from Fuseki using 's-get'. Is it in your PATH?"
fi

if cmp -s "current.ttl" "prev.ttl"; then
	echo "No changes, exiting"
	exit 0
fi

echo "Processing"
try python process_export.py

mv -f current.ttl prev.ttl

#==========================================================
# Commit changes to git repo
#==========================================================

try cd "$LOCAL_REPO"
git config user.name "ubo-bot"
git config user.email "danmichaelo+ubobot@gmail.com"

try git reset --hard origin/master

for file in data-skosxl.ttl data-unverified.ttl data-verified.ttl status.json sonja.txt; do
	mv -f "../$file" "./"
	git add "$file"
done

git commit -m "Update data"
git push
