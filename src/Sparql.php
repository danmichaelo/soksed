<?php namespace Scriptotek\RtWp;

use EasyRdf\RdfNamespace;
use EasyRdf\Sparql\Client as SparqlClient;
use EasyRdf\Graph;
use EasyRdf\Resource;
use EasyRdf\Literal;
use EasyRdf\Literal\DateTime as DateTimeLiteral;
use EasyRdf\Literal\Boolean as BooleanLiteral;
use Carbon\Carbon;
use Ramsey\Uuid\Uuid;

error_reporting(E_ALL | E_STRICT);
ini_set('display_errors', '1');

RdfNamespace::set('owl', 'http://www.w3.org/2002/07/owl#');
RdfNamespace::set('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
RdfNamespace::set('xsd', 'http://www.w3.org/2001/XMLSchema#');
RdfNamespace::set('skos', 'http://www.w3.org/2004/02/skos/core#');
RdfNamespace::set('xl', 'http://www.w3.org/2008/05/skos-xl#');
RdfNamespace::set('mads', 'http://www.loc.gov/mads/rdf/v1#');
RdfNamespace::set('dct', 'http://purl.org/dc/terms/');
RdfNamespace::set('ubo', 'http://data.ub.uio.no/onto#');


class Sparql extends Base
{

	// Fields to be transformed from DateTimes to strings
	protected $dateFields = array('created', 'modified', 'proofread');
	protected $simpleFields = array('libCode');

	protected $logger;
	protected $client;
	protected $updateClient;
	protected $user;

	protected $uriBase = 'http://trans.biblionaut.net';

	/* URI for the graph holding user data. */
	protected $userGraphUri;

	/* URI for the graph holding locally editable data.
	   (Data from any other graph will be treated as read only) */
	protected $localGraphUri;

	protected $queryEndpoint = 'http://localhost:3030/ds/sparql';

	protected $updateEndpoint = 'http://localhost:3030/ds/update';

	public function __construct($logger=null)
	{
		$this->logger = is_null($logger) ? new Logger : $logger;
		$this->client = new SparqlClient($this->queryEndpoint);
		$this->updateClient = new SparqlClient($this->updateEndpoint);

		$this->localGraphUri = $this->uriBase . '/graph/trans';
		$this->userGraphUri = $this->uriBase . '/graph/users';
		$this->eventsGraphUri = $this->uriBase . '/graph/events';
		RdfNamespace::set('uo', $this->uriBase . '/onto/user#');
		RdfNamespace::set('user', 'http://soksed.biblionaut.net/users/');
		RdfNamespace::set('log', $this->uriBase .'/data/log/');
		RdfNamespace::set('uop', $this->uriBase . '/prop#');
        RdfNamespace::set('uoc', $this->uriBase . '/class#');
		RdfNamespace::set('g', $this->uriBase . '/graph/');

        $this->catCache = $this->getCats();
	}

	public function setLocalGraphUri($uri)
	{
		$this->localGraphUri = $uri;
	}

	public function getUriBase()
	{
		return $this->uriBase;
	}

	protected function bind($query, $parameters = [])
	{
		$query = preg_replace_callback('/<%([A-Za-z0-9]+)%>/', function($matches) use ($parameters) {
			if (!isset($parameters[$matches[1]])) {
				die('Sparql::bind - Could not bind parameter "' . $matches[1] . '", no value supplied!');
			}
			// Sanitize URIRef - TODO: Use some standardized method
			$value = str_replace(['<', '>'], ['&lt;', '&gt;'], $parameters[$matches[1]]);
			return '<' . $value . '>';

		}, $query);

		$query = preg_replace_callback('/"%([A-Za-z0-9]+)%"/', function($matches) use ($parameters) {
			if (!isset($parameters[$matches[1]])) {
				die('Sparql::bind - Could not bind parameter "' . $matches[1] . '", no value supplied!');
			}
			// Sanitize Literal - TODO: Use some standardized method
			$value = addslashes( $parameters[$matches[1]] );
			return '"' . $value . '"';

		}, $query);

		return $query;
	}

	protected function query($query, $parameters = [])
	{
		$query = $this->bind($query, $parameters);
		# print $query;
		try {
			return $this->client->query($query);
		} catch (\EasyRdf\Http\Exception $e) {
			$this->logger->error("SPARQL QUERY failed: " . $e->getBody() . " --- Query: " . $query . " --- Trace: " . $e->getTraceAsString());
			die('The query could not be processed. Details has been logged.');
		}
	}

	protected function update($query, $parameters = [])
	{
		$query = $this->bind($query, $parameters);
		try {
			$response = $this->updateClient->update($query);
		} catch (\EasyRdf\Http\Exception $e) {
			$this->logger->error("SPARQL UPDATE failed: " . $e->getBody() . " --- Query: " . $query . " --- Trace: " . $e->getTraceAsString());
			die('Sparql update failed. Details has been logged.');
		}
		return $response->isSuccessful();
	}

	public function getConcepts($cursor, $filters)
	{
		$limit = 1500;

		$filterQueries = [];
		$parameters = [];
		$graph = null;
		$conceptTypes = ['ubo:Topic', 'ubo:Place', 'ubo:Time'];

		if (!empty($filters)) {
			$filters = explode(',', $filters);

			for ($i=count($filters)-1; $i >= 0; $i--) { 
				if (preg_match('/^graph:([a-z]+)/', $filters[$i], $m)) {
					$graph = $m[1];
					array_splice($filters, $i, 1);
				}
			}

			$parameters['localGraphUri'] = $this->localGraphUri;

			if ($graph == 'local') {
				$graph = '<%localGraphUri%>';
			} else {
				$graph = null;
			}

			$n = 1;

			foreach ($filters as $filter) {
				if (empty($filter)) continue;
				$n++;

				if (preg_match('/^(-)?exists:prefLabel@([a-z]{2,3})/', $filter, $m)) {
					$op = ($m[1] == '-') ? 'NOT EXISTS' : 'EXISTS';
					$langcode = $m[2];
					$filterQuery = "
						?concept xl:prefLabel ?labelNode$n . 
						?labelNode$n xl:literalForm ?label$n .
						FILTER(langMatches(lang(?label$n), \"%lang$n%\"))
					";
					$parameters["lang$n"] = $langcode;
					$filterQuery = 'GRAPH ' . ($graph ?: "?graph$n") . ' { ' . $filterQuery . '}';
					$filterQueries[] = 'FILTER ' . $op . ' { ' . $filterQuery . '}';


				} elseif (preg_match('/^type:([a-z]+)/i', $filter, $m)) {
					$conceptTypes = ['ubo:' . ucfirst($m[1])];

				} elseif (preg_match('/^has:unverified/', $filter, $m)) {
					$filterQuery = "
						?concept (xl:prefLabel|xl:altLabel) ?labelNode$n .
						?labelNode$n dct:created ?created .
						FILTER NOT EXISTS { ?labelNode$n uo:proofread ?proofread . }
					";
					$filterQuery = 'GRAPH <%localGraphUri%> { ' . $filterQuery . '}';
					$filterQueries[] = 'FILTER EXISTS { ' . $filterQuery . '}';

				} elseif (preg_match('/^has:editorialNote/', $filter, $m)) {
					$filterQuery = "
						?concept skos:editorialNote ?ednote .
					";
					$filterQuery = 'GRAPH ' . ($graph ?: "?graph$n") . ' { ' . $filterQuery . '}';
					$filterQueries[] = 'FILTER EXISTS { ' . $filterQuery . '}';

				} elseif (preg_match('/^has:wikidataItem/', $filter, $m)) {
					$filterQuery = "
						?concept ubo:wikidataItem ?wd .
					";
					$filterQuery = 'GRAPH ' . ($graph ?: "?graph$n") . ' { ' . $filterQuery . '}';
					$filterQueries[] = 'FILTER EXISTS { ' . $filterQuery . '}';

				} elseif (preg_match('/^(.*)\*$/', $filter, $m)) {
					// $filterQuery = "
					// 	FILTER(strstarts(lcase(str(?label)), \"%startswith$n%\"))
					// ";
					$filterQuery = "
						FILTER EXISTS { GRAPH ?graph$n {
							?concept xl:prefLabel ?labelNode$n .
							?labelNode$n xl:literalForm ?label$n .
						FILTER(strstarts(lcase(str(?label$n)), \"%startswith$n%\"))
						}}
					";
					$parameters["startswith$n"] = strtolower($m[1]);
					$filterQueries[] = $filterQuery;

				} elseif (preg_match('/^(.*)$/', $filter, $m)) {
					// $filterQuery = "
					// 	FILTER(regex(str(?label), \"%regexp$n%\", \"i\"))
					// ";
					$filterQuery = "
						FILTER (
							EXISTS { GRAPH ?graph$n {
								?concept xl:prefLabel ?labelNode$n .
								?labelNode$n xl:literalForm ?label$n .
								FILTER(regex(str(?label$n), \"%regexp$n%\", \"i\"))
							}}
							||
							EXISTS { GRAPH ?graph$n {
								?concept xl:altLabel ?labelNode$n .
								?labelNode$n xl:literalForm ?label$n .
								FILTER(regex(str(?label$n), \"%regexp$n%\", \"i\"))
							}}
						)
					";
					$parameters["regexp$n"] = $m[1];
					$filterQueries[] = $filterQuery;

				} else {
					die("Unknown filter found");
				}
			}
		}

		$whereQuery = ' WHERE {
				GRAPH ?graph {
					?concept a ?conceptType ;
						dct:identifier ?id ;
						xl:prefLabel ?labelNode .
					?labelNode xl:literalForm ?label
					FILTER(langMatches(lang(?label), "nb"))
					FILTER NOT EXISTS { ?concept owl:deprecated true . }
					VALUES ?conceptType { ' . implode(' ', $conceptTypes) . ' }
				}
				' . implode("\n", $filterQueries) . '
			}';

		$countQuery = 'SELECT (COUNT(?concept) AS ?count)' . $whereQuery;
		$selectQuery = 'SELECT ?graph ?concept ?id ?label' . $whereQuery . '
			ORDER BY ?label ?id
			OFFSET '. $cursor . '
			LIMIT ' . $limit . '
		';

		$result = $this->query($countQuery, $parameters);
		$count = $result[0]->count->getValue();

		$t0 = microtime(true);

		$result = $this->query($selectQuery, $parameters);
		$out = array();
		foreach ($result as $row) {
			$uri = $row->concept->getUri();
			$id = $row->id->getValue();
			$label = $row->label->getValue();
			$out[] = [
				'id' => $id,
				'uri' => $uri,
				'label' => $label,
			];
		}
		return [
			'cursor' => $cursor,
			'count' => $count,
			'concepts' => $out,
			'dt' => microtime(true) - $t0,
		];
	}

	protected function dateFieldToStr(\DateTime $value)
	{
		$tzUTC = new \DateTimeZone('UTC');
		$value->setTimezone($tzUTC);
		return $value->format(\DateTime::ATOM);
	}

	public function getConcept($uri)
	{
		$result = $this->query('
			SELECT * WHERE {
				{GRAPH ?graph2 {
					<%uri%> a skos:Concept
				}}
				{GRAPH ?graph {
					<%uri%> ?prop ?value .
					OPTIONAL {
						?value a xl:Label ; ?labelProp ?labelValue .
					}
				}}
			}',
			['uri' => $uri]
		);
		if (!count($result)) {
			return ['error' => 'Concept not found'];
		}
		$xld = [
			'uri' => $uri,
			'prefLabel' => [],
			'altLabel' => [],
			'wikidataItem' => [],
			'libCode' => [],
			'member' => [],
		];
		$labels = ['prefLabel' => [], 'altLabel' => [], 'hiddenLabel' => []];
		foreach ($result as $row) {
			$prop = RdfNamespace::splitUri($row->prop->getUri())[1];
			if (!isset($xld[$prop])) $xld[$prop] = [];

			if (empty($row->labelValue)) {  // a skos:Concept triple
				if ($row->value instanceof Literal) {
					if (in_array($prop, $this->dateFields)) {
						$xld[$prop][] = $row->value->getValue();
					} else if (in_array($prop, $this->simpleFields)) {
						$xld[$prop][] = $row->value->getValue();
					} else {
						$xld[$prop][] = [
							'value' => $row->value->getValue(),
							'lang' => $row->value->getLang(),
							'graph' => $row->graph->getUri(),
							'readonly' => ($row->graph->getUri() != $this->localGraphUri),
						];
					}
				} elseif ($row->value instanceof Resource) {
					$val = RdfNamespace::splitUri($row->value->getUri());
					if (!empty($val[1])) {
						$xld[$prop][] = $val[0] . ':' . $val[1];
					} else {
						$xld[$prop][] = $row->value->getUri();
					}

				}
			} else {  // a xl:Label triple
				if ($row->labelProp instanceof Resource) {
					$labelUri = $row->value->getUri();
					$labelProp = RdfNamespace::splitUri($row->labelProp->getUri())[1];

					if (!isset($labels[$prop][$labelUri])) $labels[$prop][$labelUri] = [];
					$labels[$prop][$labelUri][$labelProp] = $row->labelValue;
					$labels[$prop][$labelUri]['graph'] = $row->graph;
				}
			}
		}

		foreach ($labels as $labelType => $labels) {
			foreach ($labels as $uri => $label) {
				if (!isset($label['literalForm'])) {
					// Invalid label
					$this->logger->error('Invalid label found: '. $uri);
					continue;
				}

				$lab = ['uri' => $uri];
				foreach ($label as $key => $val) {
					if ($key == 'literalForm') {
						$lab['value'] = $val->getValue();
						$lab['language'] = $val->getLang() ?: '';
					} elseif ($key == 'graph') {
						$lab['graph'] = $val->getUri();
						$lab['readonly'] = ($lab['graph'] != $this->localGraphUri);
					} elseif ($val instanceof Literal) {
						$lab[$key] = $val->getValue();
						if (in_array($key, $this->dateFields)) {
							$lab[$key] = $this->dateFieldToStr($lab[$key]);
						}
					} elseif ($val instanceof Resource) {
						$x = RdfNamespace::splitUri($val->getUri());
						if (!empty($x[1])) {
							$lab[$key] = $x[0] . ':' . $x[1];
						}
					}


				}
				if (!isset($xld[$labelType][$lab['language']])) $xld[$labelType][$lab['language']] = [];
				$xld[$labelType][$lab['language']][] = $lab;
			}
		}

		// Post-process date fields
		foreach ($this->dateFields as $key) {
			if (isset($xld[$key])) {
				$xld[$key] = $this->dateFieldToStr(max($xld[$key]));
			}
		}

		return ['data' => $xld];
	}


	/* Get skoxl:Label object as Label */
	public function getLabel($uri)
	{
		$result = $this->query('
			SELECT ?graph ?prop ?value WHERE {
				GRAPH ?graph {
					<%uri%> a xl:Label ; 
					        ?prop ?value .
				}
			}',
			['uri' => $uri]
		);
		if (!count($result)) {
			return ['error' => 'Label not found'];
		}
		$xld = [
			'uri' => $uri,
		];
		foreach ($result as $row) {
			$prop = RdfNamespace::splitUri($row->prop->getUri())[1];
			$xld[$prop] = $this->valueToString($prop, $row->value);

			if ($prop == 'literalForm') {
				$xld['language'] = $row->value->getLang();
				$xld['graph'] = $row->graph->getUri();
				$xld['readonly'] = ($xld['graph'] != $this->localGraphUri);
			}
		}

		return ['data' => $xld];
	}


	/**
	 * updateLabels(uri, 'prefLabel', [
	 *   ['uri' => '...', 'label' => '...', 'lang' => 'en']
	 * ], [
	 *   ['uri' => '...', 'label' => '...', 'lang' => 'en']
	 * ]);
	 */
	public function updateLabels($user, $uri, $labelType, $delete, $add)
	{
		$propMap = [
			'creator' => 'user:creator',
		];

		if (!in_array($labelType, ['prefLabel', 'altLabel', 'hiddenLabel'])) {
			die('Invalid labelType "' . $labelType . '"');
		}

		if (count($delete) != 0) {
			$deleteTriples = '';
			foreach ($delete as $del) {
				$u = $del['uri'];
				$deleteTriples .= "
					<$uri> xl:$labelType <$u> .
					<$u> ?p ?o . ";
			}

			$query = 'DELETE WHERE {';
			$query .= "GRAPH <$this->localGraphUri> {";
			$query .= $deleteTriples;
			$query .= "}";
			$query .= '}';
			$success = $this->update($query);
			if (!$success) return false;
		}

		if (count($add) != 0) {
			$triples = new Graph;

			foreach ($add as $t) {
				$labelUri = new Resource($t['uri']);
				$triples->add($uri, "xl:$labelType", $labelUri);
				$triples->add($labelUri, "rdf:type", new Resource(RdfNamespace::expand('xl:Label')));
				$triples->add($labelUri, "xl:literalForm", new Literal($t['value'], $t['language']));

				if (isset($t['created'])) {
					$triples->add($labelUri, 'dct:created', new DateTimeLiteral($t['created']));
					$triples->add($labelUri, 'dct:creator', new Resource(RdfNamespace::expand($t['creator'])));
				} else {
					$triples->add($labelUri, 'dct:created', new DateTimeLiteral());
					$triples->add($labelUri, 'dct:creator', new Resource($user['uri']));
				}
				$triples->add($labelUri, 'dct:modified', new DateTimeLiteral());

				foreach ($t as $k => $v) {
					if ($v instanceof Literal) {
						if (!in_array($k, ['created', 'modified', 'literalForm']) && isset($propMap[$k])) {
							$triples->add($labelUri, $propMap[$k], new Literal($v));
						}
					}
				}

				//TODO: Legg til andre ting som måtte være der...

			}
			$response = $this->updateClient->insert($triples, $this->localGraphUri);
			if (!$response->isSuccessful()) {
				return false;
			}
		}

		return true;
	}

	public function touchModificationDate($uri)
	{
		return $this->update('
			PREFIX dcterms: <http://purl.org/dc/terms/>

			DELETE WHERE
			{ GRAPH <%localGraphUri%>
			  { <%uri%> dcterms:modified ?mod } 
			};

			INSERT
			{ GRAPH <%localGraphUri%>
			  { <%uri%> dcterms:modified ?now }
			}
			WHERE
			{ BIND(NOW() as ?now) }
		', ['localGraphUri' => $this->localGraphUri, 'uri' => $uri]);
	}

	public function findUser($username=null, $token=null, $includeStats=false)
	{
		$props = ['graph' => $this->userGraphUri];
		if ($username) {
			$filter = '?user (uo:id|uo:username) "%username%"';
			$props['username'] = $username;
		} elseif ($token) {
			$filter = '?user uo:token "%token%"';
			$props['token'] = $token;
		} else {
			die('no findUser criteria given');
		}

		$result = $this->query('
			SELECT * WHERE {
				GRAPH <%graph%> {
					?user a uo:User ;
						?prop ?value .

					' . $filter . ';
				}
			}', $props
		);


		if (count($result) == 0) {
			return false;
		}

		$out = ['permission' => []];
		foreach ($result as $tr) {
			$out['uri'] = strval($tr->user);
			$prop = RdfNamespace::splitUri($tr->prop->getUri())[1];
			if (!isset($out[$prop])) $out[$prop] = []; 
			$out[$prop][] = $this->valueToString($prop, $tr->value);
		}
		foreach ($this->dateFields as $field) {
			if (isset($out[$field])) $out[$field] = $out[$field][0];
		}
		if ($includeStats) {
			$out['stats'] = $this->getEventStats($out);
			$out['stats']['today'] = $this->getEventStats($out, 'FILTER(?date >= "' . strftime('%F') . 'T00:00:00Z"^^xsd:dateTime)')['total'];
			$out['activity'] = $this->getEvents(null, $out['uri'], 20)['events'];
		}

		return $out;
	}

	public function findOrCreateUser($username)
	{
		$user = $this->findUser($username);

		if (!$user) {
			$uuid1 = Uuid::uuid1();
			$id = $uuid1->toString();
			$uri = new Resource(RdfNamespace::expand('user:' . $id));
			$triples = new Graph;
			$triples->add($uri, 'rdf:type', new Resource(RdfNamespace::expand('uo:User')));
			$triples->add($uri, 'uo:username', $username);
			$triples->add($uri, 'uo:id', $id);
			// $triples->add($uri, 'uo:active', new BooleanLiteral(false));
			$triples->add($uri, 'dct:created', new DateTimeLiteral);
			$response = $this->updateClient->insert($triples, $this->userGraphUri);
			if (!$response->isSuccessful()) {
				$this->logger->error('Failed to create new DB user for ' . $username);
				die('Failed to create new DB user');
			}
			$this->logger->info('Created new user: ' . $username);
			$user = $this->findUser($username);
		}
		return $user;
	}

	public function generateUserToken($username)
	{
		$user = $this->findUser($username);

		if (!$user) {
			die('User not found');
		}

		$bytes = openssl_random_pseudo_bytes(24, $strong);
		$token = bin2hex($bytes);
		
		$userUri = $user['uri'];

		if (!$this->update('
			DELETE WHERE
			{ GRAPH <%userGraphUri%>
			  { <%uri%> uo:token ?x } 
			};

			INSERT DATA
			{ GRAPH <%userGraphUri%>
			  { <%uri%> uo:token "' . $token . '" }
			}
		', ['userGraphUri' => $this->userGraphUri, 'uri' => $userUri])) {
			$this->logger->error('Failed to update login token for: ' . $username);
			die('Failed to update login token');
		}
		$this->logger->info('Generated new login token for: ' . $username);
		return $token;
	}

	public function valueToString($prop, $value)
	{
		if ($value instanceof Literal) {
			if (in_array($prop, $this->dateFields)) {
				return $this->dateFieldToStr($value->getValue());
			}
			return $value->getValue();
		} elseif ($value instanceof Resource) {
			$x = RdfNamespace::splitUri($value->getUri());
			if (!empty($x[1])) {
				return $x[0] . ':' . $x[1];
			}
		}
		return null;
	}

	public function getUsers()
	{
		$triples = $this->query('
			SELECT ?user ?prop ?value
			WHERE
			{ GRAPH <%graph%>
			  { ?user a uo:User ;
					 ?prop ?value .
			  }
			}',
			['graph' => $this->userGraphUri]
		);

		$users = [];
		foreach ($triples as $tr) {
			$uri = strval($tr->user->getUri());
			$prop = RdfNamespace::splitUri($tr->prop->getUri())[1];
			if ($prop == 'token') continue;
			if (!isset($users[$uri])) $users[$uri] = [];
			$users[$uri][$prop][] = $this->valueToString($prop, $tr->value);
			$users[$uri]['uri'] = $uri;
		}
		$stats = $this->getEventStats();
		foreach ($users as $k => $v) {
			$users[$k]['stats'] = ['events' => [], 'total' => 0];
		}
		foreach ($stats['users'] as $k => $v) {
			$users[$k]['stats'] = $v;
		}
		return ['users' => array_values($users)];
	}

	public function markReviewed($uri, $user)
	{
		return $this->update('
			DELETE 
			{ GRAPH <%localGraphUri%>
			  { <%uri%> ?p ?x } 
			}
			WHERE
			{ GRAPH <%localGraphUri%>
			  { <%uri%> ?p ?x .
                VALUES ?p { uo:proofread uo:proofreader }
			  } 
			};

			INSERT
			{ GRAPH <%localGraphUri%>
			  { <%uri%> uo:proofread ?now ; uo:proofreader <%proofreader%> }
			}
			WHERE
			{ BIND(NOW() as ?now) }
		', ['localGraphUri' => $this->localGraphUri, 'uri' => $uri, 'proofreader' => $user['uri']]);
	}

	public function setProperty($uri, $property, $values)
	{
		$this->update('
			DELETE WHERE
			{ GRAPH <%localGraphUri%>
			  { <%uri%> ' . $property . ' ?x } 
			};
		', ['localGraphUri' => $this->localGraphUri, 'uri' => $uri]);

		$triples = new Graph;
		foreach ($values as $value) {
			$triples->add($uri, $property, new Literal($value['value'], array_get($value, 'lang')));
		}
		$response = $this->updateClient->insert($triples, $this->localGraphUri);
		return $response->isSuccessful();
	}

	public function setPropertyUri($uri, $property, $targetUris)
	{
		$q = $this->update('
			DELETE WHERE
			{ GRAPH <%localGraphUri%>
			  { <%uri%> ' . $property . ' ?x }
			};
		', ['localGraphUri' => $this->localGraphUri, 'uri' => $uri]);

		if (!count($targetUris)) {
			return true;
		}

		$triples = new Graph;
		foreach ($targetUris as $targetUri) {
			$triples->add($uri, $property, new Resource($targetUri));
		}
		$response = $this->updateClient->insert($triples, $this->localGraphUri);
		return $response->isSuccessful();
	}

	/**
	 * @param $concept  URI for the concept
	 * @param $user  URI for the concept
	 * @param $data  Free text log entry
	 * @param $cls   Event class
	 */
	public function addEvent($concept, $user, $data, $cls = 'uoc:GenericEvent')
    {
		$uuid1 = Uuid::uuid1();
		$logEntry = new Resource(RdfNamespace::expand('log:' . $uuid1->toString()));
		$eventClass = new Resource(RdfNamespace::expand('uoc:Event'));
		$eventClass2 = new Resource(RdfNamespace::expand($cls));

		$triples = new Graph;
		$triples->add($logEntry, 'rdf:type', $eventClass);
		$triples->add($logEntry, 'uop:type', $eventClass2);
		$triples->add($logEntry, 'dcterms:date', new DateTimeLiteral());
		$triples->add($logEntry, 'uop:concept', new Resource($concept));
		$triples->add($logEntry, 'uop:user', new Resource($user));
		$triples->add($logEntry, 'uop:data', $data);
		$response = $this->updateClient->insert($triples, $this->eventsGraphUri);
		return $response->isSuccessful();
	}

	/**
	 * @param $concept  URI for the concept
	 * @param $user  URI for the concept
	 */
	public function getEvents($concept = null, $user = null, $limit=500)
	{
		$query = '
			SELECT ?concept ?user ?data ?date ?term ?username ?id ?cls
			WHERE
			{
				GRAPH <%eventsGraphUri%> {
					?entry a uoc:Event ;
						uop:concept ?concept ;
						uop:user ?user ;
						uop:data ?data ;
						uop:type ?cls ;
						dcterms:date ?date .
				}

				GRAPH ?graph {
					?concept xl:prefLabel ?labelNode .
					?labelNode xl:literalForm ?term .
					?concept dcterms:identifier ?id .
					FILTER(langMatches(lang(?term), "nb"))
				}

				GRAPH <%userGraphUri%> {
					?user a uo:User ;
						uo:username ?username .
				}

			}
			ORDER BY DESC(?date)
			LIMIT ' . intval($limit) . '
		';
		if (!is_null($concept)) {
			$query .= ' VALUES ?concept { <' . $concept . '> }';
		}
		if (!is_null($user)) {
			$query .= ' VALUES ?user { <' . $user . '> }';
		}
		$triples = $this->query($query, [
			'eventsGraphUri' => $this->eventsGraphUri,
			'userGraphUri' => $this->userGraphUri,
		]);

		$events = [];
		foreach ($triples as $tr) {
			$uri = strval($tr->user->getUri());
			$evt = [
				'user' => [
					'uri' => $tr->user->getUri(),
					'username' => $this->valueToString(null, $tr->username),
				],
				'concept' => [
					'uri' => $tr->concept->getUri(),
					'id' => $this->valueToString(null, $tr->id),
					'term' => $this->valueToString(null, $tr->term),
				],
				'date' => $this->valueToString('created', $tr->date),
                'data' => $this->valueToString(null, $tr->data),
                'cls' => $this->valueToString(null, $tr->cls),
			];
			$events[] = $evt;
		}
		return ['events' => $events];
    }

    public function getCategories()
    {
        $cats = $this->getCats();
        return ['categories' => $cats];
    }

	protected function getCats()
    {
        $cachefile = dirname(dirname(__FILE__)) . '/cache/cats.json';

        if (file_exists($cachefile)) {
            $cats = json_decode(file_get_contents($cachefile), true);
        } else {
            $cats = $this->getCategoriesFromSparql();
            file_put_contents($cachefile, json_encode($cats));
        }

        return $cats;
    }

    public function getCategoryLabel($uri)
    {
        foreach ($this->catCache as $cat) {
            if ($cat['uri'] == $uri) {
                return $cat['label'];
            }
        }
    }

	protected function getCategoriesFromSparql()
	{
		$query = '
			SELECT ?cat ?label
			WHERE
			{
				GRAPH ?graph {
					?cat a uoc:Category ;
						rdfs:label ?label .
				}
			}
		';

		$triples = $this->query($query, []);

		$categories = [];
		foreach ($triples as $tr) {
			$cat = [
				'uri' => $tr->cat->getUri(),
				'label' => $this->valueToString(null, $tr->label),
			];
			$categories[] = $cat;
		}
		return $categories;
	}

	public function getEventStats($user=null, $filter='')
	{
		$query = '
			SELECT ?user ?cls (COUNT(DISTINCT ?concept) as ?c)
			WHERE {
			  GRAPH g:events {
			    ?entry a uoc:Event ;
				  uop:concept ?concept ;
			      uop:type ?cls ;
			      uop:concept ?concept ;
			      uop:user ?user ;
			      dct:date ?date .
			  }
			  ' . $filter . '
			}
			GROUP BY ?user ?cls
		';


		$triples = $this->query($query, []);

		$out = ['users' => []];

		foreach ($triples as $tr) {
			if (!isset($tr->cls)) continue;
			if (!isset($out['users'][$tr->user->getUri()]['total'])) {
				$out['users'][$tr->user->getUri()]['total'] = 0;
			}
			$out['users'][$tr->user->getUri()]['events'][$tr->cls->getUri()] = $tr->c->getValue();
			$out['users'][$tr->user->getUri()]['total'] += $tr->c->getValue();
		}

		if (!is_null($user)) {
			if (isset($out['users'][$user['uri']])) {
				$out = $out['users'][$user['uri']];
			} else {
				$out = ['events' => [], 'total' => 0];
			}
		}

		return $out;
	}

}
