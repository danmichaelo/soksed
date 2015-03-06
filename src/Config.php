<?php namespace Scriptotek\RtWp;

require_once('../config.php');

class Config
{

	public static function get($key)
	{
		global $config;
		return array_get($config, $key);
	}

}

