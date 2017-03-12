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
#  cd /path/to/export && ./export.sh >> export.log 2>&1
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

test -z "$GRAPH" && GRAPH=http://trans.biblionaut.net/graph/trans2

echo
date
echo "SCRIPTDIR: $SCRIPTDIR"
echo "GRAPH: $GRAPH"

LOCAL_REPO=prosjekt-kinderegg

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
    try git clone "git@github.com:realfagstermer/prosjekt-kinderegg.git" "$LOCAL_REPO"
fi

#==========================================================
# Produce RDF
#==========================================================

echo "Get data from Fuseki"

try curl -s http://localhost:3030/ds/query --data-urlencode "query@-" << EOF >| current.ttl

PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX uoc: <http://trans.biblionaut.net/class#>
PREFIX g: <http://trans.biblionaut.net/graph/>

CONSTRUCT {
  ?entity a ?cls .
  ?entity ?prop ?value .
}
WHERE {
  GRAPH ?g {
    ?entity a ?cls .
    FILTER ( ?cls IN (skos:Concept, xl:Label, uoc:Category ))
  }
  {
    GRAPH g:meta {
      ?entity a uoc:Category ;
        ?prop ?value .
    }
  } UNION {
    GRAPH g:trans2 {
      ?entity ?prop ?value .
    }
  }
}

EOF

# curl -X GET -o current.ttl -s -H "Content-Type: text/turtle" -G --data-urlencode "graph=$GRAPH" "http://localhost:3030/ds/get"
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

#try git reset --hard origin/master

for file in data-skosxl.ttl stats.csv sonja.txt; do
	mv -f "../$file" "./"
	git add "$file"
done

dt=$(tail stats.csv -n 1 | awk -F',' '{print $1}')
tc=$(tail stats.csv -n 1 | awk -F',' '{print $4}')
pc=$(tail stats.csv -n 1 | awk -F',' '{print $2}')

git commit -m "$dt: $tc concepts processed, $pc proofread"
git push origin master

