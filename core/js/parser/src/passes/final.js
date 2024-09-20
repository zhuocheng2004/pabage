
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, deleteNodes } from '../transformer.js';
import { err_msg_no_parent } from '../error_messages.js';


/*
 * do final things:
 *	change root node type
 *	remove remaining delimiters
 */
function pass_final(context, ast) {
	context.childrenTraversalMethods[NodeType.ROOT] = (context, node, func, preorder) => traverseNodes(context, node.nodes, func, preorder);

	traverseAST(context, ast, (_context, node) => {
		switch (node.type) {
			case ASTNodeType.ROOT:
				node.type = NodeType.ROOT;
				break;
			case ASTNodeType.DELIMIT:
				const parent = node.parent;
				if (!parent) throw new TransformError(err_msg_no_parent, node.token);

				if (!(parent.type === ASTNodeType.ROOT || parent.type === NodeType.ROOT)) {
					throw new TransformError('unexpected delimiter', node.token);
				}

				deleteNodes(parent.nodes, parent.delimiters, node.index, 1);
		}
	});
}

export default pass_final;
