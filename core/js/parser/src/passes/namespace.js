
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, traverseAST, isIdentifier, get_ns_path, spliceNodes } from '../transformer.js';
import { makeError } from '../util.js';


/*
 * Namespace
 */
function pass_namespace(context, ast) {
	context.childrenTraversalMethods[NodeType.NS] = (context, node, func, preorder) => {
		return node.body ? traverseAST(context, node.body, func, preorder) : undefined;
	};

	const err = traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'ns')) return;

		const parent = node.parent;
		if (!parent) return makeError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			return makeError('bad namespace declaration position', node.token);
		}

		const node1 = parent.nodes[node.index+1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!node1 || delimited || node1.type === ASTNodeType.DELIMIT) {
			return makeError('missing namespace path', node.token);
		}

		let path_node, body;
		if (node1.type === ASTNodeType.OP_BINARY && node1.token.type === TokenType.ATTACH) {
			path_node = node1.node1;
			const node12 = node1.node2;
			if (!(node12.type === ASTNodeType.OP_GROUP && node12.token.type === TokenType.LBRACE)) {
				return makeError('bad namespace chunk');
			}
			body = node12;
		} else {
			path_node = node1;
			body = undefined;
		}

		const result = get_ns_path(path_node);
		if (result.err) return result.err;
		const path = result.value;

		const ns_node = {
			parent:	parent,
			index:	node.index,
			type:	NodeType.NS,
			token:	node.token,
			path:	path
		};

		if (body) {
			ns_node.body = body;
			body.parent = ns_node;
		}

		if (body) {
			const err = pass_namespace(context, body);
			if (err) return err;
		}

		return spliceNodes(parent.nodes, parent.delimiters, node.index, 2, ns_node);
	});

	if (err) context.err = err;
}

export default pass_namespace;
