
const transformer = require('./transormer');
const NodeType = transformer.NodeType, OperatorType = transformer.OperatorType, getReadableAST = transformer.getReadableAST;

const ObjectType = {
	VAR: 		1,	// value,
	FUNC:		2,	// args, body
	NATIVE_FUNC:	3,	// arg_count, handle
};

const ValueType = {
	UNDEF:		1,
	NUMBER:		2,
};

function printAST(ast) {
	console.log(JSON.stringify(getReadableAST(ast), undefined, 4));
}

function stackPush(context, obj) {
	context.stack.push(obj);
}

function stackPop(context) {
	return context.stack.pop();
}

function stackPeek(context) {
	return context.stack[context.stack.length - 1];
}

function copyObj(obj) {
	let obj2;
	switch (obj.type) {
		case ObjectType.VAR:
			obj2 = {
				value:	obj.value,
			};
			break;
		case ObjectType.FUNC:
			obj2 = {
				args:	obj.args,
				body:	obj.body,
			};
			break;
		case ObjectType.NATIVE_FUNC:
			obj2 = {
				arg_count:	obj.arg_count,
				handle:		obj.handle,
			};
			break;
	}
	if (obj2) {
		obj2.type = obj.type;
	}
	return obj2;
}

function findObj(context, name) {
	let obj = undefined;

	const globals = context.globals, stack = context.stack;
	for (let i = stack.length - 1; i >= 0; i--) {
		const frame = stack[i];
		if (obj = frame[name]) return copyObj(obj);
	}

	if (obj = globals[name]) return copyObj(obj);

	return undefined;
}


function getNativeValue(obj) {
	let value = undefined;
	switch (obj.type) {
		case ObjectType.VAR:
			value = obj.value;
			break;
		case ObjectType.FUNC:
			value = obj.body;
			break;
		case ObjectType.NATIVE_FUNC:
			value = obj.handle;
			break;
	}
	return value;
}

function evaluate(context, node) {
	let result = undefined;

	switch (node.type) {
		case NodeType.FUNC_CALL:
			result = evaluate(context, node.func);
			if (result.err) break;
			const func = result.value;
			if (func.type !== ObjectType.NATIVE_FUNC && func.type !== ObjectType.FUNC) {
				result = {
					err:	{
						msg:	'object not callable',
						token:	node.token,
					}
				};
				break;
			}

			const expected_arg_count = func.type === ObjectType.NATIVE_FUNC ? func.arg_count : func.args.length;
			if (node.args.length !== expected_arg_count) {
				result = {
					err:	{
						msg:	`expected ${expected_arg_count} argument(s) but passed ${node.args.length} arguments(s)`,
						token:	node.token,
					}
				};
				break;
			}

			const arg_values = [];
			for (const arg of node.args) {
				result = evaluate(context, arg);
				if (result.err) break;
				arg_values.push(result.value);
			}
			if (result.err) break;

			if (func.type === ObjectType.NATIVE_FUNC) {
				const native_args = arg_values.map(getNativeValue);
				const value = func.handle(...native_args);
				result = {
					value:	value
				};
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
					result = {
						err:	{
							msg:	'unrecognized unary operation',
							token:	node.token,
						}
					}
			}
			break;
		case NodeType.EXPR_BINARY:
			const arg1 = node.arg1, arg2 = node.arg2;
			result = evaluate(context, arg1);
			if (result.err) break;
			const value1 = result.value;
			result = evaluate(context, arg2);
			if (result.err) break;
			const value2 = result.value;

			switch (node.operator) {
				case OperatorType.PLUS:
				case OperatorType.MINUS:
				case OperatorType.MULTIPLY:
				case OperatorType.DIVIDE:
					if (value1.type === ObjectType.VAR && value1.type === ObjectType.VAR) {
						const v1 = value1.value, v2 = value2.value;
						let v;
						switch (node.operator) {
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
						result = {
							value:	{
								type:	ObjectType.VAR,
								value:	v,
							}
						};
					};
					break;
				default:
					result = {
						err:	{
							msg:	'unrecognized binary operation',
							token:	node.token,
						}
					}
			}
			break;
		case NodeType.IDENTIFIER:
			const obj = findObj(context, node.name);
			if (!obj) {
				result = {
					err:	{
						msg:	`cannot find object '${node.name}'`,
						token:	node.token,
					}
				}

				break;
			} else {
				result = {
					value:	obj,
				};
			}
			break;
		case NodeType.LIT_NUMBER:
			result = {
				value:	node.value,
			}
			break;
		default:
			result = {
				err:	{
					msg:	'unrecognized node',
					token:	node.token,
				}
			};
	}
	return result;
}


function func_call(context, func, args) {
	stackPush(context, {});

	const frame = stackPeek(context);

	for (let i = 0; i < func.args.length; i++) {
		frame[func.args[i]] = copyObj(args[i]);
	}

	let result = {
		err:	'internal error',
	};

	for (const node of func.body.nodes) {
		switch (node.type) {
			case NodeType.STAT_RETURN:
				if (node.arg) {
					result = evaluate(context, node.arg);
				} else {
					result = {
						value:	undefined,
					};
				}
				break;
			case NodeType.VAR_DEF:
				const frame = stackPeek(context);
				if (frame[node.name]) {
					result = {
						err:	{
							msg:	`'${node.name}' is already defined locally`,
							token:	node.token,
						}
					};
					break;
				}

				const obj = {
					type:		ObjectType.VAR,
					constant:	node.constant,
					value:		undefined,
				};
				if (node.init) {
					result = evaluate(context, node.init);
					if (result.err) break;
					obj.value = result.value;
				}
				frame[node.name] = obj;
				break;
			default:
				result = evaluate(context, node);
		}

		if (result.err) {
			stackPop(context);
			return result;
		}
	}

	stackPop(context);

	return result;
}

function addNativeFunction(context, name, arg_count, handle) {
	context.globals[name] = {
		type:		ObjectType.NATIVE_FUNC,
		arg_count:	arg_count,
		handle:		handle,
		constant:	true,
	};
}

function initNativeFunctions(context) {
	addNativeFunction(context, 'cos', 1, Math.cos);
	addNativeFunction(context, 'sin', 1, Math.sin);
}

function run(ast, entry) {
	//printAST(ast);

	const context = {
		globals:	{},
		stack:		[],
	};

	if (ast.type !== NodeType.ROOT) {
		return {
			err:	{
				msg:	'should pass in a root node',
			}
		};
	}

	initNativeFunctions(context);

	for (const node of ast.nodes) {
		switch (node.type) {
			case NodeType.FUNC_DEF:
				if (context.globals[node.name]) return {
					err:	{
						msg:	`'${node.name}' is already defined`,
						token:	node.token,
					}
				};
				context.globals[node.name] = {
					type:		ObjectType.FUNC,
					constant:	true,
					args:		node.args,
					body:		node.body,
				};
				break;
			case NodeType.VAR_DEF:
				if (context.globals[node.name]) return {
					err:	{
						msg:	`'${node.name}' is already defined`,
						token:	node.token,
					}
				};
				const obj = {
					type:		ObjectType.VAR,
					constant:	node.constant,
					value:		undefined,
				};
				if (node.init) {
					const result = evaluate(context, node.init);
					if (result.err) return result;
					obj.value = result.value;
				}
				context.globals[node.name] = obj;
				break;
			default:
				return {
					err:	{
						msg:	'not a variable/function definition',
						token:	node.token,
					}
				};
		}
	}

	const obj = findObj(context, entry);
	if (obj) {
		if (obj.type === ObjectType.FUNC) {
			return func_call(context, obj, []);
		} else {
			return {
				err:	{
					msg:	`'${entry}' is not a function`
				}
			}
		}
	
	} else {
		return {
			err:	{
				msg:	`cannot find entry function '${entry}'`
			}
		};
	}
}

module.exports = {
	ObjectType:	ObjectType,
	ValueType:	ValueType,
	run:	run,
};
