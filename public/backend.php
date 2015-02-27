<?php

require_once __DIR__ . '/../bootstrap.php';

use Scriptotek\RtWp\Auth;
use Scriptotek\RtWp\Concept;
use Scriptotek\RtWp\MediaWikiApi;
use Scriptotek\RtWp\Sparql as SparqlClient;

$mock = true;

$sparql = new SparqlClient;

$auth = new Auth($config);
if ($mock)
{
	$auth->mock('me@soapland.com');
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

	case 'get_user':
		$id = isset($_GET['$id']) ? $_GET['$id'] : null;
		jsonOut([
			'user' => $auth->getUser($id),
			'loginUrl' => $auth->getLoginUrl(),
			'logoutUrl' => $auth->getLogoutUrl(),
		]);

	case 'get_users':

		jsonOut($sparql->getUsers());

	case 'get_concepts':

		$concepts = $sparql->getConcepts(
			array_get($_GET, 'filter'),
			array_get($_GET, 'transOnly', 0)
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

}

jsonOut(array(
	'error' => 'Uh oh, unknown action'
));
