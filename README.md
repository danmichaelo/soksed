
Start development server:

	./serve.sh &
	gulp

Data is imported from [realfagstermer/realfagstermer](https://github.com/realfagstermer/realfagstermer)
and exported to [realfagstermer/prosjekt-nynorsk](https://github.com/realfagstermer/prosjekt-nynorsk)
every night. Current crontab:

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


