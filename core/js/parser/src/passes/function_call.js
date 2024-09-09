
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, traverseAST, traverseNodes } from '../transformer';
import { makeError } from '../util';


function pass_function_call(context, ast) {
	context.childrenTraversalMethods[NodeType.EXPR_FUNC_CALL] = (context, node, func, preorder) => {
		const err = traverseAST(context, node.func, func, preorder);
		if (err) return err;
		return traverseNodes(context, node.args, func, preorder);
	};

	const err = traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.OP_BINARY && node.token.type === TokenType.ATTACH)) return;

		const node1 = node.node1, node2 = node.node2;
		if (!(node2.type === ASTNodeType.OP_GROUP && node2.token.type === TokenType.LPAREN)) {
			return makeError('bad function call arguments', node.token);
		}

		const arg_nodes = node2.nodes;
		for (let i = 0; i < arg_nodes.length - 1; i++) {
			const delimiter = node2.delimiters[i];
			if (delimiter.type !== TokenType.COMMA) {
				return makeError('expected comma \',\'', delimiter);
			}
		}

		arg_nodes.forEach(arg => {
			arg.parent = node;
			delete arg.index;
		});

		node.type = NodeType.EXPR_FUNC_CALL;
		node.token = node1.token;
		node.func = node1;
		node.args = arg_nodes;
		delete node.node1;
		delete node.node2;
	});

	if (err) context.err = err;
}

export default pass_function_call;
