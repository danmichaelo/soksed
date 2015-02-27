<?php namespace Scriptotek\RtWp;

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
		$host = gethostname();

		// Set the format
		$dateFormat = 'Y-m-d\TH:i:s\Z';
		$output = '%datetime% ' . $host . ' rtnn - - - %level_name%: %message%';
		$formatter = new LineFormatter($output, $dateFormat);

		// Setup the logger
		$this->logger = new MonoLogger('rtnn');
		$syslogHandler = new SyslogUdpHandler('logs2.papertrailapp.com', 28542);
		$syslogHandler->setFormatter($formatter);
		$this->logger->pushHandler($syslogHandler);
	}

	public function error($msg)
	{
		$this->logger->addError($msg);
	}

}