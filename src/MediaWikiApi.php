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

	public function getUrl($args)
	{
		$headers = array('User-Agent' => $this->user_agent);
		$args['format'] = 'json';
		return 'https://' . $this->hostname . $this->path . '?' . http_build_query($args);
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
