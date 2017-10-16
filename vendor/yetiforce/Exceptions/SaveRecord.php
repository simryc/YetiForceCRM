<?php
namespace App\Exceptions;

/**
 * Save record exception class
 * @package YetiForce.Exception
 * @copyright YetiForce Sp. z o.o.
 * @license YetiForce Public License 2.0 (licenses/License.html or yetiforce.com)
 * @author Mariusz Krzaczkowski <m.krzaczkowski@yetiforce.com>
 */
class SaveRecord extends \Exception
{

	public function __toString(): string
	{
		$test = parent::__toString();
		var_dump($this);
		return $test;
	}
}
