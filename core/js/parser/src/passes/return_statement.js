
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, traverseAST, err_msg_no_parent, spliceNodes } from '../transformer';
import { makeError } from '../util';


/*
 * Return Statement:
 * 	return [expression]
 */
function pass_return_statement(context, ast) {
	context.childrenTraversalMethods[NodeType.STAT_RETURN] = 
		(context, node, func, preorder) =>  traverseAST(context, node.arg, func, preorder);

	const err = traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.PRIMITIVE && node.token.type === TokenType.IDENTIFIER)) return;
		if (node.token.data !== 'return') return;

		const parent = node.parent;
		if (!parent) return makeError(err_msg_no_parent, node.token);

		if (parent.type !== ASTNodeType.OP_ENCLOSE) {
			return makeError('bad return statement position', node.token);
		}

		const delimiter = parent.delimiters[node.index];
		if (!delimiter || delimiter.type === TokenType.SEMICOLON) {
			// return without arguments
			node.type = NodeType.STAT_RETURN;
		} else if (delimiter.type === TokenType.EMPTY) {
			// next node is argument
			const arg_node = parent.nodes[node.index+1];
			if (!arg_node) return makeError('missing return argument', delimiter);
			const ret_node = {
				parent:	parent,
				index:	node.index,
				type:	NodeType.STAT_RETURN,
				token:	node.token,
				arg:	arg_node
			};

			arg_node.parent = ret_node;
			delete arg_node.index;

			return spliceNodes(parent.nodes, parent.delimiters, node.index, 2, ret_node);
		} else {
			return makeError('expected a return argument or semicolon \';\'', delimiter);
		}
	});

	if (err) context.err = err;
}

export default pass_return_statement;
