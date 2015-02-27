<?php

/**
 * Bootstrap the library
 */
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';

/**
 * Setup error reporting
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * Setup the timezone
 */
ini_set('date.timezone', 'Europe/Oslo');
