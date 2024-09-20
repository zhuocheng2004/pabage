
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, traverseNodes } from '../transformer.js';


function pass_function_call(context, ast) {
	context.childrenTraversalMethods[NodeType.EXPR_FUNC_CALL] = (context, node, func, preorder) => {
		traverseAST(context, node.func, func, preorder);
		traverseNodes(context, node.args, func, preorder);
	};

	traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.OP_BINARY && node.token.type === TokenType.ATTACH)) return;

		const node1 = node.node1, node2 = node.node2;
		if (!(node2.type === ASTNodeType.OP_GROUP && node2.token.type === TokenType.LPAREN)) {
			throw new TransformError('bad function call arguments', node.token);
		}

		const arg_nodes = node2.nodes;
		for (let i = 0; i < arg_nodes.length - 1; i++) {
			const delimiter = node2.delimiters[i];
			if (delimiter.type !== TokenType.COMMA) {
				throw new TransformError('expected comma \',\'', delimiter);
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
}

export default pass_function_call;
