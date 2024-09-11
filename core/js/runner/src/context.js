
import { NodeType } from '@pabage/parser'
import { makeError, resultValue, resultError, addTokenIfNot }from './util.js'


const defaultOptions = {
	maxStackSize:	1000
};

export const ObjectType = {
	OBJECT:		1,	// value
	FUNC:		2,	// args, body
	NATIVE_FUNC:	3,
	UNDEF:		10,
	NATIVE:		11,
	NUMBER:		12,	// value
	STRING:		13,	// value
};

export class Def {
	constructor(def_node, value, constant = false) {
		this.def_node = def_node;
		this.value = value;
		this.constant = constant;
	}

	get() {
		return this.value;
	}

	set(value) {
		if (this.constant) {
			return resultError('cannot set constant');
		} else {
			const oldValue = this.value;
			this.value = value;
			return resultValue(oldValue);
		}
	}
}

export class DefNode {
	constructor(parent = undefined) {
		this.parent = parent;
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
			return resultValue(this.objs[name].get());
		} else {
			return resultError(`cannot find '${name}'`);
		}
	}

	add(name, value, constant = false) {
		if (this.objs[name] !== undefined) {
			return resultError(`'${name}' already exists`);
		} else {
			const def = new Def(this, value, constant);
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
			const node = new DefNode(this);
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

function makeFunction(args, body) {
	return {
		type:	ObjectType.FUNC,
		args:	args,
		body:	body
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

		this.envs = [];
		this.global = new DefNode();
		this.stack = [];
	}

	stackPeek() {
		if (this.stack.length >= 1) {
			return resultValue(this.stack[this.stack.length - 1]);
		} else {
			return resultError('cannot peek: stack is empty');
		}
	}

	stackPush(def_node) {
		if (this.stack.length >= this.options.maxStackSize) {
			return makeError('max stack size exceeded');
		}
		this.stack.push(def_node);
	}

	stackPop() {
		if (this.stack.length >= 1) {
			return resultValue(this.stack.pop());
		} else {
			return resultError('cannot pop: stack is empty');
		}
	}

	setup(asts) {
		this.envs = [];

		for (const ast of asts) {
			const ast_node = ast.ast;
			if (ast_node.type !== NodeType.ROOT) {
				return makeError('expected root AST node', ast_node.token);
			}
			const def_node = new DefNode();
			def_node.global = this.global;
			let err = this.stackPush(def_node);
			if (err) return err;
			err = this.initDefs(def_node, ast_node.nodes);
			if (err) {
				err.path = ast.path;
				return err;
			}
			const result = this.stackPop();
			if (result.err) return result.err;

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
				const err = this.stackPush(def_node);
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
					const func = makeFunction(ast_node.args, ast_node.body);
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
					result = def_node.add(var_name, { type: ObjectType.UNDEF }, ast_node.constant);
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
			
					err = this.stackPush(sub_def_node);
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
}
