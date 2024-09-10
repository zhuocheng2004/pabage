
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, spliceNodes, traverseAST } from '../transformer';
import { makeError } from '../util';


function get_ns_path(node) {
	const token = node.token;
	if (node.type === ASTNodeType.PRIMITIVE) {
		if (token.type === TokenType.IDENTIFIER) {
			return { value: [ token.data ] };
		} else {
			return { err: makeError('expected identifier', token) };
		}
	}

	if (!(node.type === ASTNodeType.OP_BINARY && token.type === TokenType.DOT)) {
		return { err: makeError('expected dot \'.\'', token) };
	}

	const node1 = node.node1, node2 = node.node2;
	if (!(node2.type === ASTNodeType.PRIMITIVE && node2.token.type === TokenType.IDENTIFIER)) {
		return { err: makeError('expected identifier', node2.token) };
	}
	const name = node2.token.data;

	const result = get_ns_path(node1);
	if (result.err) return err;
	const path = result.value;
	path.push(name);

	return { value: path };
}

/*
 * Namespace
 */
function pass_namespace(context, ast) {
	context.childrenTraversalMethods[NodeType.NS] = (context, node, func, preorder) => {
		return node.body ? traverseAST(context, node.body, func, preorder) : undefined;
	};

	const err = traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.PRIMITIVE && node.token.type === TokenType.IDENTIFIER)) return;
		if (node.token.data !== 'ns') return;

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
