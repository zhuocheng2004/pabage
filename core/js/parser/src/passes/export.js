
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, traverseAST, isIdentifier, deleteNodes } from '../transformer';
import { makeError } from '../util';

/*
 * Exporting of Functions/Variables
 *
 * This pass doesn't create new nodes. It just adds marks on the nodes.
 */
function pass_export(context, ast) {
	const err = traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'export')) return;

		const parent = node.parent;
		if (!parent) return makeError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			return makeError('bad namespace declaration position', node.token);
		}

		const node1 = parent.nodes[node.index+1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!node1 || delimited || node1.type === ASTNodeType.DELIMIT) {
			return makeError('missing definition to export', node.token);
		}

		if (node1.type === NodeType.VAR_DEF || node1.type === NodeType.FUNC_DEF) {
			node1.export = true;
			return deleteNodes(parent.nodes, parent.delimiters, node.index, 1);
		} else {
			return makeError('not exportable', node1.token);
		}
	});

	if (err) context.err = err;
}

export default pass_export;
