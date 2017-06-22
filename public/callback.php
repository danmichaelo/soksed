<?php

require_once __DIR__ . '/../bootstrap.php';

use Scriptotek\RtWp\Config;

$sentryClient = new Raven_Client(Config::get('sentry.dsn'));
$error_handler = new Raven_ErrorHandler($sentryClient);
$error_handler->registerExceptionHandler();
$error_handler->registerErrorHandler();
$error_handler->registerShutdownFunction();

if (isset($_GET['returnTo']) && !empty($_GET['returnTo'])) {
	$_SESSION['returnTo'] = $_GET['returnTo'];
}

$auth = new Scriptotek\RtWp\Auth;

if ($auth->error) {
	print $auth->error;
	exit;
}

if (isset($_SESSION['returnTo']) && !empty($_SESSION['returnTo'])) {
	header('Location: ' . $_SESSION['returnTo']);
} else {
	header('Location: /');
}
