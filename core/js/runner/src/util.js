
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

function addTokenIfNot(err, token) {
	if (err && !err.token) {
		err.token = token;
	}
	return err;
}

export {
	makeError,
	resultValue, resultError,
	addTokenIfNot
};
