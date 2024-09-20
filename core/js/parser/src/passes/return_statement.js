
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, isIdentifier, spliceNodes } from '../transformer.js';
import { err_msg_bad_stat_expr_pos, err_msg_no_parent } from '../error_messages.js';


/*
 * Return Statement:
 * 	return [expression]
 */
function pass_return_statement(context, ast) {
	context.childrenTraversalMethods[NodeType.STAT_RETURN] = 
		(context, node, func, preorder) =>  traverseAST(context, node.arg, func, preorder);

	traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'return')) return;

		const parent = node.parent;
		if (!parent) throw new TransformError(err_msg_no_parent, node.token);

		if (parent.type !== ASTNodeType.OP_GROUP) {
			throw new TransformError(err_msg_bad_stat_expr_pos, node.token);
		}

		const delimiter = parent.delimiters[node.index];
		if (!delimiter || delimiter.type === TokenType.SEMICOLON) {
			// return without arguments
			node.type = NodeType.STAT_RETURN;
		} else if (delimiter.type === TokenType.EMPTY) {
			// next node is argument
			const arg_node = parent.nodes[node.index+1];
			if (!arg_node) throw new TransformError('missing return argument', delimiter);
			const ret_node = {
				parent:	parent,
				index:	node.index,
				type:	NodeType.STAT_RETURN,
				token:	node.token,
				arg:	arg_node
			};

			arg_node.parent = ret_node;
			delete arg_node.index;

			pass_return_statement(context, arg_node);

			spliceNodes(parent.nodes, parent.delimiters, node.index, 2, ret_node);
		} else {
			throw new TransformError('expected a return argument or semicolon \';\'', delimiter);
		}
	});
}

export default pass_return_statement;
