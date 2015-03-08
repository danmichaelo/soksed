<?php namespace Scriptotek\RtWp;

use Rhumsaa\Uuid\Uuid;

/**
* Concept
*/
class Concept
{
	protected $sparql;
	protected $auth;
	protected $uri;
	protected $data;
	protected $error;

	function __construct($uri, $auth, $sparql = null, $logger = null)
	{
		$this->uri = $uri;
		$this->auth = $auth;
		$this->sparql = is_null($sparql) ? new Sparql : $sparql;
		$this->logger = is_null($logger) ? new Logger : $logger;
		$x = $this->sparql->getConcept($this->uri);
		if (isset($x['data'])) {
			$this->data = $x['data'];
		} else {
			$this->error = array_get($x, 'error', 'Unknown error');
		}
	}

	public function getData()
	{
		return $this->data;
	}

	public function toArray()
	{
		if (isset($this->data)) {
			return ['concept' => $this->data];
		} else {
			return ['error' => $this->error];		
		}
	}

	public function generateLabeluri()
	{
		$uuid1 = Uuid::uuid1();
		return 'http://data.ub.uio.no/realfagstermer/t' . $uuid1->toString();
	}

	protected function normalizeLabelList($labels)
	{
		$out = [];
		foreach ($labels as $lang => $values)
		{
			foreach ($values as $label) {
				$o = [];
				$o['language'] = isset($label['language']) ? $label['language'] : $lang;
				$o['value'] = array_get($label, 'value', '');
				if (isset($label['uri'])) {
					$o['uri'] = $label['uri'];
				} else {
					$o['uri'] = $this->generateLabelUri(); 
				}
				foreach ($label as $k => $v) {
					if (!in_array($k, ['language', 'value', 'uri', 'readonly', 'graph', 'hints'])) {
						$o[$k] = $v;
					}
				}
				if (!empty($o['value'])) {
					$out[] =  $o;
				}
			}
		}
		return $out;
	}

	public static function compareLabels($a, $b)
	{
		$x = strcmp($a['uri'], $b['uri']);
		if ($x != 0) return $x;
		$x = strcmp($a['value'], $b['value']);
		if ($x != 0) return $x;
		$x = strcmp($a['language'], $b['language']);
		return $x;
	}

	protected function compareLabelLists($list1, $list2)
	{
		$labels1 = $this->normalizeLabelList($list1);
		$labels2 = $this->normalizeLabelList($list2);

		$removed = array_udiff($labels1, $labels2, 'Scriptotek\RtWp\Concept::compareLabels');
		$added = array_udiff($labels2, $labels1, 'Scriptotek\RtWp\Concept::compareLabels');

		return [$removed, $added];
	}

	public function putData($data)
	{
		if ($data['uri'] != $this->data['uri']) {
			// Input is not sane!
			$this->logger->error(sprintf('Concept.putData: URI <%s> does not match <%s>.',
	                             $data['uri'], $this->data['uri']));
			return 'uri_mismatch';
		}
		if (array_get($data, 'modified') != array_get($this->data, 'modified')) {
			// The concept has been modified by some other user
			// while the current user has been working.
			$this->logger->error(sprintf('Concept.putData: <%s> Request date "%s" does not match store date "%s".',
				                 $data['uri'], array_get($data, 'modified'), array_get($this->data, 'modified')));
			return 'edit_conflict';
		}

		// Update prefLabel
		$modified = false;

		list($removed, $added) = $this->compareLabelLists($this->data['prefLabel'],
			                                              $data['prefLabel']);
		if (count($removed) || count($added)) {
			if (!$this->sparql->updateLabels($this->auth->getProfile(), $data['uri'], 'prefLabel', $removed, $added)) {
				return 'update_preflabel_failed';
			}
			$modified = true;
		}


		// Update altLabel
		list($removed, $added) = $this->compareLabelLists($this->data['altLabel'],
			                                              $data['altLabel']);

		if (count($removed) || count($added)) {
			if (!$this->sparql->updateLabels($this->auth->getProfile(), $data['uri'], 'altLabel', $removed, $added)) {
				return 'update_altlabel_failed';
			}
			$modified = true;
		}

		// Update notes
		if (json_encode(array_get($this->data, 'editorialNote')) != json_encode(array_get($data, 'editorialNote'))) {
			$values = array_get($data, 'editorialNote');
			$values = array_filter($values, function($v) {
				if (empty($v['value'])) return false;
				return (!isset($v['readonly']) || !$v['readonly']);
			});
			$this->sparql->setProperty(
				$data['uri'],
				'skos:editorialNote',
				$values
			);
			$modified = true;
		}

		if ($modified) {
			$this->sparql->touchModificationDate($data['uri']);
		}

		return 'success';
	}
}