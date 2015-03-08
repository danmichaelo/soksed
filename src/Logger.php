<?php namespace Scriptotek\RtWp;

require_once('../config.php');

use Monolog\Logger as MonoLogger;
use Monolog\Formatter\LineFormatter;
use Monolog\Handler\SyslogUdpHandler;

/**
* Logger
*/
class Logger
{

	protected $logger;

	function __construct()
	{

		if (empty(Config::get('papertrail.host'))) {
			return;
		}
		$host = gethostname();

		// Set the format
		$dateFormat = 'Y-m-d\TH:i:s\Z';
		$output = '%datetime% ' . $host . ' soksed - - - %level_name%: %message%';
		$formatter = new LineFormatter($output, $dateFormat);

		// Setup the logger
		$this->logger = new MonoLogger('main');
		$syslogHandler = new SyslogUdpHandler(Config::get('papertrail.host'), Config::get('papertrail.port'));
		$syslogHandler->setFormatter($formatter);
		$this->logger->pushHandler($syslogHandler);
	}

	public function error($msg)
	{
		if (!isset($this->logger)) return;
		$this->logger->addError($msg);
	}

	public function info($msg)
	{
		if (!isset($this->logger)) return;
		$this->logger->addInfo($msg);
	}

}