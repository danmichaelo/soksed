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

	function __construct($sparql = null)
	{
		parent::__construct();

		// Session storage
		$this->storage = new Session(false);

		$this->sparql = is_null($sparql) ? new Sparql : $sparql;

		/** @var $serviceFactory \OAuth\ServiceFactory An OAuth service factory. */
		$serviceFactory = new \OAuth\ServiceFactory();

		// Setup the credentials for the requests
		$this->credentials = new Credentials(
			Config::get('github.key'),
			Config::get('github.secret'),
			$this->currentUri->getAbsoluteUri()
		);

		// Instantiate the GitHub service using the credentials, http client and storage mechanism for the token
		/** @var $gitHub GitHub */
		$this->github = $serviceFactory->createService('GitHub',
			$this->credentials,
			$this->storage,
			array('user:email')
		);

		// $this->storage->hasAccessToken('GitHub') &&

		if (isset($_COOKIE['uotoken'])) {
			$this->setUserFromToken($_COOKIE['uotoken']);
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
			$token = $this->sparql->generateUserToken($this->profile['username'][0]);
			setcookie('uotoken', $token, time() + 86400, '/');

			header('Location: ' . $this->getCurrentUri());
			exit;

		} elseif (isset($input['logout'])) {
			$this->logout();
			header('Location: ' . $this->getCurrentUri());
			exit;

		} elseif (isset($input['login'])) {
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

	public function getUserUri()
	{
		return $this->profile ? $this->profile['uri'] : null;
	}

	public function setUserFromToken($token)
	{
		$this->profile = $this->sparql->findUser(null, $token) ?: null;		
	}

	protected function setUser($username) {
		$this->profile = $username ? $this->sparql->findOrCreateUser($username) : null;
	}

	// public function getUser()
	// {
	// 	return $this->profile;
	// }

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
		return $this->getCurrentUri() . '?logout';
	}

	public function getLoginUrl()
	{
		return $this->getCurrentUri() . '?login';
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
		setcookie('uotoken', '', time() - 3600, '/');
		$this->setUser(null);
		header('Location: https://github.com/logout');
		exit();
	}

}

