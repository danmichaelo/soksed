<?php

require_once __DIR__ . '/../bootstrap.php';

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