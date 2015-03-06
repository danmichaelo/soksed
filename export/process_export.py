from rdflib import Graph, Literal
from rdflib.namespace import SKOS, Namespace
import json

XL = Namespace('http://www.w3.org/2008/05/skos-xl#')
g = Graph()
g.load('vocab.ttl', format='turtle')
g.load('current.ttl', format='turtle')
g.serialize('data-skosxl.ttl', format='turtle')

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

# Write data-verified.ttl

verified = Graph()
verified.bind('skos', SKOS)
for tr in g.query(q % ('EXISTS')):
    verified.add(tr)

verified.serialize('data-verified.ttl', format='turtle')

# Write data-unverified.ttl

unverified = Graph()
unverified.bind('skos', SKOS)
for tr in g.query(q % ('NOT EXISTS')):
    unverified.add(tr)

unverified.serialize('data-unverified.ttl', format='turtle')

# Write status.json

status = {
    'verified_terms': len([x for x in verified.triples_choices((None, [SKOS.prefLabel, SKOS.altLabel], None))]),
    'unverified_terms': len([x for x in unverified.triples_choices((None, [SKOS.prefLabel, SKOS.altLabel], None))])
}
json.dump(status, open('status.json', 'w'), indent=2)

# Write sonja.txt

lines = []
for tr in verified.triples_choices((None, [SKOS.prefLabel, SKOS.altLabel], None)):
    local_id = tr[0].replace('http://data.ub.uio.no/realfagstermer/c', 'REAL')
    lines.append(u'{}\t{}\t{}\n'.format(local_id, g.compute_qname(tr[1])[2], tr[2].value))

with open('sonja.txt', 'w') as sonja:
    for line in sorted(lines):
        sonja.write(line.encode('utf-8'))
