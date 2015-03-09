<?php

require_once __DIR__ . '/../bootstrap.php';

use Scriptotek\RtWp\Auth;
use Scriptotek\RtWp\Concept;
use Scriptotek\RtWp\Label;
use Scriptotek\RtWp\MediaWikiApi;
use Scriptotek\RtWp\Sparql as SparqlClient;

$sparql = new SparqlClient;

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

		$concept = new Concept($_GET['uri'], $auth);
		jsonOut($concept->toArray());

	case 'put_concept':

		if (!$auth->hasPermission('edit')) {
			jsonOut(array(
				'status' => 'no_permission',
			));
		}

		$concept = new Concept($input['data']['uri'], $auth);
		$status = $concept->putData($input['data']);

		jsonOut(array(
			'status' => $status,
		));


	/** LABEL ACTIONS **/

	case 'get_label':

		$label = new Label($_GET['uri'], $auth);
		jsonOut($label->toArray());

	case 'mark_reviewed':

		if (!$auth->hasPermission('review')) {
			jsonOut(array(
				'status' => 'no_permission',
			));
		}

		$label = new Label($input['uri'], $auth);
		$status = $label->markReviewed();

		// TODO: term not found

		jsonOut(array(
			'status' => $status,
		));

}

jsonOut(array(
	'error' => 'Uh oh, unknown action'
));
