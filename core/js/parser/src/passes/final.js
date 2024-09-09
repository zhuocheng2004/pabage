
import { ASTNodeType } from '../parser';
import { NodeType, traverseAST, err_msg_no_parent, deleteNodes } from '../transformer';
import { makeError } from '../util';

/*
 * do final things:
 *	change root node type
 *	remove remaining delimiters
 */
function pass_final(context, ast) {
	context.childrenTraversalMethods[NodeType.ROOT] = (context, node, func, preorder) => traverseNodes(context, node.nodes, func, preorder);

	const err = traverseAST(context, ast, (_context, node) => {
		switch (node.type) {
			case ASTNodeType.ROOT:
				node.type = NodeType.ROOT;
				break;
			case ASTNodeType.DELIMIT:
				const parent = node.parent;
				if (!parent) return makeError(err_msg_no_parent, node.token);

				if (!(parent.type === ASTNodeType.ROOT || parent.type === NodeType.ROOT)) {
					return makeError('unexpected delimiter', node.token);
				}

				return deleteNodes(parent.nodes, parent.delimiters, node.index, 1);
		}
	});

	if (err) context.err = err;
}

export default pass_final;
