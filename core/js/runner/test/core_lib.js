
import { ObjectType } from "../src/context.js";

export function init(context) {
	const result = context.registerNativeFunction([ 'core', 'io' ], 'print', [ ObjectType.STRING ], ObjectType.UNDEF, console.log);
	return result.err;
}

export function exit(context) { }
