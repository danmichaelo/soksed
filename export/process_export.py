# :set sw=4 ts=4 noexpandtab
from __future__ import print_function
from datetime import datetime
from collections import OrderedDict
import json
import sqlite3

from rdflib import Graph, Literal
from rdflib.namespace import SKOS, Namespace
import pandas as pd
import plotly.plotly as py
import plotly.graph_objs as go


XL = Namespace('http://www.w3.org/2008/05/skos-xl#')
g = Graph()
g.load('vocab.ttl', format='turtle')
g.load('current.ttl', format='turtle')
g.serialize('data-skosxl.ttl', format='turtle')

g2 = Graph()
g2.load('current_verified.ttl', format='turtle')


def stats():

    prefixes = """
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
    PREFIX uoc: <http://trans.biblionaut.net/class#>
    PREFIX uo: <http://trans.biblionaut.net/onto/user#>
    PREFIX g: <http://trans.biblionaut.net/graph/>
    """

    def get_single_value(query):
        return list(g.query(prefixes + query))[0][0].value

    metrics = OrderedDict()
    metrics['total_concepts'] = get_single_value("""
    SELECT
      (COUNT(DISTINCT ?entity) as ?count)
    WHERE {
      ?entity xl:prefLabel ?label .
    }
    """)

    metrics['proofread_concepts'] = get_single_value("""
    SELECT
      (COUNT(DISTINCT ?entity) as ?count)
    WHERE {
      ?entity xl:prefLabel ?label .
      ?label uo:proofread ?pdate .
    }
    """)

    metrics['total_terms'] = get_single_value("""
    SELECT
      (COUNT(DISTINCT ?label) as ?count)
    WHERE {
      ?entity (xl:prefLabel|xl:altLabel) ?label .
    }
    """)

    metrics['proofread_terms'] = get_single_value("""
    SELECT
      (COUNT(DISTINCT ?label) as ?count)
    WHERE {
      ?entity (xl:prefLabel|xl:altLabel) ?label .
      ?label uo:proofread ?date .
    }
    """)

    metrics['wikidata_mappings'] = get_single_value("""
    SELECT
      (COUNT(DISTINCT ?item) as ?count)
    WHERE {
      ?item ubo:wikidataItem ?wd .
    }
    """)

    metrics['categorized'] = get_single_value("""
    SELECT
      (COUNT(DISTINCT ?item) as ?count)
    WHERE {
      ?item skos:member ?cat .
    }
    """)

    db = sqlite3.connect('stats.db')
    cur = db.cursor()

    # Insert new data
    for metric, value in metrics.items():
        now = datetime.now().strftime('%Y-%m-%d')
        cur.execute('INSERT INTO stats (date, metric, value) VALUES (?,?,?)', (now, metric, value))

    db.commit()

    # Export as CSV
    cur.execute('SELECT date, metric, value FROM stats ORDER BY date, metric')
    rows = OrderedDict()
    for row in cur:
        if row[0] not in rows:
            rows[row[0]] = OrderedDict()
        rows[row[0]].update({row[1]: row[2]})

    df = pd.DataFrame.from_dict(rows, orient='index')
    df.index.name = 'date'
    df.to_csv('stats.csv')  # , na_rep='0')

stats()

# -----------------------------------------------------------------------------

verifiedLabels = Graph()
verifiedLabels.bind('skos', SKOS)
verifiedLabelsJson = {}
uris = set()
for tr in g2:
    if (tr[1] == SKOS.prefLabel or tr[1] == SKOS.altLabel) and tr[2].language == 'en':
        verifiedLabels.add(tr)
        uris.add(tr[0])
        local_id = tr[0].replace('http://data.ub.uio.no/realfagstermer/c', 'REAL')
        if local_id not in verifiedLabelsJson:
            verifiedLabelsJson[local_id] = {'prefLabel': None, 'altLabel': []}

        if tr[1] == SKOS.prefLabel:
            verifiedLabelsJson[local_id]['prefLabel'] = tr[2].value
        elif tr[1] == SKOS.altLabel:
            verifiedLabelsJson[local_id]['altLabel'].append(tr[2].value)

verifiedLabels.serialize('verified_labels.ttl', format='turtle')

json.dump(verifiedLabelsJson, open('sonja_todo.json', 'w'), indent=2)

lock_stmts = ['  <%s> uo:locked true .' % uri for uri in uris]


print('Found %d new uris' % len(uris))

# Confirm

lock_query = """PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX uo: <http://trans.biblionaut.net/onto/user#>
PREFIX ubo: <http://data.ub.uio.no/onto#>

INSERT DATA
{
  GRAPH <http://trans.biblionaut.net/graph/trans2>
  {
    %s
  }
}
""" % '\n'.join(lock_stmts)

with open('lock_query.rq', 'w') as f:
    f.write(lock_query)
