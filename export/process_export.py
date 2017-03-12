# :set sw=4 ts=4 noexpandtab
from datetime import datetime
from collections import OrderedDict
import json
import sqlite3

from rdflib import Graph, Literal
from rdflib.namespace import SKOS, Namespace
import pandas as pd


XL = Namespace('http://www.w3.org/2008/05/skos-xl#')
g = Graph()
g.load('vocab.ttl', format='turtle')
g.load('current.ttl', format='turtle')
g.serialize('data-skosxl.ttl', format='turtle')

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
df.to_csv('stats.csv')

# Query for generating SKOS from SKOS-XL
q = """
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX uo: <http://trans.biblionaut.net/onto/user#>

CONSTRUCT
{ ?concept ?skosProp ?labelValue }
WHERE
{
  ?concept ?xlProp ?label .
  ?label xl:literalForm ?labelValue .
  FILTER %s { ?label uo:proofread ?pdate }
  BIND(
    IF(?xlProp = xl:prefLabel,
      skos:prefLabel,
      IF(?xlProp = xl:altLabel,
        skos:altLabel,
        skos:hiddenLabel
      )
    ) AS ?skosProp
  )
}
"""

# # Write data-verified.ttl

verified = Graph()
verified.bind('skos', SKOS)
for tr in g.query(q % ('EXISTS')):
    verified.add(tr)

# verified.serialize('data-verified.ttl', format='turtle')

# # Write data-unverified.ttl

# unverified = Graph()
# unverified.bind('skos', SKOS)
# for tr in g.query(q % ('NOT EXISTS')):
#     unverified.add(tr)

# unverified.serialize('data-unverified.ttl', format='turtle')

# # Write status.json

# status = {
#     'verified_terms': len([x for x in verified.triples_choices((None, [SKOS.prefLabel, SKOS.altLabel], None))]),
#     'unverified_terms': len([x for x in unverified.triples_choices((None, [SKOS.prefLabel, SKOS.altLabel], None))])
# }
# json.dump(status, open('status.json', 'w'), indent=2)

# Write sonja.txt

lines = []
for tr in verified.triples_choices((None, [SKOS.prefLabel, SKOS.altLabel], None)):
    local_id = tr[0].replace('http://data.ub.uio.no/realfagstermer/c', 'REAL')
    lines.append(u'{}\t{}\t{}\n'.format(local_id, g.compute_qname(tr[1])[2], tr[2].value))

with open('sonja.txt', 'w') as sonja:
    for line in sorted(lines):
        sonja.write(line.encode('utf-8'))
