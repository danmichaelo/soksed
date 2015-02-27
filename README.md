
Start Fuseki

	FUSEKI_DIR=/path/to/fuseki
	$FUSEKI_DIR/bin/fuseki-server --config $FUSEKI_DIR/fuseki.ttl

Load data into Fuseki

    ./import/update-fuseki.sh

Start web server

	php -S localhost:8002

and gulp

	gulp
