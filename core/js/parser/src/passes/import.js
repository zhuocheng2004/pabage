
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, traverseAST, err_msg_no_parent, isIdentifier, get_ns_path, spliceNodes } from '../transformer';
import { makeError } from '../util';


/*
 * Import
 */
function pass_import(context, ast) {
	context.childrenTraversalMethods[NodeType.STAT_IMPORT] = (_context, _node, _func, _preorder) => { };

	const err = traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'import')) return;

		const parent = node.parent;
		if (!parent) return makeError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			return makeError('bad import position', node.token);
		}

		const path_node = parent.nodes[node.index+1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!path_node || delimited) {
			return makeError('missing import path', node.token);
		}

		if (!(path_node.type === ASTNodeType.OP_BINARY && path_node.token.type === TokenType.DOT)) {
			return makeError('bad import path', node.token);
		}

		const node1 = path_node.node1, node2 = path_node.node2;

		if (!(node2.type === ASTNodeType.PRIMITIVE && node2.token.type === TokenType.IDENTIFIER)) {
			return makeError('not an identifier', node2.token);
		}
		const name = node2.token.data;

		const result = get_ns_path(node1);
		if (result.err) return result.err;
		const path = result.value;

		const import_node = {
			parent:	parent,
			index:	node.index,
			type:	NodeType.STAT_IMPORT,
			token:	node.token,
			path:	path,
			name:	name
		};

		return spliceNodes(parent.nodes, parent.delimiters, node.index, 2, import_node);
	});

	if (err) context.err = err;
}

export default pass_import;
