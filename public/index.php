<?php
require_once __DIR__ . '/../bootstrap.php';

use Scriptotek\RtWp\Auth;
use Scriptotek\RtWp\Concept;
use Scriptotek\RtWp\MediaWikiApi;
use Scriptotek\RtWp\Sparql as SparqlClient;

$whoops = new \Whoops\Run;
$whoops->pushHandler(new \Whoops\Handler\PrettyPageHandler);
$whoops->register();

$auth = new Auth;
if ($mock)
{
	$auth->mock('danmichaelo@gmail.com');
}
if (isset($auth->error)) {
	echo $auth->error;
	exit;
}
if (isset($_GET['logout'])) {
	$auth->logout();
}

setcookie('user', json_encode($auth->getProfile()), time()+60, '/');

?>
<!DOCTYPE html>
<html lang="en" ng-app="app" ng-strict-di>
<head>
	<meta charset="utf-8">

	<base href="/">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>soksed</title>
 
	<!-- Latest compiled and minified CSS -->
	<link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css">
<!-- <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap-theme.min.css">-->

	<!-- Font Awesome -->
	<link href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" rel="stylesheet">

	<link href="/lib/angular-hotkeys/build/hotkeys.min.css" rel="stylesheet">
	<link href="/lib/angular-tooltips/src/css/angular-tooltips.css" rel="stylesheet" type="text/css" />

<!--  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular.min.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular-route.min.js"></script>
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.16/angular-sanitize.min.js"></script>
	<script src="/lib/angular-hotkeys/build/hotkeys.min.js"></script>
	<script src="/lib/ngInfiniteScroll/build/ng-infinite-scroll.min.js"></script>-->

	<link href="/build/site.css" rel="stylesheet">
	<script src="/build/deps.min.js"></script>
	<script src="/build/app.min.js"></script>
</head>
<body class="menuVisible">

	<header class="header" ng-controller="HeaderCtrl">
		<div style="padding: 10px; float:right;" ng-show="user">
			<div ng-show="user.username">
				<a ui-sref="user({ id: user.username[0] })">{{ user.username[0] }}</a> 
				<!-- target="_self" to override the AngularJS router --> 
				<a href="/callback.php?logout" target="_self" title="Logg ut"><i class="fa fa-sign-out"></i></a>
			</div>
			<div ng-show="!user.username">
				<!-- target="_self" to override the AngularJS router --> 
				<a href="/callback.php?login" target="_self"><i class="fa fa-sign-in"></i> Logg inn</a>
			</div>
		</div>

		<h1>
			<a href="#" ng-click="toggleMenu()" ng-show="menuAvailable" title="Veksle meny"><i class="fa fa-bars"></i></a> 
			<a href="/">soksed</a>
		</h1>
	</header>

	<div class="content" ui-view></div>  

	<!--
	<footer class="footer">
		Bla-bla-bla
	</footer>
	-->

</body> 
</html>
