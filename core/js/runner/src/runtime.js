
import { NodeType } from '@pabage/parser';
import { DefNode, Frame, InitStage, ObjectType } from './context.js';
import { makeError, resultError, resultValue } from './util.js';


function setupRuntime(context) {
	// do import
	for (const entry of context.toImport) {
		let result;
		do {
			result =  context.findObjAtPath(entry.def_node, entry.name, entry.path);
			if (!result.err) break;
			result = context.findObjAtPath(context.global, entry.name, entry.path);
			if (!result.err) break;

			return result.err;
		} while (false);
		const obj = result.value;

		result = entry.def_node.add(entry.name, obj);
		if (result.err) return result.err;
	}

	// do var init
	for (const entry of context.toInit) {
		const def_node = entry.def_node, name = entry.name;
		const def = def_node.getRaw(name);
		if (!def) return makeError(`cannot find '${name}'`);
		if (def.initInfo) {
			const initInfo = def.initInfo;
			if (initInfo.stage === InitStage.AFTER) {
				delete def.initInfo;
				continue;
			} else if (initInfo.stage === InitStage.BEFORE) {
				if (initInfo.init_expr) {
					initInfo.stage = InitStage.WORKING;
					context.stack = [ def.def_node ];
					let result = evaluate(context, initInfo.init_expr);
					if (result.err) return result.err;
					initInfo.stage = InitStage.AFTER;
					result = def.setForce(result.value);
					if (result.err) return result.err;
				} else {
					return makeError('cannot init: no init expression');
				}
			} else {
				return makeError('wrong init stage');
			}
		} else {
			continue;
		}
	}
}

function func_call(context, func, args) {
	let result = context.stackPeek();
	if (result.err) return result;
	const frame = result.value;

	const node = new DefNode(frame.def_node, frame.def_node.name);
	for (let i = 0; i < func.args.length; i++) {
		const arg_name = func.args[i];
		const result = node.add(arg_name, args[i], false);
		if (result.err) return result;
	}
	frame.local_nodes.push(node);

	for (const node of func.body.nodes) {
		let result, err;
		switch (node.type) {
			case NodeType.EXPR_FUNC_CALL:
				// eval func
				result = evaluate(context, node.func);
				if (result.err) return result;
				const func = result.value;
				if (func.type === ObjectType.FUNC) {
					if (node.args.length !== func.args.length) {
						return resultError(`function argument count does not match: expected ${func.args.length} but got ${node.args.length}`);
					}

					// eval args
					const args = [];
					for (const arg_node of node.args) {
						result = evaluate(context, arg_node);
						if (result.err) return result;
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
					if (node.args.length !== func.arg_types.length) {
						return resultError(`native function argument count does not match: expected ${func.arg_types.length} but got ${node.args.length}`);
					}

					// eval args
					const args = [];
					for (const arg_node of node.args) {
						result = evaluate(context, arg_node);
						if (result.err) return result;
						args.push(result.value);
					}

					// convert to native types
					const native_args = [];
					for (let i = 0; i < func.arg_types.length; i++) {
						const arg = args[i], arg_type = func.arg_types[i];
						if (arg.type !== arg_type) {
							return resultError(`native function argument type does not match: expected '${arg_type}', got '${arg.type}'`);
						}
						switch(arg_type) {
							case ObjectType.NUMBER:
								native_args.push(arg.value);
								break;
							case ObjectType.STRING:
								native_args.push(arg.value);
								break;
							default:
								return resultError(`object type '${arg_type}' cannot be passed to native function`);
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
							return resultError(`result of native function cannot be converted to type '${func.ret_type}'`)
					}
				} else {
					return resultError(`object type '${func.type}' not callable`);
				}

			case NodeType.STAT_RETURN:
				if (node.arg) {
					result = evaluate(context, node.arg);
					return result;
				} else {
					return resultValue({ type: ObjectType.UNDEF });
				}
			default:
				return resultError(`cannot execute node of type '${node.type}'`);
		}
	}
}

function evaluate(context, expr) {
	switch (expr.type) {
		case NodeType.IDENTIFIER:
			return context.findObj(expr.name);
		case NodeType.LIT_NUMBER:
			return resultValue({ type: ObjectType.NUMBER, value: expr.value });
		case NodeType.LIT_STRING:
			return resultValue({ type: ObjectType.STRING, value: expr.value });
		default:
			return resultError(`cannot evaluate expression of type '${expr.type}'`);
	}
}

export {
	setupRuntime, func_call, evaluate
}
