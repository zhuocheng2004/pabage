
const util = require('./util');
const makeError = util.makeError, resultError = util.resultError, resultValue = util.resultValue;

const TokenType = require('./tokenizer').TokenType;
const ASTNodeType = require('./parser').ASTNodeType;

const NodeType = {
	ROOT:		100,	// nodes
	NS:		101,	// path [body]
	CHUNK:		110,	// nodes
	FUNC_DEF:	111,	// name args body
	VAR_DEF:	112,	// name constant [init]
	IDENTIFIER:	120,	// name [path]
	LIT_NUMBER:	121,	// value
	LIT_STRING:	122,	// value
	STAT_RETURN:	130,	// [arg]
	EXPR_UNARY:	140,	// operator arg
	EXPR_BINARY:	141,	// operator arg1 arg2
	FUNC_CALL:	145,	// func args
};

const OperatorType = {
	POSITIVE:	1,	// +a
	NEGAATIVE:	2,	// -b
	ASSIGN:		10,	// a = b
	PLUS:		20,	// a + b
	MINUS:		21,	// a - b
	MULTIPLY:	22,	// a * b
	DIVIDE:		23,	// a / b
};

const msg_internal_error = 'compiler internal error';
const msg_no_parent = 'non-root node has no parent';


function spliceNodes(nodes, delimiters, index, deleteCount, addedItem) {
	if (deleteCount <= 0 || index + deleteCount > nodes.length) return;

	const deleted = addedItem ? nodes.splice(index, deleteCount, addedItem) : nodes.splice(index, deleteCount);

	// adjust children indices
	for (let i = index + 1; i < nodes.length; i++) {
		nodes[i].index = i;
	}
	
	// remove delimiters
	if (delimiters) {
		delimiters.splice(index, deleteCount - 1);
	}

	return deleted;
}

function traverseNodes(node, func) {
	let err = undefined;

	switch (node.type) {
		case ASTNodeType.ROOT:
			for (const child of node.nodes) {
				if (err = traverseNodes(child, func))
					break;
			}
			break;
		case ASTNodeType.OP_ENCLOSE:
			for (const child of node.nodes) {
				if (err = traverseNodes(child, func))
					break;
			}
			break;
		case ASTNodeType.OP_BINARY:
			err = traverseNodes(node.node1, func);
			if (err) break;
			err = traverseNodes(node.node2, func);
			break;
		case ASTNodeType.OP_PREFIX:
			err = traverseNodes(node.node, func);
			break;
		case ASTNodeType.OP_SUFFIX:
			err = traverseNodes(node.node, func);
			break;
		case ASTNodeType.LEAF:
		case ASTNodeType.DELIMIT:
			break;
		case NodeType.ROOT:
			for (const child of node.nodes) {
				if (err = traverseNodes(child, func))
					break;
			}
			break;
		case NodeType.NS:
			if (node.body) {
				err = traverseNodes(node.body, func);
			}
			break;
		case NodeType.CHUNK:
			for (const child of node.nodes) {
				if (err = traverseNodes(child, func))
					break;
			}
			break;
		case NodeType.FUNC_DEF:
			err = traverseNodes(node.body, func);
			break;
		case NodeType.VAR_DEF:
			if (node.init) {
				err = traverseNodes(node.init, func);
			}
			break;
		case NodeType.STAT_RETURN:
			if (node.arg) {
				err = traverseNodes(node.arg, func);
			}
			break;
		case NodeType.EXPR_UNARY:
			err = traverseNodes(node.arg, func);
			break;
		case NodeType.EXPR_BINARY:
			err = traverseNodes(node.arg1, func);
			if (err) break;
			err = traverseNodes(node.arg2, func);
			break;
		case NodeType.FUNC_CALL:
			err = traverseNodes(node.func, func);
			if (err) break;
			for (const arg of node.args) {
				if (err = traverseNodes(arg, func))
					break;
			}
			break;
		case NodeType.IDENTIFIER:
		case NodeType.LIT_NUMBER:
		case NodeType.LIT_STRING:
			break;
		default:
			err = makeError(`unrecognized node type ${node.type}`, node.token);
	}

	if (!err) {
		err = func(node);
	}

	return err;
}

function get_ns_path(node) {
	const token = node.token;
	if (node.type === ASTNodeType.LEAF) {
		if (token.type === TokenType.IDENTIFIER) {
			return resultValue([ token.data ]);
		} else {
			return resultError('expected an identifier', token);
		}
	}

	if (node.type !== ASTNodeType.OP_BINARY || token.type !== TokenType.DOT) return resultError('expected dot \'.\'', token);

	const node1 = node.node1, node2 = node.node2;
	if (node2.type !== ASTNodeType.LEAF || node2.token.type !== TokenType.IDENTIFIER) return resultError('expected an identifier', node2.token);
	const name = node2.token.data;

	const result = get_ns_path(node1);
	if (result.err) return result;
	const path = result.value;
	path.push(name);

	return resultValue(path);
}

function pass_namespace(node) {
	const token = node.token;
	if (node.type !== ASTNodeType.LEAF || token.type !== TokenType.IDENTIFIER) return;
	if (token.data !== 'ns') return;

	const parent = node.parent;
	if (!parent) return makeError(msg_no_parent, token);

	if (parent.type !== ASTNodeType.ROOT && parent.type !== ASTNodeType.OP_ENCLOSE) 
		return makeError('bad namespace declaration position', token);

	const node1 = parent.nodes[node.index+1];
	const delimited = parent.delimiters ? parent.delimiters[node.index]?.type !== TokenType.EMPTY : false;
	if (!node1 || delimited || node1.type === ASTNodeType.DELIMIT)
		return makeError('missing namespace path', token);

	let path_node = node1, body = undefined;
	if (node1.type === ASTNodeType.OP_BINARY && node1.token.type == TokenType.ATTACH) {
		path_node = node1.node1;
		const node12 = node1.node2;
		if (node12.type !== ASTNodeType.OP_ENCLOSE || node12.token.type !== TokenType.LBRACE)
			return makeError('bad namespace chunk');
		body = node12;
	}

	const result = get_ns_path(path_node);
	if (result.err) return result.err;
	const path = result.value;

	const ns_node = {
		parent:	parent,
		type:	NodeType.NS,
		token:	token,
		path:	path,
		index:	node.index,
	};
	if (body) ns_node.body = body;

	if (!spliceNodes(parent.nodes, parent.delimiters, node.index, 2, ns_node))
		return makeError(msg_internal_error, node.token);

	if (body) {
		return traverseNodes(body, pass_namespace);
	}
}

function pass_func_def(node) {
	if (node.type !== ASTNodeType.LEAF || node.token.type !== TokenType.IDENTIFIER) return;
	if (node.token.data !== 'fn') return;

	const parent = node.parent;
	if (!parent) return {
		msg:	msg_no_parent,
		token:	node.token,
	};

	if (parent.type !== ASTNodeType.ROOT && parent.type !== ASTNodeType.OP_ENCLOSE) return {
		msg:	'bad function definition position',
		token:	node.token,
	};
	
	const def_node = parent.nodes[node.index + 1];
	const delimited = parent.delimiters ? parent.delimiters[node.index]?.type !== TokenType.EMPTY : false;
	if (!def_node || delimited) return {
		msg:	'missing function definition',
		token:	node.token,
	};

	if (def_node.type !== ASTNodeType.OP_BINARY || def_node.token.type !== TokenType.ATTACH) return {
		msg:	'missing function argument or body',
		token:	def_node.token,
	};

	const node1 = def_node.node1, node2 = def_node.node2;
	if (node2.type !== ASTNodeType.OP_ENCLOSE || node2.token.type !== TokenType.LBRACE) return {
		msg:	'bad function body',
		token:	node2.token,
	};

	if (node1.type !== ASTNodeType.OP_BINARY || node1.token.type !== TokenType.ATTACH) return {
		msg:	'no function argument list',
		token:	node1.token,
	};

	const node11 = node1.node1, node12 = node1.node2;
	if (node11.type !== ASTNodeType.LEAF || node11.token.type !== TokenType.IDENTIFIER) return {
		msg:	'expected an identifier as the function name',
		token:	node11.token,
	};

	const func_name = node11.token.data;

	if (node12.type !== ASTNodeType.OP_ENCLOSE || node12.token.type !== TokenType.LPAREN) return {
		msg:	'bad function argument list',
		token:	node12.token,
	}

	const arg_nodes = node12.nodes;
	const arg_count = arg_nodes.length;
	const args = [];
	if (arg_count > 0) {
		for (let i = 0; i < arg_count; i++) {
			const arg_node = arg_nodes[i];
			if (arg_node.type !== ASTNodeType.LEAF || arg_node.token.type !== TokenType.IDENTIFIER) return {
				msg:	'expected an identifier as the function argument name',
				token:	arg_node.token,
			};
			args.push(arg_node.token.data);
		}
	};

	const func_body_node = node2;

	const func_def_node = {
		parent:	parent,
		type:	NodeType.FUNC_DEF,
		token:	node.token,
		name:	func_name,
		args:	args,
		body:	func_body_node,
	}

	func_body_node.parent = func_def_node;

	if (!spliceNodes(parent.nodes, parent.delimiters, node.index, 2, func_def_node ))
		return makeError(msg_internal_error, node.token);

	return traverseNodes(func_body_node, pass_func_def);
}

function pass_var_def(node) {
	if (node.type !== ASTNodeType.LEAF || node.token.type !== TokenType.IDENTIFIER) return;
	const data = node.token.data;
	if (data !== 'var' && data !== 'val') return;

	const isConst = data === 'val';

	const parent = node.parent;
	if (!parent) return {
		msg:	msg_no_parent,
		token:	node.token,
	};

	if (parent.type !== ASTNodeType.ROOT && parent.type !== ASTNodeType.OP_ENCLOSE) return {
		msg:	'bad variable definition position',
		token:	node.token,
	};

	const def_node = parent.nodes[node.index + 1];
	const delimited = parent.delimiters ? parent.delimiters[node.index]?.type !== TokenType.EMPTY : false;
	if (!def_node || delimited) return {
		msg:	'missing variable definition',
		token:	node.token,
	};

	let var_name = undefined, init = undefined;

	if (def_node.type === ASTNodeType.LEAF) {
		const def_token = def_node.token;
		if (def_token.type === TokenType.IDENTIFIER) {
			var_name = def_token.data;
		} else {
			return {
				msg:	'expected identifier as variable name',
				token:	def_token,
			}
		}
	} else if (def_node.type === ASTNodeType.OP_BINARY) {
		if (def_node.token.type !== TokenType.ASSISN) return {
			msg:	'expected assign symbol \'=\'',
			token:	def_node.token,
		};
		const node1 = def_node.node1, node2 = def_node.node2;
		if (node1.type !== ASTNodeType.LEAF || node1.token.type !== TokenType.IDENTIFIER) return {
			msg:	'expected identifier as variable name',
			token:	node1.token,
		}

		var_name = node1.token.data;

		init = node2;
	} else {
		return {
			msg:	'bad variable definition',
			token:	def_node.token,
		}
	}

	let var_def_node = {
		parent:	parent,
		type:	NodeType.VAR_DEF,
		token:	node.token,
		index:	node.index,
		name:	var_name,
		constant:	isConst,
	};

	if (init) var_def_node.init = init;

	if (!spliceNodes(parent.nodes, parent.delimiters, node.index, init ? 2 : 1, var_def_node)) 
		return makeError(msg_internal_error, node.token);
}

function pass_stat_return(node) {
	if (node.type !== ASTNodeType.LEAF || node.token.type !== TokenType.IDENTIFIER) return;
	if (node.token.data !== 'return') return;

	const parent = node.parent;
	if (!parent) return {
		msg:	msg_no_parent,
		token:	node.token,
	};

	if (parent.type !== ASTNodeType.OP_ENCLOSE) return {
		msg:	'bad return statement position',
		token:	node.token,
	};

	const delimiter = parent.delimiters[node.index];
	if (!delimiter || delimiter.type === TokenType.SEMICOLON) {
		// return without arguments
		node.type = NodeType.STAT_RETURN;
	} else if (delimiter.type === TokenType.EMPTY) {
		// next node is argument
		const arg_node = parent.nodes[node.index + 1];
		if (!arg_node) return {
			msg:	'return argument missing',
		}

		const ret_node = {
			parent:	parent,
			type:	NodeType.STAT_RETURN,
			token:	node.token,
			index:	node.index,
			arg:	arg_node,
		};

		arg_node.parent = ret_node;
		delete arg_node.index;

		if (!spliceNodes(parent.nodes, parent.delimiters, node.index, 2, ret_node))
			return makeError(msg_internal_error, node.token);
	} else {
		return {
			msg:	'expected an return argument or semicolon \';\'',
			token:	delimiter,
		};
	}
}

function pass_func_call(node) {
	if (node.type !== ASTNodeType.OP_BINARY || node.token.type !== TokenType.ATTACH) return;

	const token = node.token, node1 = node.node1, node2 = node.node2;
	if (node2.type !== ASTNodeType.OP_ENCLOSE || node2.token.type !== TokenType.LPAREN) return {
		msg:	'bad function call arguments',
		token:	token,
	};

	const arg_nodes = node2.nodes;
	const arg_count = arg_nodes.length;
	for (let i = 0; i < arg_count - 1; i++) {
		const delimiter = node2.delimiters[i];
		if (delimiter.type !== TokenType.COMMA) {
			return {
				msg:	'expected comma \',\'',
				token:	delimiter,
			};
		}
	}

	arg_nodes.forEach(arg => {
		arg.parent = node
		delete arg.index;
	});

	node.type = NodeType.FUNC_CALL;
	node.token = node1.token;
	node.func = node1;
	node.args = arg_nodes;
	delete node.node1;
	delete node.node2;
}

function pass_expression(node) {
	const token = node.token;
	if (node.type === ASTNodeType.OP_ENCLOSE) {
		if (token.type !== TokenType.LPAREN) return;

		if (node.nodes.length === 0) {
			return {
				msg:	'nothing inside parentheses',
				token:	token,
			};
		} else if (node.nodes.length > 1) {
			return {
				msg:	'too many expressions inside parentheses',
				token:	token,
			};
		}

		const subNode = node.nodes[0];
		delete node.nodes;

		Object.assign(node, subNode);
	} else if (node.type === ASTNodeType.OP_PREFIX) {
		let op = undefined;
		switch (token.type) {
			case TokenType.PLUS:
				op = OperatorType.POSITIVE;
				break;
			case TokenType.MINUS:
				op = OperatorType.NEGAATIVE;
				break;
			default:
				return {
					msg:	'unrecognized unary operator',
					token:	token,
				};
		}

		node.type = NodeType.EXPR_UNARY;
		node.operator = op;
		node.arg = node.node;
		delete node.node;
	} else if (node.type === ASTNodeType.OP_BINARY) {
		let op = undefined;
		switch (token.type) {
			case TokenType.ASSISN:
				op = OperatorType.ASSIGN;
				break;
			case TokenType.PLUS:
				op = OperatorType.PLUS;
				break;
			case TokenType.MINUS:
				op = OperatorType.MINUS;
				break;
			case TokenType.STAR:
				op = OperatorType.MULTIPLY;
				break;
			case TokenType.SLASH:
				op = OperatorType.DIVIDE;
				break;
			default:
				return {
					msg:	'unrecognized binary operator',
					token:	token,
				};
		}

		node.type = NodeType.EXPR_BINARY;
		node.operator = op;
		node.arg1 = node.node1;
		node.arg2 = node.node2;
		delete node.node1;
		delete node.node2;
	}
}

function pass_primitive(node) {
	if (node.type !== ASTNodeType.LEAF) return;

	const token = node.token;
	switch (token.type) {
		case TokenType.IDENTIFIER:
			node.type = NodeType.IDENTIFIER;
			node.name = token.data;
			break;
		case TokenType.NUMBER:
			node.type = NodeType.LIT_NUMBER;
			node.value = token.data;
			break;
		case TokenType.STRING:
			node.type = NodeType.LIT_STRING;
			node.value = token.data;
			break;
		default:
			return {
				msg:	'unrecognized primitive',
				token:	token,
			};
	}
}

function pass_chunk(node) {
	if (node.type !== ASTNodeType.OP_ENCLOSE || node.token.type !== TokenType.LBRACE) return;

	const nodes = node.nodes;
	const node_count = nodes.length;
	for (let i = 0; i < node_count - 1; i++) {
		const delimiter = node.delimiters[i];
		if (delimiter.type !== TokenType.SEMICOLON) {
			return {
				msg:	'expected semicolon \';\'',
				token:	delimiter,
			};
		}
	}

	delete node.delimiters;
	node.type = NodeType.CHUNK;
}

function pass_final(node) {
	switch (node.type) {
		case ASTNodeType.ROOT:
			node.type = NodeType.ROOT;
			break;
		case ASTNodeType.DELIMIT:
			const parent = node.parent;
			if (!parent) return makeError(msg_no_parent, node.token);
			if (parent.type !== ASTNodeType.ROOT && parent.type !== NodeType.ROOT)
				return makeError('unexpected delimiter', node.token);
			if (!spliceNodes(parent.nodes, parent.delimiters, node.index, 1))
				return makeError(msg_internal_error, node.token);
			break;
	}
}

function transform(node) {
	let err;

	const passes = [
		pass_namespace,
		pass_func_def, pass_var_def, pass_stat_return,
		pass_func_call, pass_expression, pass_primitive, pass_chunk,
		pass_final,
	];

	for (const func of passes) {
		err = traverseNodes(node, func);
		if (err) {
			return err;
		}
	}

	//printAST(node);
}


function invertKeyValues(obj) {
	return Object.fromEntries(Object.entries(obj).map(entry => entry.reverse()));
}

const tokenTypeNames = invertKeyValues(TokenType);
const nodeTypeNames = Object.assign({}, invertKeyValues(ASTNodeType), invertKeyValues(NodeType));
const operatorTypeNames = invertKeyValues(OperatorType);

function getReadableAST(ast, showToken = false) {
	const result = structuredClone(ast);
	traverseNodes(result, (node) => {
		if (node.type === NodeType.EXPR_UNARY || node.type === NodeType.EXPR_BINARY) {
			node.operator = `${operatorTypeNames[node.operator]} (${node.operator})`;
		}
		node.type = `${nodeTypeNames[node.type]} (${node.type})`;
		if (node.token) {
			const typeName = `${tokenTypeNames[node.token.type]} (${node.token.type})`;
			if (showToken) {
				node.token.type = typeName;
			} else {
				node.token = typeName;
			}
		}
		if (node.parent) {
			delete node.parent;
		}
	})
	return result;
}

function printAST(ast) {
	console.log(JSON.stringify(getReadableAST(ast), undefined, 4));
}

module.exports = {
	NodeType:	NodeType,
	OperatorType:	OperatorType,
	transform:	transform,

	getReadableAST:	getReadableAST,
};