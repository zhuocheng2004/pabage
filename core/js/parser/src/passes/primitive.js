
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, traverseAST } from '../transformer';
import { makeError } from '../util';


/*
 * This pass turns raw primitive nodes to processed nodes.
 */
function pass_primitive(context, ast) {
	context.childrenTraversalMethods[NodeType.IDENTIFIER] = (_context, _node, _func, _preorder) => { };
	context.childrenTraversalMethods[NodeType.LIT_NUMBER] = (_context, _node, _func, _preorder) => { };
	context.childrenTraversalMethods[NodeType.LIT_STRING] = (_context, _node, _func, _preorder) => { };

	const err = traverseAST(context, ast, (_context, node) => {
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
				return makeError('unrecognized primitive', token);
		}
	});

	if (err) context.err = err;
}

export default pass_primitive;
