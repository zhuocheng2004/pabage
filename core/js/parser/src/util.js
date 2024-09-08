
function makeError(msg, token = undefined) {
	const err = {
		msg:	msg,
	};
	if (token) err.token = token;
	return err;
}

export {
	makeError
};
