
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, traverseAST, isIdentifier, deleteNodes, TransformError } from '../transformer.js';
import { err_msg_bad_stat_expr_pos, err_msg_no_parent } from '../error_messages.js';


/*
 * Exporting of Functions/Variables
 *
 * This pass doesn't create new nodes. It just adds marks on the nodes.
 */
function pass_export(context, ast) {
	traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'export')) return;

		const parent = node.parent;
		if (!parent) throw new TransformError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			throw new TransformError(err_msg_bad_stat_expr_pos, node.token);
		}

		const node1 = parent.nodes[node.index+1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!node1 || delimited || node1.type === ASTNodeType.DELIMIT) {
			throw new TransformError('missing definition to export', node.token);
		}

		if (node1.type === NodeType.VAR_DEF || node1.type === NodeType.FUNC_DEF) {
			node1.export = true;
			deleteNodes(parent.nodes, parent.delimiters, node.index, 1);
		} else {
			throw new TransformError('not exportable', node1.token);
		}
	});
}

export default pass_export;
