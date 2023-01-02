<?php namespace Scriptotek\RtWp;

require_once('../config.php');

use Monolog\Logger as MonoLogger;
use Monolog\Formatter\LineFormatter;
use Monolog\Handler\SyslogUdpHandler;
use Monolog\Handler\StreamHandler;

/**
* Logger
*/
class Logger
{

	protected $logger;

	function __construct($auth=null)
	{

		$this->auth = $auth;
		// if (empty(Config::get('papertrail.host'))) {
		// 	return;
		// }
//		$host = gethostname();

		// Set the format
		$dateFormat = 'Y-m-d H:i:s';
//		$output = '%datetime% ' . $host . ' soksed - - - %level_name%: %message%';
		$output = "[%datetime% %level_name%] %message%\n";
		$formatter = new LineFormatter($output, $dateFormat);

		// Setup the logger
		$this->logger = new MonoLogger('main');
		$handler = new StreamHandler(dirname(__dir__) . '/main.log', MonoLogger::INFO);
		$handler->setFormatter($formatter);
		$this->logger->pushHandler($handler);

		// $syslogHandler = new SyslogUdpHandler(Config::get('papertrail.host'), Config::get('papertrail.port'));
		// $syslogHandler->setFormatter($formatter);
		// $this->logger->pushHandler($syslogHandler);


	}

	public function uname()
	{
		if (!$this->auth) return '';
		$p = $this->auth->getProfile();
		if (!$p) return '';
		return array_get($p, 'username.0') . ': ';
	}

	public function error($msg)
	{
		if (!isset($this->logger)) return;
		$this->logger->addError($this->uname() . $msg);
	}

	public function info($msg)
	{
		if (!isset($this->logger)) return;
		$this->logger->addInfo($this->uname() . $msg);
	}

}
