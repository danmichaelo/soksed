<?php namespace Scriptotek\RtWp;

use OAuth\OAuth2\Service\GitHub;
use OAuth\Common\Storage\Session;
use OAuth\Common\Consumer\Credentials;

class Auth extends Base
{
	protected $storage;
	protected $credentials;
	protected $github;
	protected $sparql;
	protected $currentUri;
	public $error;
	protected $profile;

	function __construct($config, $sparql = null)
	{
		parent::__construct();

		// Session storage
		$this->storage = new Session();

		$this->sparql = is_null($sparql) ? new Sparql : $sparql;

		/** @var $serviceFactory \OAuth\ServiceFactory An OAuth service factory. */
		$serviceFactory = new \OAuth\ServiceFactory();

		// Setup the credentials for the requests
		$this->credentials = new Credentials(
			$config['github']['key'],
			$config['github']['secret'],
			$this->currentUri->getAbsoluteUri()
		);

		// Instantiate the GitHub service using the credentials, http client and storage mechanism for the token
		/** @var $gitHub GitHub */
		$this->github = $serviceFactory->createService('GitHub',
			$this->credentials,
			$this->storage,
			array('user:email')
		);

		if ($this->storage->hasAccessToken('GitHub') && isset($_SESSION['github.user.email'])) {
			$this->setUser($_SESSION['github.user.email']);
		}

		$this->checkState($_GET);

	}

	protected function checkState($input)
	{
		if (!empty($input['code'])) {

			// This was a callback request from github, get the token
			$this->github->requestAccessToken($input['code']);

			// Use token to request email
			$result = json_decode($this->github->request('user/emails'), true);
			$this->setUser($result[0]);
			$_SESSION['github.user.email'] = $this->email;

			header('Location: ' . $this->getCurrentUri());
			exit;

		} elseif (!empty($input['go']) && $input['go'] === 'logout') {
			$this->logout();
			header('Location: ' . $this->getCurrentUri());
			exit;

		} elseif (!empty($input['go']) && $input['go'] === 'login') {
			header('Location: ' . $this->getAuthorizationUri());
			exit;
		}

		if (!empty($input['error'])) {
			$this->error = strip_tags($input['error']) . ' : ' . strip_tags($input['error_description']);
			return;
		}

	}

	public function getProfile()
	{
		return $this->profile ?: null;
	}

	protected function setUser($username) {
		$this->profile = $username ? $this->sparql->findOrCreateUser($username) : null;
	}

	public function getUser()
	{
		return $this->profile;
	}

	public function hasPermission($permission)
	{
		if (!$this->profile) return false;
		if (in_array($permission, array_get($this->profile, 'permission', []))) return true;
		return false;
	}

	public function mock($username)
	{
		$this->setUser($username);
	}

	public function getLogoutUrl()
	{
		return $this->getCurrentUri() . '?go=logout';
	}

	public function getLoginUrl()
	{
		return $this->getCurrentUri() . '?go=login';
	}

	public function getAuthorizationUri()
	{
		return $this->github->getAuthorizationUri();
	}

	public function getGithubStatus()
	{
		return $this->storage->hasAccessToken('GitHub');
	}

	public function logout()
	{
		$this->storage->clearAllTokens();
		unset($_SESSION['github.user.email']);
		$this->setUser(null);
	}

}

