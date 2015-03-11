<?php namespace Scriptotek\RtWp;

use EasyRdf\RdfNamespace;
use EasyRdf\Sparql\Client as SparqlClient;
use EasyRdf\Graph;
use EasyRdf\Resource;
use EasyRdf\Literal;
use EasyRdf\Literal\DateTime as DateTimeLiteral;
use EasyRdf\Literal\Boolean as BooleanLiteral;
use Carbon\Carbon;
use Rhumsaa\Uuid\Uuid;

error_reporting(E_ALL | E_STRICT);
ini_set('display_errors', '1');

RdfNamespace::set('skos', 'http://www.w3.org/2004/02/skos/core#');
RdfNamespace::set('xl', 'http://www.w3.org/2008/05/skos-xl#');
RdfNamespace::set('mads', 'http://www.loc.gov/mads/rdf/v1#');
RdfNamespace::set('dct', 'http://purl.org/dc/terms/');

class Sparql extends Base
{

	// Fields to be transformed from DateTimes to strings
	protected $dateFields = array('created', 'modified', 'proofread');

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
		RdfNamespace::set('uo', $this->uriBase . '/onto/user#');
		RdfNamespace::set('user', $this->uriBase .'/data/users/');
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
			die('Sparql query error, see log');
		}
	}

	protected function update($query, $parameters = [])
	{
		$query = $this->bind($query, $parameters);
		try {
			$response = $this->updateClient->update($query);
		} catch (\EasyRdf\Http\Exception $e) {
			$this->logger->error("SPARQL UPDATE failed: " . $e->getBody() . " --- Query: " . $query . " --- Trace: " . $e->getTraceAsString());
			die('Sparql update error, see log');
		}
		return $response->isSuccessful();
	}

	public function getConcepts($cursor, $filters)
	{
		$limit = 1500;

		$filterQueries = [];
		$parameters = [];
		$graph = null;
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

				} elseif (preg_match('/^(.*)\*$/', $filter, $m)) {
					$filterQuery = "
						FILTER(strstarts(lcase(str(?label)), \"%startswith$n%\"))
					";
					$parameters["startswith$n"] = strtolower($m[1]);
					$filterQueries[] = $filterQuery;

				} elseif (preg_match('/^(.*)$/', $filter, $m)) {
					$filterQuery = "
						FILTER(regex(str(?label), \"%regexp$n%\", \"i\"))
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
					?concept a mads:Topic ;
						dct:identifier ?id ;
						xl:prefLabel ?labelNode .
					?labelNode xl:literalForm ?label
					FILTER(langMatches(lang(?label), "nb"))
				}
				' . implode("\n", $filterQueries) . '
			}';

		$countQuery = 'SELECT (COUNT(?concept) AS ?count)' . $whereQuery;
		$selectQuery = 'SELECT ?graph ?concept ?id ?label' . $whereQuery . '
			ORDER BY ?label ?id
			OFFSET '. $cursor . '
			LIMIT ' . $limit . '
		';

		// print $selectQuery; die;

		$result = $this->query($countQuery, $parameters);
		$count = $result[0]->count->getValue();

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
		];
		$labels = ['prefLabel' => [], 'altLabel' => [], 'hiddenLabel' => []];
		foreach ($result as $row) {
			$prop = RdfNamespace::splitUri($row->prop->getUri())[1];
			if (!isset($xld[$prop])) $xld[$prop] = [];

			if (empty($row->labelValue)) {  // a skos:Concept triple
				if ($row->value instanceof Literal) {
					if (in_array($prop, $this->dateFields)) {
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
		// if (!$this->user['verified'])) {
		//     die('Permission denied');
		// }

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

	public function findUser($username=null, $token=null)
	{
		$props = ['graph' => $this->userGraphUri];
		if ($username) {
			$filter = '?user uo:username "%username%"';
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
					' . $filter . ';
						?prop ?value
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
		return $out;
	}

	public function findOrCreateUser($username)
	{
		$user = $this->findUser($username);

		if (!$user) {
			$uuid1 = Uuid::uuid1();
			$uri = new Resource(RdfNamespace::expand('user:' . $uuid1->toString()));
			$triples = new Graph;
			$triples->add($uri, 'rdf:type', new Resource(RdfNamespace::expand('uo:User')));
			$triples->add($uri, 'uo:username', $username);
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
		}
		return ['users' => $users];
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

}