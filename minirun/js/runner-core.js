
const util = require('./util');
const makeError = util.makeError, resultValue = util.resultValue, resultError = util.resultError;

const transformer = require('./transormer');
const NodeType = transformer.NodeType, OperatorType = transformer.OperatorType;

const ObjectType = {
	OBJECT:		1,	// value
	FUNC:		2,	// args, body, path
	NATIVE_FUNC:	3,	// arg_types, ret_type, handle
	UNDEF:		10,
	NUMBER: 	11,	// value,
	STRING:		12,	// value,
};

const objTypeName = {};
objTypeName[ObjectType.OBJECT] =	'object';
objTypeName[ObjectType.FUNC] =	 	'function';
objTypeName[ObjectType.NATIVE_FUNC] =	'native function';
objTypeName[ObjectType.UNDEF] =		'undefined';
objTypeName[ObjectType.NUMBER] =	'number';
objTypeName[ObjectType.STRING] =	'string';

const msg_internal_error = 'internal error';
const msg_stack_empty = 'empty stack';
const msg_stack_exceed = 'max stack size reached';


function copyObj(obj) {
	return Object.assign({}, obj);
}

function getNativeValue(obj) {
	let value = undefined;
	switch (obj.type) {
		case ObjectType.OBJECT:
			value = getNativeValue(obj.value);
			break;
		case ObjectType.FUNC:
			value = obj.body;
			break;
		case ObjectType.NATIVE_FUNC:
			value = obj.handle;
			break;
		case ObjectType.UNDEF:
			value = undefined;
			break;
		case ObjectType.NUMBER:
			value = obj.value;
			break;
		case ObjectType.STRING:
			value = obj.value;
			break;
	}
	return value;
}

function toString(obj) {
	let s = '[unknown]';
	switch (obj.type) {
		case ObjectType.OBJECT:
			s = toString(obj.value);
			break;
		case ObjectType.FUNC:
			s = '[function]';
			break;
		case ObjectType.NATIVE_FUNC:
			s = `${obj.handle}`;
			break;
		case ObjectType.UNDEF:
			s = `undefined`;
			break;
		case ObjectType.NUMBER:
			s = `${obj.value}`;
			break;
		case ObjectType.STRING:
			s = obj.value;
			break;
	}
	return s;
}

function convertValue(value, targetType) {
	if (value.type === targetType) return value;

	switch (targetType) {
		case ObjectType.OBJECT:
			return {
				type:	ObjectType.OBJECT,
				value:	value,
			};
	}

	return undefined;
}


function stackPush(context, obj) {
	if (context.stack.length >= context.maxStackSize) {
		return false;
	}
	context.stack.push(obj);
	return true;
}

function stackPop(context) {
	if (context.stack && context.stack.length > 0) {
		return context.stack.pop();
	} else {
		return undefined;
	}
}

function stackPeek(context) {
	if (context.stack && context.stack.length > 0) {
		return context.stack[context.stack.length - 1];
	} else {
		return undefined;
	}
}

function resultUndefined() {
	return resultValue({
		type:	ObjectType.UNDEF,
	});
}

function addTokenIfError(result, token) {
	if (result.err) {
		if (!result.err.token)
			result.err.token = token;
	}
	return result;
}

function getPathFrame(context, path = undefined) {
	if (!path) path = context.path;
	if (path) {
		let tree = context.root;
		for (let name of path) {
			let sub_tree = tree.tree[name];
			if (!sub_tree) {
				sub_tree = {
					tree:	{},
					defs:	{},
				};
				tree.tree[name] = sub_tree;
			}
			tree = sub_tree;
		}
		return tree.defs;
	} else {
		return context.root.defs;
	}
}

function getVarHanlde(context, name, path) {
	let handle, frame;

	if (path) {
		frame = getPathFrame(context, path);
		return frame[name];
	}

	const stack = context.stack;
	for (let i = stack.length - 1; i >= 0; i--) {
		frame = stack[i];
		if (handle = frame[name]) return handle;
	}

	frame = context.root.defs;
	if (handle = frame[name]) return handle;

	frame = getPathFrame(context);
	if (frame) {
		handle = frame[name];
		if (handle) return handle;
	}
}

function getVar(context, name, path = undefined) {
	const varHandle = getVarHanlde(context, name, path);

	if (varHandle) {
		return resultValue(copyObj(varHandle.value));
	} else {
		return resultError(`cannot find variable '${name}'`);
	}
}

function setVarAtHandle(handle, name, value) {
	if (handle.constant) {
		return resultError(`cannot modify constant '${name}'`);
	} else {
		const oldValue = handle.value;
		handle.value = value;
		return resultValue(oldValue);
	}
}

function addVar(frame, name, value, constant = false, path = undefined) {
	const varHandle = frame[name];

	if (varHandle) {
		return resultError(`variable '${name}' is already defined`);
	} else {
		frame[name] = {
			constant:	constant,
			value:		value,
		};
		if (path) {
			frame[name].path = path;
		}
		return resultValue(frame[name]);
	};
}

function setVar(frame, name, value) {
	const varHandle = frame[name];

	if (varHandle) {
		return setVarAtHandle(varHandle, name, value);
	} else {
		return resultError(`cannot find variable '${name}'`);
	}
}

function computeBinary(operator, arg1, arg2) {
	let result = resultError(msg_internal_error);
	let v, v1, v2;
	switch (arg1.type) {
		case ObjectType.NUMBER:
			const _arg2 = convertValue(arg2, ObjectType.NUMBER);
			if (!_arg2) {
				result = resultError(`cannot convert type [${objTypeName[arg2.type]}] to type [number]`);
				break;
			}
			v1 = arg1.value, v2 = _arg2.value;
			switch (operator) {
				case OperatorType.PLUS:
					v = v1 + v2;
					break;
				case OperatorType.MINUS:
					v = v1 - v2;
					break;
				case OperatorType.MULTIPLY:
					v = v1 * v2;
					break;
				case OperatorType.DIVIDE:
					v = v1 / v2;
					break;
			}
			if (v) {
				result = resultValue({
					type:	ObjectType.NUMBER,
					value:	v,
				});
			} else {
				result = resultError('invalid operation on number');
			}
			break;
		case ObjectType.STRING:
			if (operator === OperatorType.PLUS) {
				result = resultValue({
					type:	ObjectType.STRING,
					value:	arg1.value + toString(arg2),
				});
			} else {
				result = resultError('invalid operation on string')
			}
			break;
		default:
			result = resultError(`don't know how to perform binary operation on type [${objTypeName[arg1.type]}] and type [${objTypeName[arg2.type]}]`);
	}
	return result;
}

function evaluate(context, node) {
	let result = resultError(msg_internal_error);

	const frame = stackPeek(context);
	if (frame === undefined) return resultError(msg_stack_empty);

	switch (node.type) {
		case NodeType.FUNC_CALL:
			result = evaluate(context, node.func);
			if (result.err) break;
			const func = result.value;
			if (func.type !== ObjectType.NATIVE_FUNC && func.type !== ObjectType.FUNC) {
				result = resultError('object not callable', node.token);
				break;
			}

			const expected_arg_count = func.type === ObjectType.NATIVE_FUNC ? func.arg_types.length : func.args.length;
			if (node.args.length !== expected_arg_count) {
				result = resultError(`expected ${expected_arg_count} argument(s) but passed ${node.args.length} arguments(s)`, node.token);
			}

			const arg_values = [];
			for (const arg of node.args) {
				result = evaluate(context, arg);
				addTokenIfError(result, node.token);
				if (result.err) break;
				arg_values.push(result.value);
			}
			if (result.err) break;

			if (func.type === ObjectType.NATIVE_FUNC) {
				const native_args = [];
				for (let i = 0; i < func.arg_types.length; i++) {
					const expected_type = func.arg_types[i];
					const arg_value_type = arg_values[i].type;
					const arg_value = convertValue(arg_values[i], expected_type);
					if (!arg_value) {
						result = resultError(`type [${objTypeName[arg_value_type]}] cannot be converted to expected type [${objTypeName[expected_type]}]`, node.args[i].token);
						break;
					}
					native_args.push(getNativeValue(arg_value));
				}
				if (result.err) break;

				const value = func.handle(...native_args);
				result = resultValue({
					type:	func.ret_type,
					value:	value,
				});
			} else if (func.type === ObjectType.FUNC) {
				result = func_call(context, func, arg_values);
			}
			break;
		case NodeType.EXPR_UNARY:
			const arg = node.arg;
			result = evaluate(context, arg);
			if (result.err) break;
			const value = result.value;

			switch (node.operator) {
				default:
					result = resultError('unrecognized unary operation', node.token);
			}
			break;
		case NodeType.EXPR_BINARY:
			const arg1 = node.arg1, arg2 = node.arg2;

			if (node.operator === OperatorType.ASSIGN) {
				if (arg1.type !== NodeType.IDENTIFIER) {
					result = resultError('unassignable left value', arg1.token);
					break;
				}
				const name = arg1.name;

				result = evaluate(context, arg2);
				if (result.err) break;

				result = setVar(frame, name, result.value);
				addTokenIfError(result, arg1.token);
			} else {
				result = evaluate(context, arg1);
				if (result.err) break;
				const value1 = result.value;

				result = evaluate(context, arg2);
				if (result.err) break;
				const value2 = result.value;

				result = computeBinary(node.operator, value1, value2);
				addTokenIfError(result, node.token);
			}
			break;
		case NodeType.IDENTIFIER:
			result = getVar(context, node.name);
			break;
		case NodeType.LIT_NUMBER:
			result = resultValue({
				type:	ObjectType.NUMBER,
				value:	node.value,
			});
			break;
		case NodeType.LIT_STRING:
			result = resultValue({
				type:	ObjectType.STRING,
				value:	node.value,
			});
			break;
		default:
			result = resultError('unrecognized node type', node.token);
	}
	return result;
}


function func_call(context, func, args) {
	const path_orig = context.path;
	context.path = func.path;
	if (func.body.nodes.length === 0) return resultUndefined();

	if (!stackPush(context, {})) return resultError(msg_stack_exceed);

	const frame = stackPeek(context);
	if (frame === undefined) return resultError(msg_stack_empty);

	let result = resultError(msg_internal_error);

	for (let i = 0; i < func.args.length; i++) {
		result = addVar(frame, func.args[i], args[i], false);
		if (result.err) return result;
	}

	let should_return = false;

	for (const node of func.body.nodes) {
		switch (node.type) {
			case NodeType.STAT_RETURN:
				should_return = true;
				if (node.arg) {
					result = evaluate(context, node.arg);
				} else {
					result = resultUndefined();
				}
				break;
			case NodeType.VAR_DEF:
				const frame = stackPeek(context);
				if (node.init) {
					result = evaluate(context, node.init);
					if (result.err) break;
					result = addVar(frame, node.name, result.value, node.constant);
					addTokenIfError(result, node.token);
					if (result.err) break;
					result = resultUndefined();
				} else {
					result = addVar(frame, node.name, {
						type:	ObjectType.UNDEF,
					}, node.constant);
					addTokenIfError(result, node.token);
					if (result.err) break;
					result = resultUndefined();
				}
				break;
			default:
				result = evaluate(context, node);
		}

		if (should_return || result.err) {
			stackPop(context);
			return result;
		}
	}

	if (stackPop(context) === undefined) return resultError(msg_stack_empty);

	context.path = path_orig;

	return result;
}

function addNativeFunction(frame, name, arg_types, ret_type, handle) {
	frame[name] = {
		constant:	true,
		value:		{
			type:		ObjectType.NATIVE_FUNC,
			arg_types:	arg_types,
			ret_type:	ret_type,
			handle:		handle,
		}
	};
}

function initNativeFunctions(context) {
	addVar(context.root.defs, 'e', { type: ObjectType.NUMBER, value: Math.E}, true);
	addVar(context.root.defs, 'pi', { type: ObjectType.NUMBER, value: Math.PI}, true);

	addNativeFunction(context.root.defs, 'min', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.min);
	addNativeFunction(context.root.defs, 'max', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.max);
	addNativeFunction(context.root.defs, 'exp', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.exp);
	addNativeFunction(context.root.defs, 'cos', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.cos);
	addNativeFunction(context.root.defs, 'sin', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.sin);
	addNativeFunction(context.root.defs, 'log', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.log);
	addNativeFunction(context.root.defs, 'log10', [ ObjectType.NUMBER ], ObjectType.NUMBER, Math.log10);
	addNativeFunction(context.root.defs, 'pow', [ ObjectType.NUMBER, ObjectType.NUMBER ], ObjectType.NUMBER, Math.pow);

	addNativeFunction(context.root.defs, 'print', [ ObjectType.OBJECT ], ObjectType.UNDEF, o => process.stdout.write(`${o}`));
}

function initDefs(context, node) {
	let nodes = [];
	const path_orig = context.path;
	if (node.type === NodeType.ROOT) {
		let file_ns_node;
		for (const child of node.nodes) {
			if (child.type === NodeType.NS && !child.body) {
				if (!file_ns_node) {
					file_ns_node = child;
				} else {
					return makeError('file-scope namespace already declared before', child.token);
				}
			}
		}
		if (file_ns_node) {
			context.path = file_ns_node.path;
		} else {
			context.path = [];
		}

		nodes = node.nodes;
	} else if (node.type === NodeType.NS) {
		const body = node.body;
		context.path = path_orig.concat(node.path);
		if (body.type === NodeType.CHUNK) {
			nodes = body.nodes;
		} else {
			return makeError('expected a chunk', body.token);
		}
	}

	const frame = getPathFrame(context);

	let err = undefined, result;
	for (const child of nodes) {
		switch (child.type) {
			case NodeType.NS:
				if (child.body) {
					err = initDefs(context, child);
				} else if (node.type !== NodeType.ROOT) {
					err = makeError('file-scope namespace can only be declared at file level', child.token);
				}
				break;
			case NodeType.FUNC_DEF:
				const func = {
					type:	ObjectType.FUNC,
					args:	child.args,
					body:	child.body,
					path:	context.path,
				};
				result = addVar(frame, child.name, func, true, context.path);
				break;
			case NodeType.VAR_DEF:
				if (child.init) {
					result = evaluate(context, child.init);
					if (result.err) break;
					result = addVar(frame, child.name, result.value, child.constant, context.path);
					addTokenIfError(result, child.token);
					if (result.err) break;
					result = resultUndefined();
				} else {
					result = addVar(frame, child.name, {
						type:	ObjectType.UNDEF,
					}, child.constant, context.path);
					addTokenIfError(result, child.token);
					if (result.err) break;
					result = resultUndefined();
				}
				break;
			default:
				return makeError('not a variable/function definition', child.token);
		}
		if (result && result.err) err = result.err;
		if (err) break;
	}

	context.path = path_orig;

	return err;
}

function run(ast, entry) {
	const context = {
		root:	{
			tree:	{},
			defs:	{},
		},

		maxStackSize:	1000,
		stack:		[],

		path:	[],
	};

	if (ast.type !== NodeType.ROOT) {
		return resultError('should pass in a root node');
	}

	initNativeFunctions(context);

	stackPush(context, {});
	let err = initDefs(context, ast);
	stackPop(context);
	if (err) return { err: err };

	const entry_name = entry[entry.length - 1];
	const entry_path = entry.slice(0, entry.length - 1);

	const result = getVar(context, entry_name, entry_path);
	if (result.err) return result;

	const obj = result.value;
	if (obj.type === ObjectType.FUNC || obj.type === ObjectType.NATIVE_FUNC) {
		return func_call(context, obj, []);
	} else {
		return resultError(`'${entry.join('.')}' is not a function`);
	}
}

module.exports = {
	ObjectType:	ObjectType,
	run:	run,
};
