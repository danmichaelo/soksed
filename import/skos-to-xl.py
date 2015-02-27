import os
import sys
import re
import sys
from rdflib.namespace import OWL, RDF, DC, DCTERMS, FOAF, XSD, URIRef, Namespace, SKOS
from rdflib.graph import Graph, ConjunctiveGraph, Dataset, Literal
from rdflib.plugins.serializers.turtle import RecursiveSerializer, TurtleSerializer

import logging
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter('[%(asctime)s %(levelname)s] %(message)s')
console_handler = logging.StreamHandler(stream=sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

q = re.compile(r'http://data.ub.uio.no/realfagstermer/([0-9]+)')
with open('realfagstermer/realfagstermer.ttl', 'r') as infile:
    with open('tmp.ttl', 'w') as outfile:
        outfile.write(q.sub('http://data.ub.uio.no/realfagstermer/c\\1', infile.read()))

uribase = 'http://trans.biblionaut.net/terms/t'
XL = Namespace('http://www.w3.org/2008/05/skos-xl#')

g = Graph()
g.bind('xl', XL)
logger.info('Load realfagstermer/realfagstermer.ttl')
g.load('tmp.ttl', format='turtle')

logger.info('Process graph')
idm = re.compile('^http://data.ub.uio.no/realfagstermer/c([0-9]+)$')
for ct in g.triples((None, RDF.type, SKOS.Concept)):
    concept = ct[0]
    m = idm.match(concept)
    if m is None:
        logger.error('Found unknown URI: %s', concept)
        sys.exit(1)
    id = m.group(1)
    labelbase = ''.join([uribase, id])
    n = 1
    for lt in g.triples_choices((concept, [SKOS.prefLabel, SKOS.altLabel], None)):
        lurl = URIRef('-'.join([labelbase, str(n)]))
        n += 1
        g.add((lurl, RDF.type, XL.Label))
        g.add((lurl, XL.literalForm, lt[2]))
        if lt[1] == SKOS.prefLabel:
            g.add((concept, XL.prefLabel, lurl))
        elif lt[1] == SKOS.altLabel:
            g.add((concept, XL.altLabel, lurl))

g.update("""
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

DELETE WHERE { ?concept skos:prefLabel ?labelString . }
""")

g.update("""
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

DELETE WHERE { ?concept skos:altLabel  ?labelString . }
""")

logger.info('Write realfagstermer-xl.ttl')
s = TurtleSerializer(g)
s.topClasses = [SKOS.ConceptScheme, SKOS.Concept]  # These will appear first in the file
s.serialize(open('realfagstermer-xl.ttl', 'w'))

logger.info('Great success')
