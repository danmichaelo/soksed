<?php namespace Scriptotek\RtWp;

/**
 * Basic MediaWiki API
 */
class MediaWikiApi extends Base
{
	public $hostname;
	public $path = '/w/api.php';
	public $user_agent = 'Realfagstermer mapping tool. Run by danmichaelo@gmail.com';
	public $disambigTemplates = array('Dmbox', 'Disambiguation');

	function __construct($hostname)
	{
		parent::__construct();
		$this->hostname = $hostname;
	}

	public function getUrl($args, $hostname=null)
	{
		$headers = array('User-Agent' => $this->user_agent);
		$args['format'] = 'json';
		return 'https://' . (is_null($hostname) ? $this->hostname : $hostname) . $this->path . '?' . http_build_query($args);
	}

	public function wbsearch($term)
	{
		$limit = 5;

		$request = \Requests::get($this->getUrl(array(
			'action' => 'wbsearchentities',
			'language' => 'nb',
			'uselang' => 'nb',
			'search' => $term,
			'limit' => $limit,
		)), ['accept-language' => 'nb-NO,nb;q=0.8,no;q=0.6,nn;q=0.4,en-US;q=0.2,en;q=0.2,sv;q=0.2,da;q=0.2']);

		$results = [];
		foreach (json_decode($request->body, true)['search'] as $r) {
			$r['matched_text'] = $r['match']['text'];
			$results[] = $r;
		}

		return $results;

		// for ($i=0; $i < $limit; $i++) {
		// 	if (!isset($tmp[1][$i])) {
		// 		break;
		// 	}
		// 	$results[] = [
		// 		'term' => $tmp[1][$i],
		// 		'desc' => $tmp[2][$i],
		// 		'url' => $tmp[3][$i],
		// 		'lang' => explode('.', $this->hostname)[0],
		// 	];
		// }

		// return $results;
	}
	public function opensearch($term)
	{
		$limit = 5;

		$request = \Requests::get($this->getUrl(array(
			'action' => 'opensearch',
			'search' => $term,
			'namespace' => '0',
			'limit' => $limit,
		)));

		$results = [];
		$tmp = json_decode($request->body, true);

		for ($i=0; $i < $limit; $i++) {
			if (!isset($tmp[1][$i])) {
				break;
			}
			$results[] = [
				'term' => $tmp[1][$i],
				'desc' => $tmp[2][$i],
				'url' => $tmp[3][$i],
				'lang' => explode('.', $this->hostname)[0],
			];
		}

		return $results;
	}

	public function getFromUri($uri)
	{
		$uri = explode('/', $uri);
		$q = array_pop($uri);

		$o = [];
		$this->appendEntity($o, $q);
		if (isset($o['sitelinks']) && isset($o['sitelinks']['nowiki'])) {
			$this->appendExtract($o, $o['sitelinks']['nowiki']['title'], 'no.wikipedia.org');
		} else if (isset($o['sitelinks']) && isset($o['sitelinks']['enwiki'])) {
			$this->appendExtract($o, $o['sitelinks']['enwiki']['title'], 'en.wikipedia.org');
		}

		return $o;
	}

	public function getEntity($q)
	{
		$request = \Requests::get($this->getUrl(array(
			'action' => 'wbgetentities',
			'ids' => $q,
		), 'wikidata.org'));
		$data =  json_decode($request->body, true);
		foreach ($data['entities'] as $id => $d) {
			return $d;
		}
	}

	public function appendEntity(&$o, $id)
	{
		$entity = $this->getEntity($id);
		if (!is_null($entity)) {
			$o['descriptions'] = $entity['descriptions'];
			$o['labels'] = $entity['labels'];
			$o['sitelinks'] = $entity['sitelinks'];
		}
	}

	public function appendExtract(&$o, $title, $site)
	{
		$request = \Requests::get($this->getUrl(array(
			'action' => 'query',
			'titles' => $title,
			'prop' => 'extracts|pageprops',
			'exchars' => '255',
			'exintro' => '1',
			'explaintext' => '1',
			'redirects' => '' // Follow redirects
		), $site ?: $this->hostname));
		$data =  json_decode($request->body, true);
		foreach ($data['query']['pages'] as $id => $d) {
			if (isset($d['missing'])) {
				return;
			}
			$o['title'] = $d['title'];
			$o['extract'] = $d['extract'];
			$o['id'] = $d['pageprops']['wikibase_item'];
			$o['uri'] = 'http://www.wikidata.org/entity/' . $o['id'];
			return;
		}
	}

	public function getPageExtract($title, $site=null)
	{
		$o = [];
		$this->appendExtract($o, $title, $site);
		if (isset($o['id'])) {
			$this->appendEntity($o, $o['id']);
		}

		return $o;


		// $wd_item = null;
		// foreach ($data['parse']['properties'] as $prop) {
		// 	if ($prop['name'] == 'wikibase_item') {
		// 		$wd_item = $prop['*'];
		// 	}
		// }
		// return array(
		// 	'title' => $data['parse']['title'],
		// 	'text' => $data['parse']['text']['*'],
		// 	'wd_item' => $wd_item,
		// );
	}


	public function getPageText($title)
	{
		$request = \Requests::get($this->getUrl(array(
			'action' => 'parse',
			'page' => $title,
			'prop' => 'text|properties',
			'section' => '0',
			'redirects' => '' // Follow redirects
		)));
		$data =  json_decode($request->body, true);
		$wd_item = null;
		foreach ($data['parse']['properties'] as $prop) {
			if ($prop['name'] == 'wikibase_item') {
				$wd_item = $prop['*'];
			}
		}
		return array(
			'title' => $data['parse']['title'],
			'text' => $data['parse']['text']['*'],
			'wd_item' => $wd_item,
		);
	}

	public function isDisambiguationPage($title)
	{
		$request = \Requests::get($this->getUrl(array(
			'action' => 'query',
			'titles' => $title,
			'prop' => 'templates',
			'tlnamespace' => 10,
			'redirects' => '' // Follow redirects
		)));
		$data =  json_decode($request->body, true);
		$page = $data['query']['pages'][array_keys($data['query']['pages'])[0]];
		$templates = array_map(function($o) {
			return substr($o['title'], strpos($o['title'], ':') + 1); // Strip off namespace
		}, $page['templates']);

		foreach ($templates as $tpl) {
			if (in_array($tpl, $this->disambigTemplates)) {
				return true;
			}
		}
		return false;
	}

}
