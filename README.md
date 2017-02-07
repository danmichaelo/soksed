
Install dependencies:

	$ composer install
	$ npm install
	$ bower install

Start development server:

	$ ./serve.sh &
	$ gulp

Data is imported from [realfagstermer/realfagstermer](https://github.com/realfagstermer/realfagstermer)
and exported to [realfagstermer/prosjekt-nynorsk](https://github.com/realfagstermer/prosjekt-nynorsk)
every night. Current crontab:

	PATH=PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/opt/fuseki
	RUBYENV=/home/marco/.rvm/environments/ruby-2.2.0
	0 1 * * * /data/trans/export/export.sh 2>&1 
	0 2 * * * /data/trans/import/update-fuseki.sh 2>&1 


Production build:

	$ gulp build

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

## Categories

To add the default categories:

```
curl http://localhost:3030/ds/update --data-urlencode "update@-" << EOF
PREFIX e: <http://data.ub.uio.no/entity/>
PREFIX uoc: <http://trans.biblionaut.net/class#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

INSERT DATA
{ GRAPH <http://trans.biblionaut.net/graph/trans> {

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

DELETE WHERE { GRAPH <http://trans.biblionaut.net/graph/trans> {
	?x a uoc:Category ;
		rdfs:label ?lab .
}}

EOF
```

## Export

cd export && ./export.sh


## Log

```
<http://trans.biblionaut.net/data/log/0000-0000-0000-0000> a uoc:Event ;
	dct:date "2016-01-01T00:00:00"^xsd:datetime ;
	uop:user <http://trans.biblionaut.net/data/users/1> ;
	uop:concept <http://data.ub.uio.no/realfagstermer/c123> ;
	uop:data "free text" .
```


