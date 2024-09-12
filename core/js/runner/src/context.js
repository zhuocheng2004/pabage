
import { NodeType } from '@pabage/parser'
import { makeError, resultValue, resultError, addTokenIfNot }from './util.js'


const defaultOptions = {
	maxStackSize:	1000
};

export const ObjectType = {
	OBJECT:		'object',	// value
	FUNC:		'function',	// args, body, def_node
	NATIVE_FUNC:'native_function',	// arg_types, handle
	UNDEF:		'undefined',
	NATIVE:		'native_object',	// data
	NUMBER:		'number',	// value
	STRING:		'string',	// value
};

export const InitStage = {
	BEFORE:		'before',	// not initialized yet
	WORKING:	'working',	// during initialization
	AFTER:		'after',	// initialized
};

export class InitInfo {
	constructor(def, stage, init_expr = undefined) {
		this.def = def;
		this.stage = stage;
		this.init_expr = init_expr;
	}
}

export class Def {
	constructor(def_node, constant = false, init_expr = undefined) {
		this.def_node = def_node;
		this.value = undefined;
		this.constant = constant;
		if (init_expr) {
			this.initInfo = new InitInfo(this, InitStage.BEFORE, init_expr);
		}
	}

	get() {
		if (this.initInfo) {
			if (this.initInfo.stage === InitStage.AFTER) {
				return resultValue(this.value);
			} else if (this.initInfo.stage === InitStage.BEFORE) {
				return resultError('use before initialization');
			} else {
				return resultError('wrong init stage');
			}
		} else {
			return resultValue(this.value);
		}
	}

	set(value) {
		if (this.initInfo && this.initInfo.stage === InitStage.WORKING) {
			return resultError('wrong init stage');
		}

		if (this.constant) {
			return resultError('cannot set constant');
		} else {
			const oldValue = this.value;
			this.value = value;
			if (this.initInfo) delete this.initInfo;
			return resultValue(oldValue);
		}
	}

	setForce(value) {
		if (this.initInfo && this.initInfo.stage === InitStage.WORKING) {
			return resultError('wrong init stage');
		}

		const oldValue = this.value;
		this.value = value;
		if (this.initInfo) delete this.initInfo;
		return resultValue(oldValue);
	}
}

export class DefNode {
	constructor(parent = undefined, name = undefined) {
		this.parent = parent;
		this.name = name;
		this.global = parent?.global;	// link to the global node of the same namespace path
		this.nodes = {};
		this.objs = {};
	}

	has(name) {
		return this.objs[name] !== undefined;
	}

	getRaw(name) {
		return this.objs[name];
	}

	get(name) {
		if (this.objs[name] !== undefined) {
			return this.objs[name].get();
		} else {
			return resultError(`cannot find '${name}'`);
		}
	}

	add(name, value, constant = false) {
		if (this.objs[name] !== undefined) {
			return resultError(`'${name}' already exists`);
		} else {
			const def = new Def(this, constant);
			this.objs[name] = def;
			const result = def.setForce(value);
			if (result.err) return result.err;
			return resultValue(def);
		}
	}

	addInit(name, init_expr, constant = false) {
		if (this.objs[name] !== undefined) {
			return resultError(`'${name}' already exists`);
		} else {
			const def = new Def(this, constant, init_expr);
			this.objs[name] = def;
			return resultValue(def);
		}
	}

	setRaw(name, def) {
		this.objs[name] = def;
	}

	set(name, value) {
		if (this.objs[name] !== undefined) {
			return this.objs[name].set(value);
		} else {
			return resultError(`cannot find '${name}'`);
		}
	}

	getOrCreateSubNode(name) {
		if (this.nodes[name]) {
			return this.nodes[name];
		} else {
			const node = new DefNode(this, name);
			this.nodes[name] = node;
			return node;
		}
	}

	getOrCreateSubNodes(path) {
		let node = this;
		for (const name of path) {
			node = node.getOrCreateSubNode(name);
		}
		return node;
	}
}

export class Frame {
	constructor(def_node) {
		this.def_node = def_node;
		this.local_nodes = [];
	}
}

function makeFunction(args, body, def_node) {
	return {
		type:	ObjectType.FUNC,
		args:	args,
		body:	body,
		def_node:	def_node
	};
}

/*
 * Runner Context Options:
 *	- maxStackSize: number
 */
export class Context {
	constructor(options = {}) {
		this.options = new Object();
		Object.assign(this.options, defaultOptions);
		Object.assign(this.options, options);

		this.reset();
	}

	stackPeek() {
		if (this.stack.length >= 1) {
			return resultValue(this.stack[this.stack.length - 1]);
		} else {
			return resultError('cannot peek: stack is empty');
		}
	}

	stackPush(frame) {
		if (this.stack.length >= this.options.maxStackSize) {
			return makeError(`max stack size (${this.options.maxStackSize}) exceeded`);
		}
		this.stack.push(frame);
	}

	stackPop() {
		if (this.stack.length >= 1) {
			return resultValue(this.stack.pop());
		} else {
			return resultError('cannot pop: stack is empty');
		}
	}

	reset() {
		this.envs = [];
		this.global = new DefNode();
		this.stack = [];
		this.toInit = [];
	}

	setup(asts) {
		this.reset();

		// find function/variable definitions
		for (const ast of asts) {
			const ast_node = ast.ast;
			if (ast_node.type !== NodeType.ROOT) {
				return makeError('expected root AST node', ast_node.token);
			}
			const def_node = new DefNode();
			def_node.global = this.global;
			this.stack = [ [ def_node ] ];
			const err = this.initDefs(def_node, ast_node.nodes);
			if (err) {
				err.path = ast.path;
				return err;
			}

			this.envs.push(def_node);
		}
	}

	initDefs(def_node, ast_nodes) {
		let start_ns = false;
		const ast_node0 = ast_nodes[0];
		if (ast_node0 && ast_node0.type === NodeType.NS) {
			if (!ast_node0.body) {
				let global_node = def_node.global;
				def_node = def_node.getOrCreateSubNodes(ast_node0.path);
				global_node = global_node.getOrCreateSubNodes(ast_node0.path);
				def_node.global = global_node;
				start_ns = true;
				const err = this.stackPush(new Frame(def_node));
				if (err) return err;
			}
		}

		for (let i = (start_ns ? 1 : 0); i < ast_nodes.length; i++) {
			const ast_node = ast_nodes[i];
			let err, result;
			switch (ast_node.type) {
				case NodeType.FUNC_DEF:
					const func_name = ast_node.name;
					if (def_node.has(func_name)) {
						return makeError(`'${func_name}' is already defined in this scope`, ast_node.token);
					}
					const func = makeFunction(ast_node.args, ast_node.body, def_node);
					result = def_node.add(func_name, func, true);
					if (result.err) {
						addTokenIfNot(result, ast_node.token);
						return result.err;
					}

					if (ast_node.export) {
						if (def_node.global.getRaw(func_name)) {
							return makeError(`'${func_name}' is already exported in this scope`, ast_node.token);
						}
						def_node.global.setRaw(func_name, def_node.getRaw(func_name));
					}
					break;
				case NodeType.VAR_DEF:
					const var_name = ast_node.name;
					if (def_node.has(var_name)) {
						return makeError(`'${var_name}' is already defined in this scope`, ast_node.token);
					}

					if (ast_node.constant && !ast_node.init) {
						return makeError('defining constant without initialization', ast_node.token);
					}

					if (ast_node.init) {
						result = def_node.addInit(var_name, ast_node.init, ast_node.constant);
						this.toInit.push({
							def_node:	def_node,
							name:		var_name
						});
					} else {
						result = def_node.add(var_name, { type: ObjectType.UNDEF }, ast_node.constant);
					}

					if (result.err) {
						addTokenIfNot(result, ast_node.token);
						return result.err;
					}

					if (ast_node.export) {
						if (def_node.global.getRaw(var_name)) {
							return makeError(`'${var_name}' is already exported in this scope`, ast_node.token);
						}
						def_node.global.setRaw(var_name, def_node.getRaw(var_name));
					}
					break;
				case NodeType.NS:
					if (!ast_node.body) {
						return makeError('scope namespace declaration should always be the first', ast_node.token);
					} else if (ast_node.body.type !== NodeType.CHUNK) {
						return makeError('bad namespace body node type', ast_node.token);
					}
					let global_node = def_node.global;
					const sub_def_node = def_node.getOrCreateSubNodes(ast_node.path);
					global_node = global_node.getOrCreateSubNodes(ast_node.path);
					sub_def_node.global_node = global_node;
			
					err = this.stackPush(new Frame(sub_def_node));
					if (err) return err;
					err = this.initDefs(sub_def_node, ast_node.body.nodes);
					if (err) return err;
					result = this.stackPop();
					if (result.err) return result.err;
					break;
				case NodeType.STAT_IMPORT:
					break;
				default:
					return makeError('expected function/variable definition or namespace chunks', ast_node.token);
			}
		}

		if (start_ns) {
			const result = this.stackPop();
			if (result.err) return result.err;
		}
	}

	/*
	 * Search Order:
	 *	1. current stack frame local nodes from last to the the first.
	 *	2. current stack frame def_node, bottom up.
	 *	3. the corresponding global node, bottom up.
	 */
	findObj(name) {
		let result = this.stackPeek();
		if (result.err) return result;
		const frame = result.value;

		const local_nodes = frame.local_nodes;
		for (let i = local_nodes.length - 1; i >= 0; i--) {
			const node = local_nodes[i];
			result = node.get(name);
			if (!result.err) return result;
		}

		let node = frame.def_node;
		while (node) {
			result = node.get(name);
			if (!result.err) return result;
			node = node.parent;
		}

		node = frame.def_node.global_node;
		while (node) {
			result = node.get(name);
			if (!result.err) return result;
			node = node.parent;
		}

		return resultError(`cannot find '${name}'`);
	}
}
