
function resultValue(value) {
	return {
		value:	value,
	};
}

function resultError(msg, token = undefined) {
	const err = {
		msg:	msg,
	};
	if (token) err.token = token;
	return {
		err:	err,
	};
}

module.exports = {
	resultValue:	resultValue,
	resultError:	resultError,
};
