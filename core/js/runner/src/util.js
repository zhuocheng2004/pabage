
function makeError(msg, token = undefined) {
	const err = {
		msg:	msg,
	};
	if (token) err.token = token;
	return err;
}

function resultValue(value) {
	return { value: value };
}

function resultError(msg, token = undefined) {
	return { err: makeError(msg, token) };
}

function addTokenIfNot(result, token) {
	if (result.err && !result.err.token) {
		result.err.token = token;
	}
	return result;
}

export {
	makeError,
	resultValue, resultError,
	addTokenIfNot
};
