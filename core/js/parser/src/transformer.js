
import { TokenType } from './tokenizer.js';
import { ASTNodeType } from './parser.js';
import { makeError } from './util.js';


const NodeType = {
	ROOT:			'root',						// nodes
	NS:				'namespace',				// path [body]
	CHUNK:			'chunk',					// nodes
	FUNC_DEF:		'function_definition',		// name args body
	VAR_DEF:		'variable_definition',		// name constant [init]
	IDENTIFIER:		'identifier',				// name [path]
	LIT_NUMBER:		'literal_number',			// value
	LIT_STRING:		'literal_string',			// value
	STAT_RETURN:	'statement_return',			// [arg]
	STAT_IMPORT:	'statement_import',			// path name
	EXPR_UNARY:		'expression_unary',			// operator arg
	EXPR_BINARY:	'expression_binary',		// operator arg1 arg2
	EXPR_FUNC_CALL:	'expression_function_call',	// func args
}


const OperatorType = {
	POSITIVE:	'positive',	// +a
	NEGATIVE:	'negative',	// -b
	ASSIGN:		'assign',	// a = b
	PLUS:		'plus',		// a + b
	MINUS:		'minus',	// a - b
	MULTIPLY:	'multiply',	// a * b
	DIVIDE:		'divide',	// a / b
};


function traverseNodes (context, nodes, func, preorder) {
	for (const child of nodes) {
		const err = traverseAST(context, child, func, preorder);
		if (err) return err;
	}
}

function initChildrenTraversalMethods(context) {
	const methods = context.childrenTraversalMethods;

	methods[ASTNodeType.ROOT] = (context, node, func, preorder) => traverseNodes(context, node.nodes, func, preorder);

	methods[ASTNodeType.PRIMITIVE] = (_context, _node, _func, _preorder) => { };

	methods[ASTNodeType.DELIMIT] = (_context, _node, _func, _preorder) => { };

	methods[ASTNodeType.OP_GROUP] = (context, node, func, preorder) => traverseNodes(context, node.nodes, func, preorder);

	methods[ASTNodeType.OP_PREFIX] = (context, node, func, preorder) => traverseAST(context, node.node, func, preorder);

	methods[ASTNodeType.OP_BINARY] = (context, node, func, preorder) => {
		const err = traverseAST(context, node.node1, func, preorder);
		if (err) return err;
		return traverseAST(context, node.node2, func, preorder);
	};
}

function traverseAST(context, node, func, preorder = false) {
	const method = context.childrenTraversalMethods[node.type];
	if (method) {
		let err;
		if (preorder) {
			err = func(context, node);
			if (err) return err;
		}
		err = method(context, node, func, preorder);
		if (err) return err;
		if (!preorder) {
			err = func(context, node);
			if (err) return err;
		}
	} else {
		return makeError(`don't know how to traverse node type ${node.type}`, node.token);
	}
}

function transform(ast, passes) {
	const context = {
		err:	undefined,
		childrenTraversalMethods:	{},
	};

	initChildrenTraversalMethods(context);

	for (const pass of passes) {
		pass(context, ast);
		if (context.err) break;
	}

	return context.err;
}

const err_msg_internal_error = 'compiler internal error';
const err_msg_no_parent = 'non-root node has no parent';


/* Helper Functions */
function isIdentifier(node, name) {
	if (!(node.type === ASTNodeType.PRIMITIVE && node.token.type === TokenType.IDENTIFIER)) {
		return false;
	}

	return node.token.data === name;
}

function get_ns_path(node) {
	const token = node.token;
	if (node.type === ASTNodeType.PRIMITIVE) {
		if (token.type === TokenType.IDENTIFIER) {
			return { value: [ token.data ] };
		} else {
			return { err: makeError('expected identifier', token) };
		}
	}

	if (!(node.type === ASTNodeType.OP_BINARY && token.type === TokenType.DOT)) {
		return { err: makeError('expected dot \'.\'', token) };
	}

	const node1 = node.node1, node2 = node.node2;
	if (!(node2.type === ASTNodeType.PRIMITIVE && node2.token.type === TokenType.IDENTIFIER)) {
		return { err: makeError('expected identifier', node2.token) };
	}
	const name = node2.token.data;

	const result = get_ns_path(node1);
	if (result.err) return err;
	const path = result.value;
	path.push(name);

	return { value: path };
}

/*
 * Replace some sibling nodes with a new item, and recalculate indices
 * Useful in AST transformations
 */
function spliceNodes(nodes, delimiters, index, deleteCount, addedItem) {
	if (deleteCount <= 0 || index + deleteCount > nodes.length) {
		return makeError(err_msg_internal_error, nodes[index]);
	}

	nodes.splice(index, deleteCount, addedItem);

	// adjust children indices starting from the added item
	for (let i = index; i < nodes.length; i++) {
		nodes[i].index = i;
	}

	// remove some delimiters
	if (delimiters) {
		delimiters.splice(index, deleteCount - 1);
	}
}

function deleteNodes(nodes, delimiters, index, deleteCount) {
	if (deleteCount < 0 || index + deleteCount > nodes.length) {
		return makeError(err_msg_internal_error, nodes[index]);
	}

	nodes.splice(index, deleteCount);
	
	// adjust children indices after the deleted items
	for (let i = index; i < nodes.length; i++) {
		nodes[i].index = i;
	}

	// remove some delimiters
	if (delimiters) {
		delimiters.splice(index, deleteCount);
	}
}

export {
	NodeType, OperatorType,
	traverseAST, traverseNodes,
	transform,

	err_msg_internal_error, err_msg_no_parent,
	isIdentifier,
	get_ns_path,
	spliceNodes, deleteNodes
};
