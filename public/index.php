<?php
require_once __DIR__ . '/../bootstrap.php';

use Scriptotek\RtWp\Auth;
use Scriptotek\RtWp\Concept;
use Scriptotek\RtWp\MediaWikiApi;
use Scriptotek\RtWp\Sparql as SparqlClient;

$mock = true;

$auth = new Auth($config);
if ($mock)
{
	$auth->mock('me@soapland.com');
}
if (isset($auth->error)) {
	echo $auth->error;
	exit;
}
if (isset($_GET['logout'])) {
	$auth->logout();
}

setcookie('user', json_encode($auth->getProfile()), time()+60);

?>
<!DOCTYPE html>
<html lang="en" ng-app="app" ng-strict-di>
<head>
	<meta charset="utf-8">

	<base href="/">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>rtwp</title>
 
	<!-- Latest compiled and minified CSS -->
	<link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css">
<!-- <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap-theme.min.css">-->

	<!-- Font Awesome -->
	<link href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" rel="stylesheet">

	<link href="/lib/angular-hotkeys/build/hotkeys.min.css" rel="stylesheet">

<!--  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular.min.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular-route.min.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular-sanitize.min.js"></script>
	<script src="/lib/angular-hotkeys/build/hotkeys.min.js"></script>
	<script src="/lib/ngInfiniteScroll/build/ng-infinite-scroll.min.js"></script>-->

	<link href="/build/site.css" rel="stylesheet">
	<script src="/build/deps.min.js"></script>
	<script src="/build/app.js"></script>
</head>
<body>

	<div class="pagewrapper">

		<header class="header">
			<div style="padding: 10px; float:right;" ng-controller="LoginCtrl" ng-show="user">
				<div ng-show="user.username">
					Innlogget som <a ui-sref="user({ id: user.username[0] })">{{ user.username[0] }}</a> 
					<a href="/?logout" target="_self">Logg ut</a>
				</div>
			</div>

			<h1>Rtwp</h1>
		</header>

		<div ui-view></div>  

		<footer class="footer">
			Bla-bla-bla
		</footer>

	</div>

</body> 
</html>
