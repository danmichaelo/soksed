<?php namespace Scriptotek\RtWp;

use OAuth\Common\Http\Uri\UriFactory;

class Base
{
	protected $currentUri;
	
	function __construct()
	{	
    	/**
		 * Create a new instance of the URI class with the current URI, stripping the query string
		 */
		$uriFactory = new \OAuth\Common\Http\Uri\UriFactory();
		$this->currentUri = $uriFactory->createFromSuperGlobalArray($_SERVER);
		$this->currentUri->setQuery('');
	}

	public function getCurrentUri()
	{
		return $this->currentUri->getAbsoluteUri();
	}

}