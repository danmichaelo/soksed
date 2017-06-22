
This is a not-extremely portable RDF/SKOS-XL vocabulary editor using SPARQL UPDATE
to store changes in a triple store. Instead of one editing
interface, it comes with multiple editing interfaces, where each interface is
optimized for carrying out one or a few simple tasks. An interface consists of
a config entry, a  HTML template plus some supporting code. Current interfaces:

* A "Translation to Nynorsk" view with input fields for entering terms
  (`skos:prefLabel`, `skos:altLabel`) in Nynorsk
  next to the non-editable Bokmål terms. 'Review' buttons for users with the
  'review' right.
* A view for categorizing concepts (`skos:member`) into a set of predefined
  categories, translation terms to English and mapping to Wikidata.

**State of this project**: The code quality is a little subpar since the editor
was made for a quite brief project that didn't need long term maintanability.
Especially, there's quite some configuration values, including namespaces,
hardcoded here in the code that should have been moved into a config file for
portability! If you have a project you would like to try out this editor with,
let me know and I might be able to assess if it could work or not,
and perhaps fix some portability issues.


Example data stored:

```turtle
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX real: <http://data.ub.uio.no/realfagstermer/>
PREFIX ubo: <http://data.ub.uio.no/onto#>
PREFIX users: <http://trans.biblionaut.net/data/users/>

real:c003200
	ubo:wikidataItem wd:Q83871 ;
	dct:modified "2017-02-07T22:52:25.432+00:00"^^xsd:dateTime ;
    skos:member <http://data.ub.uio.no/entity/37f033b8-c77e-4fef-bdef-273f9065265d> ;
    xl:prefLabel real:t11d168ec-ed88-11e6-b958-024290857007 ;
    xl:altLabel real:t1210dedc-ed88-11e6-abc1-024290857007 .

real:t1210dedc-ed88-11e6-abc1-024290857007
	a xl:Label ;
	dct:creator users:ed8973c8-c393-11e4-933b-f23c91890d47 ;
	dct:created "2017-02-07T23:52:15+01:00"^^xsd:dateTime ;
	dct:modified "2017-02-07T23:52:15+01:00"^^xsd:dateTime ;
    xl:literalForm "Benzos"@en .
```

## Setup

Install dependencies:

	$ composer install
	$ npm install
	$ bower install

Start development server:

	$ ./serve.sh &
	$ gulp

Production build:

	$ gulp build

Crontab for importing data from [realfagstermer/realfagstermer](https://github.com/realfagstermer/realfagstermer)
and exporting to [realfagstermer/prosjekt-nynorsk](https://github.com/realfagstermer/prosjekt-nynorsk):

	PATH=PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/opt/fuseki
	RUBYENV=/home/marco/.rvm/environments/ruby-2.2.0
	0 1 * * * /data/trans/export/export.sh 2>&1 
	0 2 * * * /data/trans/import/update-fuseki.sh 2>&1 

## Users

Everyone can self-register, but to edit you need to be granted
the "edit" and/or "review" permission. To grant permissions, run:

```bash
$ curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>

INSERT
{ GRAPH <http://trans.biblionaut.net/graph/users>
  { ?user ou:permission "edit", "review" }
} WHERE
{ GRAPH <http://trans.biblionaut.net/graph/users>
  {?user ou:username "danmichaelo@gmail.com" }
}
EOF
```

To remove permissions:

```bash
$ curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>

DELETE
{ GRAPH <http://trans.biblionaut.net/graph/users>
  { ?user ou:permission "edit", "review" }
} WHERE
{ GRAPH <http://trans.biblionaut.net/graph/users>
  {?user ou:username "danmichaelo@gmail.com" }
}
EOF
```

## Create stats table

```
CREATE TABLE `stats` (
  `id`  INTEGER PRIMARY KEY AUTOINCREMENT,
  `date`  TEXT NOT NULL,
  `metric` INTEGER NOT NULL,
  `value` INTEGER NOT NULL,
   UNIQUE (date, metric) ON CONFLICT REPLACE
);
```

## Categories

To add the default categories:

```
curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX uoc: <http://trans.biblionaut.net/class#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX e: <http://data.ub.uio.no/entity/>
PREFIX g: <http://trans.biblionaut.net/graph/>

INSERT DATA
{ GRAPH g:meta {

	e:4d8d8554-b5f9-43be-a21e-46d058a3ee1c a uoc:Category ;
		rdfs:label "Generelt"@nb .

	e:d5a885cd-56a0-4501-9c99-418db3fbcbdb a uoc:Category ;
		rdfs:label "Astro"@nb .

	e:c331c5e9-726c-4c55-9341-72d3e7874d6b a uoc:Category ;
		rdfs:label "Fysikk"@nb .

	e:8dce39ea-409f-4072-b25b-377a69bca0a3 a uoc:Category ;
		rdfs:label "Biologi"@nb .

	e:e31b973e-b1b4-4768-9d47-4151aa54fefd a uoc:Category ;
		rdfs:label "Geo"@nb .

	e:37f033b8-c77e-4fef-bdef-273f9065265d a uoc:Category ;
		rdfs:label "Farmasi"@nb .

	e:4d8d7781-2753-4d38-9ef9-de6c8cea4107 a uoc:Category ;
		rdfs:label "Kjemi"@nb .

	e:c0f08a3c-12ed-410a-b810-d8be5c48571b a uoc:Category ;
		rdfs:label "Informatikk"@nb .

	e:aa780674-ac5f-40b2-a5a6-7912901f6d5f a uoc:Category ;
		rdfs:label "Matematikk"@nb .

}}
EOF
```

To remove all categories:

```
curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX uoc: <http://trans.biblionaut.net/class#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX g: <http://trans.biblionaut.net/graph/>

DELETE WHERE {
  GRAPH g:meta {
  	?x a uoc:Category ;
		   rdfs:label ?lab .
  }
}

EOF
```

## Export

```
cd export && ./export.sh
```

Simple export:

```
GRAPH=http://trans.biblionaut.net/graph/trans2
curl -X GET -o export.ttl -s -H "Content-Type: text/turtle" -G --data-urlencode "graph=$GRAPH" "http://localhost:3030/ds/get"
```

## Log

```
<http://trans.biblionaut.net/data/log/0000-0000-0000-0000> a uoc:Event ;
	dct:date "2016-01-01T00:00:00"^xsd:datetime ;
	uop:user <http://trans.biblionaut.net/data/users/1> ;
	uop:concept <http://data.ub.uio.no/realfagstermer/c123> ;
	uop:data "free text" .
```

## Various SPARQL queries

List "nb" terms that have leaked into the trans graph:

```bash
$ curl http://localhost:3030/ds/query --data-urlencode "query@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX g: <http://trans.biblionaut.net/graph/>

SELECT ?label ?prop ?value
WHERE {
  GRAPH g:trans {
    ?label a xl:Label ;
   		xl:literalForm ?term .
   	{
   		{ ?label ?prop ?value .}
   		UNION
   		{ ?a ?b ?label . }
   	}
   	FILTER (langMatches(lang(?term), "nb"))
  }
}
EOF
```

... and delete them:

```bash
$ curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX g: <http://trans.biblionaut.net/graph/>

DELETE
{ GRAPH g:trans {
    ?a ?b ?label .
    ?label ?prop ?value .
  }
}
WHERE
{
  GRAPH g:trans {
    ?label a xl:Label ;
   		xl:literalForm ?term .
   	{
   		{ ?label ?prop ?value .}
   		UNION
   		{ ?a ?b ?label . }
   	}
   	FILTER (langMatches(lang(?term), "nb"))
  }
}
EOF
```

List mappings:

```
$ curl http://localhost:3030/ds/query --data-urlencode "query@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX g: <http://trans.biblionaut.net/graph/>
PREFIX ubo: <http://data.ub.uio.no/onto#>

SELECT ?c ?wd
WHERE {
  GRAPH g:trans2 {
    ?c ubo:wikidataItem ?wd .
  }
}
EOF
```

Move mappings to new graph:

```bash
$ curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX g: <http://trans.biblionaut.net/graph/>
PREFIX ubo: <http://data.ub.uio.no/onto#>

DELETE { GRAPH g:trans {
  ?c ubo:wikidataItem ?wd .
}}
INSERT { GRAPH g:trans2 {
  ?c ubo:wikidataItem ?wd .
}}
WHERE { GRAPH g:trans {
  ?c ubo:wikidataItem ?wd .
}}
EOF
```


List concepts with more than one mapping:

```
$ curl http://localhost:3030/ds/query --data-urlencode "query@-" << EOF
PREFIX ou: <http://trans.biblionaut.net/onto/user#>
PREFIX xl: <http://www.w3.org/2008/05/skos-xl#>
PREFIX g: <http://trans.biblionaut.net/graph/>
PREFIX ubo: <http://data.ub.uio.no/onto#>

SELECT ?c ?wd
WHERE {
  GRAPH g:trans2 {
    ?c ubo:wikidataItem ?wd ;
    	ubo:wikidataItem ?wd2 .
    FILTER(?wd < ?wd2)
  }
}
EOF
```
