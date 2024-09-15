
import { NodeType, OperatorType } from '@pabage/parser';
import { DefNode, Frame, InitStage, ObjectType } from './context.js';
import { makeError, resultError, resultValue, addTokenIfNot } from './util.js';


function setupRuntime(context) {
	// do import
	for (const entry of context.toImport) {
		let result;
		do {
			result = context.findObjAtPath(entry.def_node, entry.name, entry.path);
			if (!result.err) break;
			result = context.findObjAtPath(context.global, entry.name, entry.path);
			if (!result.err) break;

			addTokenIfNot(result.err, entry.token);
			return result.err;
		} while (false);
		const def = result.value;

		result = entry.def_node.add(entry.name, def.value);
		if (result.err) return result.err;
	}
	delete context.toImport;

	// do var init
	for (const entry of context.toInit) {
		const def_node = entry.def_node, name = entry.name;
		const result = def_node.get(name);
		if (result.err) {
			addTokenIfNot(result.err, entry.token);
			return result.err;
		}
		const def = result.value;
		if (!def) return makeError(`cannot find '${name}'`, entry.token);
		if (def.initInfo) {
			const initInfo = def.initInfo;
			if (initInfo.stage === InitStage.AFTER) {
				delete def.initInfo;
				continue;
			} else if (initInfo.stage === InitStage.BEFORE) {
				if (initInfo.init_expr) {
					initInfo.stage = InitStage.WORKING;
					context.stack = [ new Frame(def.def_node) ];
					let result = evaluate(context, initInfo.init_expr);
					if (result.err) {
						addTokenIfNot(result.err, entry.token);
						return result.err;
					}
					initInfo.stage = InitStage.AFTER;
					result = def.setForce(result.value);
					if (result.err) {
						addTokenIfNot(result.err, entry.token);
						return result.err;
					}
				} else {
					return makeError(`cannot init '${name}': no init expression`, entry.token);
				}
			} else {
				return makeError(`wrong init stage of '${name}'`, entry.token);
			}
		} else {
			continue;
		}
	}
	delete context.toInit;
}

function func_call(context, func, args) {
	let result = context.stackPeek();
	if (result.err) return result;
	const frame = result.value;

	const def_node = new DefNode(frame.def_node, frame.def_node.name);
	for (let i = 0; i < func.args.length; i++) {
		const arg_name = func.args[i];
		const result = def_node.add(arg_name, args[i], false);
		if (result.err) {
			addTokenIfNot(result.err, func.body.token);
			return result;
		}
	}
	frame.local_nodes.push(def_node);

	for (const node of func.body.nodes) {
		let result, err;
		switch (node.type) {
			case NodeType.VAR_DEF:
				const var_name = node.name;
				if (def_node.has(var_name)) {
					return resultError(`'${var_name}' is already defined in this scope`, node.token);
				}

				if (node.constant && !node.init) {
					return resultError('defining constant without initialization', node.token);
				}

				if (node.init) {
					result = evaluate(context, node.init);
					if (result.err) return result;
					const value = result.value;

					result = def_node.add(var_name, value, node.constant);
				} else {
					result = def_node.add(var_name, { type: ObjectType.UNDEF }, node.constant);
				}

				if (result.err) {
					addTokenIfNot(result, node.token);
					return result;
				}
				break;
			case NodeType.EXPR_FUNC_CALL:
				result = evaluate(context, node);
				if (result.err) {
					addTokenIfNot(result.err, node.token);
					return result;
				}
				break;
			case NodeType.STAT_RETURN:
				if (node.arg) {
					result = evaluate(context, node.arg);
					return result;
				} else {
					return resultValue({ type: ObjectType.UNDEF });
				}
			default:
				return resultError(`cannot execute node of type '${node.type}'`, node.token);
		}
	}

	return resultValue({ type: ObjectType.UNDEF });
}

function evaluate(context, expr) {
	let result, err;
	switch (expr.type) {
		case NodeType.EXPR_FUNC_CALL:
			// eval func
			result = evaluate(context, expr.func);
			if (result.err) {
				addTokenIfNot(result.err, expr.token);
				return result;
			}
			const func = result.value;
			if (func.type === ObjectType.FUNC) {
				if (expr.args.length !== func.args.length) {
					return resultError(`function argument count does not match: expected ${func.args.length} but got ${expr.args.length}`, expr.token);
				}

				// eval args
				const args = [];
				for (const arg_node of expr.args) {
					result = evaluate(context, arg_node);
					if (result.err) {
						addTokenIfNot(result.err, arg_node.token);
						return result;
					}
					args.push(result.value);
				}

				// prepare frame
				const frame = new Frame(func.def_node);
				err = context.stackPush(frame);
				if (err) return { err: err };
				const funcResult = func_call(context, func, args);
				if (funcResult.err) return funcResult;

				// destroy frame
				result = context.stackPop();
				if (result.err) return result.err;

				return funcResult;
			} else if (func.type === ObjectType.NATIVE_FUNC) {
				if (expr.args.length !== func.arg_types.length) {
					return resultError(`native function argument count does not match: expected ${func.arg_types.length} but got ${expr.args.length}`, expr.token);
				}

				// eval args
				const args = [];
				for (const arg_node of expr.args) {
					result = evaluate(context, arg_node);
					if (result.err) {
						addTokenIfNot(result.err, arg_node.token);
						return result;
					}
					args.push(result.value);
				}

				// convert to native types
				const native_args = [];
				for (let i = 0; i < func.arg_types.length; i++) {
					const arg = args[i], arg_type = func.arg_types[i];
					if (arg.type !== arg_type) {
						return resultError(`native function argument type does not match: expected '${arg_type}', got '${arg.type}'`, expr.token);
					}
					switch(arg_type) {
						case ObjectType.NUMBER:
							native_args.push(arg.value);
							break;
						case ObjectType.STRING:
							native_args.push(arg.value);
							break;
						default:
							return resultError(`object type '${arg_type}' cannot be passed to native function`, expr.token);
					}
				}

				const native_ret = func.handle(...native_args);
				switch(func.ret_type) {
					case ObjectType.UNDEF:
						return resultValue({ type: ObjectType.UNDEF });
					case ObjectType.NUMBER:
						return resultValue({ type: ObjectType.NUMBER, value: native_ret });
					case ObjectType.STRING:
						return resultValue({ type: ObjectType.STRING, value: native_ret });
					default:
						return resultError(`result of native function cannot be converted to type '${func.ret_type}'`, expr.token)
				}
			} else {
				return resultError(`object type '${func.type}' not callable`, expr.token);
			}
		case NodeType.EXPR_BINARY:
			result = evaluate(context, expr.arg1);
			if (result.err) return result;
			const v1 = result.value;

			result = evaluate(context, expr.arg2);
			if (result.err) return result;
			const v2 = result.value;

			if (!(v1.type === ObjectType.NUMBER && v2.type === ObjectType.NUMBER)) {
				return resultError(`can only perform operation on two numbers, but got '${v1.type}' and '${v2.type}'`, expr.token);
			}

			let v;
			switch (expr.operator) {
				case OperatorType.PLUS:
					v = v1.value + v2.value;
					break;
				case OperatorType.MULTIPLY:
					v = v1.value * v2.value;
					break;
				default:
					return resultError(`unknown binary operator '${expr.operator}'`, expr.token);
			}

			return resultValue({ type: ObjectType.NUMBER, value: v });
		case NodeType.IDENTIFIER:
			result = context.findObj(expr.name);
			if (result.err) return result;
			const def = result.value;
			if (def.initInfo) {
				const initInfo = def.initInfo;
				if (initInfo.stage === InitStage.AFTER) {
					delete def.initInfo;
				} else if (initInfo.stage === InitStage.BEFORE) {
					if (initInfo.init_expr) {
						initInfo.stage = InitStage.WORKING;
						if (err) return err;
						let result = evaluate(context, initInfo.init_expr);
						if (result.err) return result.err;
						initInfo.stage = InitStage.AFTER;
						result = def.setForce(result.value);
						if (result.err) return result.err;
					} else {
						return makeError(`cannot init '${expr.name}': no init expression`, expr.token);
					}
				} else {
					return makeError(`wrong init stage of '${expr.name}'`, expr.token);
				}
			}
			return resultValue(def.value);
		case NodeType.LIT_NUMBER:
			return resultValue({ type: ObjectType.NUMBER, value: expr.value });
		case NodeType.LIT_STRING:
			return resultValue({ type: ObjectType.STRING, value: expr.value });
		default:
			return resultError(`cannot evaluate expression of type '${expr.type}'`, expr.token);
	}
}

export {
	setupRuntime, func_call, evaluate
}
