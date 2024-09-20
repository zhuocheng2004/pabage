
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, isIdentifier, get_ns_path, spliceNodes } from '../transformer.js';
import { err_msg_bad_stat_expr_pos, err_msg_no_parent } from '../error_messages.js';


/*
 * Import
 */
function pass_import(context, ast) {
	context.childrenTraversalMethods[NodeType.STAT_IMPORT] = (_context, _node, _func, _preorder) => { };

	traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'import')) return;

		const parent = node.parent;
		if (!parent) throw new TransformError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			throw new TransformError(err_msg_bad_stat_expr_pos, node.token);
		}

		const path_node = parent.nodes[node.index+1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!path_node || delimited) {
			throw new TransformError('missing import path', node.token);
		}

		if (!(path_node.type === ASTNodeType.OP_BINARY && path_node.token.type === TokenType.DOT)) {
			throw new TransformError('bad import path', path_node.token);
		}

		const node1 = path_node.node1, node2 = path_node.node2;

		if (!(node2.type === ASTNodeType.PRIMITIVE && node2.token.type === TokenType.IDENTIFIER)) {
			throw new TransformError('not an identifier', node2.token);
		}
		const name = node2.token.data;

		const path = get_ns_path(node1);

		const import_node = {
			parent:	parent,
			index:	node.index,
			type:	NodeType.STAT_IMPORT,
			token:	node.token,
			path:	path,
			name:	name
		};

		spliceNodes(parent.nodes, parent.delimiters, node.index, 2, import_node);
	});
}

export default pass_import;
