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
	protected $dateFields = array('created', 'modified');

	protected $logger;
	protected $client;
	protected $updateClient;
	protected $user;

	protected $uriBase = 'http://trans.biblionaut.net';

	/* URI for the graph holding user data. */
	protected $userGraphUri;

	/* URI for the graph holding translations. (Any other graph will be treated as read only) */
	protected $transGraphUri;

	protected $queryEndpoint = 'http://localhost:3030/ds/sparql';

	protected $updateEndpoint = 'http://localhost:3030/ds/update';

	public function __construct($logger=null)
	{
		$this->logger = is_null($logger) ? new Logger : $logger;
		$this->client = new SparqlClient($this->queryEndpoint);
		$this->updateClient = new SparqlClient($this->updateEndpoint);

		$this->transGraphUri = $this->uriBase . '/graph/trans';
		$this->userGraphUri = $this->uriBase . '/graph/users';
		RdfNamespace::set('uo', $this->uriBase . '/onto/user#');
		RdfNamespace::set('user', $this->uriBase .'/data/users/');
	}

	protected function bind($query, $parameters = [])
	{
		$query = preg_replace_callback('/<%([a-zA-Z]+)%>/', function($matches) use ($parameters) {
			if (!isset($parameters[$matches[1]])) {
				die('Sparql::bind - Could not bind parameter "' . $matches[1] . '", no value supplied!');
			}
			// Sanitize URIRef - TODO: Use some standardized method
			$value = trim($parameters[$matches[1]], '<>"');
			return '<' . $value . '>';

		}, $query);

		$query = preg_replace_callback('/"%([a-zA-Z]+)%"/', function($matches) use ($parameters) {
			if (!isset($parameters[$matches[1]])) {
				die('Sparql::bind - Could not bind parameter "' . $matches[1] . '", no value supplied!');
			}
			// Sanitize Literal - TODO: Use some standardized method
			$value = trim($parameters[$matches[1]], '"');
			return '"' . $value . '"';

		}, $query);

		return $query;
	}

	protected function query($query, $parameters = [])
	{
		$query = $this->bind($query, $parameters);
		return $this->client->query($query);
	}

	protected function update($query, $parameters = [])
	{
		$query = $this->bind($query, $parameters);
		$response = $this->updateClient->update($query);
		return $response->isSuccessful();
	}

	public function getConcepts($filter, $transOnly)
	{
		$cursor = 0;
		$limit = 500;

		$filterQuery = '';
		$parameters = [];
		if (!empty($filter)) {
			if ($transOnly) {
				$graph = '<%transGraphUri%>';
				$parameters['transGraphUri'] = $this->transGraphUri;
			} else {
				$graph = '?graph2';
			}
			if (preg_match('/^(-)?prefLabel.lang:([a-z]{2,3})/', $filter, $m)) {
				$op = ($m[1] == '-') ? 'NOT EXISTS' : 'EXISTS';
				$langcode = $m[2];
				$filterQuery = '
					?concept xl:prefLabel ?labelNode2 . 
					?labelNode2 xl:literalForm ?label2 .
					FILTER(langMatches(lang(?label2), "%lang%"))
				';
				$parameters['lang'] = $langcode;
				$filterQuery = 'GRAPH ' . $graph . ' { ' . $filterQuery . '}';
				$filterQuery = 'FILTER ' . $op . ' { ' . $filterQuery . '}';
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
				' . $filterQuery . '
			}';
		$countQuery = 'SELECT (COUNT(?concept) AS ?count)' . $whereQuery;
		$selectQuery = 'SELECT ?graph ?concept ?id ?label' . $whereQuery . '
			ORDER BY ?label ?id
			OFFSET '. $cursor . '
			LIMIT ' . $limit . '
		';

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
				GRAPH ?graph {
					<%uri%> ?prop ?value .
					OPTIONAL {
						?value a xl:Label ; ?labelProp ?labelValue .
					}
				}
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
					$xld[$prop][] = $row->value->getValue();
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
						$lab['readonly'] = ($lab['graph'] != $this->transGraphUri);
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
			$query .= "GRAPH <$this->transGraphUri> {";
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
			$response = $this->updateClient->insert($triples, $this->transGraphUri);
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
			{ GRAPH <%transGraphUri%>
			  { <%uri%> dcterms:modified ?mod } 
			};

			INSERT
			{ GRAPH <%transGraphUri%>
			  { <%uri%> dcterms:modified ?now }
			}
			WHERE
			{ BIND(NOW() as ?now) }
		', ['transGraphUri' => $this->transGraphUri, 'uri' => $uri]);
	}

	public function findUser($username)
	{
		$result = $this->query('
			SELECT * WHERE {
				GRAPH <%graph%> {
					?user uo:username "%username%" ;
						?prop ?value
				}
			}',
			['graph' => $this->userGraphUri, 'username' => $username]
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
				die('Failed to create new DB user');
			}
			$user = $this->findUser($username);
		}
		return $user;
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
			if (!isset($users[$uri])) $users[$uri] = [];
			$users[$uri][$prop] = $this->valueToString($prop, $tr->value);
		}
		return ['users' => $users];
	}

}