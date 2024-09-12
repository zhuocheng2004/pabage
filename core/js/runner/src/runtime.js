
import { NodeType } from '@pabage/parser';
import { DefNode, Frame, InitStage, ObjectType } from './context.js';
import { makeError, resultError, resultValue } from './util.js';


function setupRuntime(context) {
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
					context.stack = [ def.def_node ];
					let result = evaluate(context, initInfo.init_expr);
					if (result.err) return result.err;
					result = def.setForce(result.value);
					if (result.err) result.err;
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
