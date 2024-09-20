
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, traverseAST } from '../transformer.js';


/*
 * This pass turns raw primitive nodes to processed nodes.
 */
function pass_primitive(context, ast) {
	context.childrenTraversalMethods[NodeType.IDENTIFIER] = (_context, _node, _func, _preorder) => { };
	context.childrenTraversalMethods[NodeType.LIT_NUMBER] = (_context, _node, _func, _preorder) => { };
	context.childrenTraversalMethods[NodeType.LIT_STRING] = (_context, _node, _func, _preorder) => { };

	traverseAST(context, ast, (_context, node) => {
		if (node.type !== ASTNodeType.PRIMITIVE) return;

		const token = node.token;
		switch (token.type) {
			case TokenType.IDENTIFIER:
				node.type = NodeType.IDENTIFIER;
				node.name = token.data;
				break;
			case TokenType.NUMBER:
				node.type = NodeType.LIT_NUMBER;
				node.value = token.data;
				break;
			case TokenType.STRING:
				node.type = NodeType.LIT_STRING;
				node.value = token.data;
				break;
			default:
				throw new TransformError('unrecognized primitive', token);
		}
	});
}

export default pass_primitive;
