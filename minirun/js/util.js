
function resultValue(value) {
	return {
		value:	value,
	};
}

function makeError(msg, token = undefined) {
	const err = {
		msg:	msg,
	};
	if (token) err.token = token;
	return err;
}

function resultError(msg, token = undefined) {
	return {
		err: makeError(msg, token)
	};
}

module.exports = {
	makeError:	makeError,
	resultValue:	resultValue,
	resultError:	resultError,
};
