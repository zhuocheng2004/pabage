
import { ObjectType } from "../src/context.js";


function initIO(context) {
	const path = [ 'core', 'io' ];
	let result;

	result = context.registerNativeFunction(path, 'print', [ ObjectType.STRING ], ObjectType.UNDEF, s => process.stdout.write(s));
	if (result.err) return result.err;

	result = context.registerNativeFunction(path, 'numberToString', [ ObjectType.NUMBER ], ObjectType.STRING, x => `${x}`);
	if (result.err) return result.err;
}

function initMath(context) {
	const path = [ 'core', 'math' ];
	let result;

	result = context.registerNativeFunction(path, 'cos', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.cos);
	if (result.err) return result.err;

	result = context.registerNativeFunction(path, 'sin', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.sin);
	if (result.err) return result.err;
}

export const info = {
	name:	'core_lib'
}

export function init(context) {
	let err;

	err = initIO(context);
	if (err) return err;

	err = initMath(context);
	if (err) return err;
}

export function exit(context) { }
