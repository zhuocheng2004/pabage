
import { ASTNodeType } from './parser';
import { makeError } from './util';


const NodeType = {
	ROOT:		100,	// nodes
	NS:			101,	// path [body]
	CHUNK:		110,	// nodes
	FUNC_DEF:	111,	// name args body
	VAR_DEF:	112,	// name constant [init]
	IDENTIFIER:	120,	// name [path]
	LIT_NUMBER:	121,	// value
	LIT_STRING:	122,	// value
	STAT_RETURN:	130,	// [arg]
	EXPR_UNARY:	140,	// operator arg
	EXPR_BINARY:	141,	// operator arg1 arg2
	EXPR_FUNC_CALL:	145,	// func args
}


const OperatorType = {
	POSITIVE:	1,	// +a
	NEGATIVE:	2,	// -b
	ASSIGN:		10,	// a = b
	PLUS:		20,	// a + b
	MINUS:		21,	// a - b
	MULTIPLY:	22,	// a * b
	DIVIDE:		23,	// a / b
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
		return makeError(`don't know how to traverse children of node type ${node.type}`, node.token);
	}
}

function transform(ast, passes) {
	const context = {
		err:	undefined,
		childrenTraversalMethods:	[],
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
	spliceNodes, deleteNodes
};
