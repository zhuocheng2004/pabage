
import { NodeType } from '@pabage/parser'
import { makeError, resultValue, resultError, addTokenIfNot }from './util.js'


const defaultOptions = {
	maxStackSize:	1000
};

export const ObjectType = {
	OBJECT:		'object',	// value
	FUNC:		'function',	// args, body, def_node
	NATIVE_FUNC:'native_function',	// arg_types, ret_type, handle
	UNDEF:		'undefined',
	NATIVE:		'native_object',	// obj
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

	get(name) {
		if (this.objs[name] !== undefined) {
			return resultValue(this.objs[name]);
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

	setDef(name, def) {
		this.objs[name] = def;
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

	getSubNode(path) {
		let def_node = this;
		for (const entry of path) {
			if (def_node.nodes[entry]) {
				def_node = def_node.nodes[entry];
			} else {
				let s = entry;
				while (def_node !== this) {
					s = (def_node.name ? def_node.name : '<unknown>') + '.'  + s;
					def_node = def_node.parent;
				}
				return resultError(`cannot find namespace ${s}`);
			}
		}
		return resultValue(def_node);
	}
}

export class Frame {
	constructor(def_node) {
		this.def_node = def_node;
		this.local_nodes = [];
	}

	get(name) {
		const local_nodes = this.local_nodes;
		for (let i = local_nodes.length - 1; i >= 0; i--) {
			const node = local_nodes[i];
			if (node.has(name)) return node.get(name);
		}
		return resultError(`cannot find '${name}' locally`);
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

function makeNativeFunction(arg_types, ret_type, handle) {
	return {
		type:	ObjectType.NATIVE_FUNC,
		arg_types:	arg_types,
		ret_type:	ret_type,
		handle:	handle
	}
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
		this.toImport = [];	// def_node path name
	}

	setup(asts) {
		this.reset();

		// find function/variable definitions
		for (const ast_node of asts) {
			if (ast_node.type !== NodeType.ROOT) {
				return makeError('expected root AST node', ast_node.token);
			}
			const def_node = new DefNode();
			def_node.global = this.global;
			this.stack = [ [ def_node ] ];
			const err = this.initDefs(def_node, ast_node.nodes, true);
			if (err) return err;

			this.envs.push(def_node);
		}
	}

	initDefs(def_node, ast_nodes, isRoot = false) {
		let start_index = 0;
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
				start_index = 1;
			}
		}

		// mark global imports
		if (isRoot) {
			while (true) {
				const ast_node = ast_nodes[start_index];
				if (ast_node.type === NodeType.STAT_IMPORT) {
					this.toImport.push({
						def_node:	def_node,
						path:	ast_node.path,
						name:	ast_node.name,
						token:	ast_node.token
					});
					start_index++;
				} else {
					break;
				}
			}
		}

		for (let i = start_index; i < ast_nodes.length; i++) {
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
						if (def_node.global.has(func_name)) {
							return makeError(`'${func_name}' is already exported in this scope`, ast_node.token);
						}
						const result = def_node.get(func_name);
						if (result.err) return result.err;
						def_node.global.setDef(func_name, result.value);
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

					// mark variable initializations
					if (ast_node.init) {
						result = def_node.addInit(var_name, ast_node.init, ast_node.constant);
						this.toInit.push({
							def_node:	def_node,
							name:		var_name,
							token:		ast_node.token
						});
					} else {
						result = def_node.add(var_name, { type: ObjectType.UNDEF }, ast_node.constant);
					}

					if (result.err) {
						addTokenIfNot(result, ast_node.token);
						return result.err;
					}

					if (ast_node.export) {
						if (def_node.global.has(var_name)) {
							return makeError(`'${var_name}' is already exported in this scope`, ast_node.token);
						}
						const result = def_node.get(var_name);
						if (result.err) return result.err;
						def_node.global.setDef(var_name, result.value);
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

		result = frame.get(name);
		if (!result.err) return result;

		let node = frame.def_node;
		while (node) {
			if (node.has(name)) return node.get(name);
			node = node.parent;
		}

		node = frame.def_node.global_node;
		while (node) {
			if (node.has(name)) return node.get(name);
			node = node.parent;
		}

		return resultError(`cannot find '${name}'`);
	}

	findObjAtPath(start_node, name, path) {
		const result = start_node.getSubNode(path);
		if (result.err) return result;
		const def_node = result.value;

		return def_node.get(name);
	}

	registerNativeFunction(path, name, arg_types, ret_type, handle) {
		const def_node = this.global.getOrCreateSubNodes(path);
		return def_node.add(name, makeNativeFunction(arg_types, ret_type, handle), true);
	}
}
