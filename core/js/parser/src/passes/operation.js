
import { TokenType } from '../tokenizer';
import { ASTNodeType } from '../parser';
import { NodeType, OperatorType, traverseAST, traverseNodes } from '../transformer';
import { makeError } from '../util';


function pass_operation(context, ast) {
	context.childrenTraversalMethods[NodeType.EXPR_UNARY] = (context, node, func, preorder) => 
		traverseAST(context, node.arg, func, preorder);
	context.childrenTraversalMethods[NodeType.EXPR_BINARY] = (context, node, func, preorder) => {
		const err = traverseAST(context, node.arg1, func, preorder);
		if (err) return err;
		return traverseAST(context, node.arg2, func, preorder);
	};

	const err = traverseAST(context, ast, (_context, node) => {
		const token = node.token;
		if (node.type === ASTNodeType.OP_GROUP) {
			if (token.type !== TokenType.LPAREN) return;

			if (node.nodes.length === 0) {
				return makeError('nothing inside parentheses', token);
			} else if (node.nodes.length > 1) {
				return makeError('too many expressions inside parentheses', token);
			}

			const subNode = node.nodes[0];
			delete node.nodes;

			Object.assign(node, subNode);
		} else if (node.type === ASTNodeType.OP_PREFIX) {
			let op = undefined;
			switch (token.type) {
				case TokenType.PLUS:
					op = OperatorType.POSITIVE;
					break;
				case TokenType.MINUS:
					op = OperatorType.NEGATIVE;
					break;
				default:
					return makeError('unrecognized unary operator', token);
			}

			node.type = NodeType.EXPR_UNARY;
			node.operator = op;
			node.arg = node.node;
			delete node.node;
		} else if (node.type === ASTNodeType.OP_BINARY) {
			let op = undefined;
			switch (token.type) {
				case TokenType.ASSIGN:
					op = OperatorType.ASSIGN;
					break;
				case TokenType.PLUS:
					op = OperatorType.PLUS;
					break;
				case TokenType.MINUS:
					op = OperatorType.MINUS;
					break;
				case TokenType.STAR:
					op = OperatorType.MULTIPLY;
					break;
				case TokenType.SLASH:
					op = OperatorType.DIVIDE;
					break;
				default:
					return makeError('unrecognized binary operator', token);
			}

			node.type = NodeType.EXPR_BINARY;
			node.operator = op;
			node.arg1 = node.node1;
			node.arg2 = node.node2;
			delete node.node1;
			delete node.node2;
		}
	});

	if (err) context.err = err;
}

export default pass_operation;
