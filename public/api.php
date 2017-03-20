<?php

require_once __DIR__ . '/../bootstrap.php';

use Scriptotek\RtWp\Auth;
use Scriptotek\RtWp\Concept;
use Scriptotek\RtWp\Config;
use Scriptotek\RtWp\Label;
use Scriptotek\RtWp\MediaWikiApi;
use Scriptotek\RtWp\Sparql as SparqlClient;

$sentryClient = new Raven_Client(Config::get('sentry.dsn'));
$error_handler = new Raven_ErrorHandler($sentryClient);
$error_handler->registerExceptionHandler();
$error_handler->registerErrorHandler();
$error_handler->registerShutdownFunction();

$sparql = new SparqlClient;
$sparql->setLocalGraphUri($sparql->getUriBase() . '/graph/trans2');
$auth = new Auth;
if ($mock)
{
	$auth->mock('danmichaelo@gmail.com');
}

$input = json_decode(file_get_contents('php://input'), true);
if (is_null($input)) {
	$action = $_GET['action'];
} else {
	$action = $input['action']; 
}

if (!isset($action) || empty($action)) {
	die('No request made');
	exit;
}

function jsonOut($a)
{
	header('Content-Type: application/json; charset=utf-8');
	gzippedOutput(json_encode($a));
}

function gzippedOutput($data) 
{
	$_temp1 = strlen($data); 
	if ($_temp1 < 2048)    // no need to waste resources in compressing very little data 
		print($data); 
	else 
	{ 
		header('Content-Encoding: gzip'); 
		print("\x1f\x8b\x08\x00\x00\x00\x00\x00"); 
		$data = gzcompress($data, 9); 
		$data = substr($data, 0, $_temp1); 
		print($data); 
	}
	exit;
}

switch ($action) {

	case 'get_wikidata':
		$mw = new MediaWikiApi('wikidata.org');
		$data = $mw->getFromUri($_GET['uri']);
		jsonOut($data);

	case 'get_wikipedia':

		if (isset($_GET['lang']) && $_GET['lang'] == 'en') {
			$mw = new MediaWikiApi('en.wikipedia.org');
		} else {
			$mw = new MediaWikiApi('no.wikipedia.org');
		}

		$data = $mw->getPageExtract($_GET['term']);
		jsonOut($data);

	case 'search_wikipedia':

		$mw = new MediaWikiApi('en.wikipedia.org');
		$concepts = $mw->opensearch($_GET['term']);

		$mw = new MediaWikiApi('no.wikipedia.org');
		foreach ($mw->opensearch($_GET['term']) as $c) {
			$concepts[] = $c;
		}

		jsonOut(['results' => $concepts]);

	case 'search_wikidata':

		$mw = new MediaWikiApi('wikidata.org');
		$concepts = $mw->wbsearch($_GET['term']);

		jsonOut(['results' => $concepts]);

	case 'get_wikipedia_fulltext':

		if (isset($_GET['lang']) && $_GET['lang'] == 'en') {
			$mw = new MediaWikiApi('en.wikipedia.org');
		} else {
			$mw = new MediaWikiApi('no.wikipedia.org');
		}

		$concept = $mw->getPageText($_GET['term']);
		jsonOut($concept);

	/** USER ACTIONS **/

	case 'get_user':
		$id = isset($_GET['$id']) ? $_GET['$id'] : null;
		jsonOut([
			'user' => $auth->getProfile(),
			'loginUrl' => $auth->getLoginUrl(),
			'logoutUrl' => $auth->getLogoutUrl(),
		]);

	case 'get_users':

		jsonOut($sparql->getUsers());

	/** CONCEPT ACTIONS **/

	case 'get_concepts':

		$concepts = $sparql->getConcepts(
			intval(array_get($_GET, 'cursor', 0)),
			array_get($_GET, 'filter')
		);

		jsonOut($concepts);

	case 'get_concept':

		$concept = new Concept($_GET['uri'], $auth, $sparql);
		jsonOut($concept->toArray());

	case 'put_concept':

		if (!$auth->hasPermission('edit')) {
			jsonOut(array(
				'status' => 'no_permission',
			));
		}

		$concept = new Concept($input['data']['uri'], $auth, $sparql);
		$status = $concept->putData($input['data']);

		jsonOut(array(
			'status' => $status,
		));


	/** LABEL ACTIONS **/

	case 'get_label':

		$label = new Label($_GET['uri'], $auth, $sparql);
		jsonOut($label->toArray());

	case 'mark_reviewed':

		if (!$auth->hasPermission('review')) {
			jsonOut(array(
				'status' => 'no_permission',
			));
		}

		$label = new Label($input['uri'], $auth, $sparql);
		$status = $label->markReviewed();

		// TODO: term not found

		jsonOut(array(
			'status' => $status,
		));

	/** EVENT ACTIONS **/

	case 'get_events':

		jsonOut($sparql->getEvents());

	/** CATEGORY ACTIONS **/

	case 'get_categories':

		jsonOut($sparql->getCategories());

}

jsonOut(array(
	'error' => 'Uh oh, unknown action'
));
