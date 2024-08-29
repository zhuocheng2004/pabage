
import { TokenType } from "./tokenizer.mjs";
import { ASTNodeType } from "./parser.mjs";

function evaluate(node) {
	let token;
	let value = undefined, value1, value2;

	switch (node.type) {
		case ASTNodeType.LEAF:
			token = node.token; 
			if (token.type === TokenType.NUMBER) {
				value = token.data;
			}
			break;
		case ASTNodeType.OP_BINARY:
			token = node.token;
			value1 = evaluate(node.node1);
			value2 = evaluate(node.node2);
			switch (token.type) {
				case TokenType.PLUS:
					value = value1 + value2;
					break;
				case TokenType.MINUS:
					value = value1 - value2;
					break;
				case TokenType.STAR:
					value = value1 * value2;
					break;
				case TokenType.SLASH:
					value = value1 / value2;
					break;
			}
			break;
		case ASTNodeType.OP_ENCLOSE:
			value = evaluate(node.node);
			break;
		case ASTNodeType.OP_PREFIX:
			token = node.token;
			value1 = evaluate(node.node);
			switch (token.type) {
				case TokenType.PLUS:
					value = value1;
					break;
				case TokenType.MINUS:
					value = -value1;
					break;
			}
			break;
	}

	return value;
}

function run(ast) {
	if (ast.type === ASTNodeType.ROOT) {
		for (const node of ast.nodes) {
			const value = evaluate(node);
			if (value !== undefined) {
				console.log(value);
			} else {
				console.log(`Runner failed!`);
				return;
			}
		}

	}
}

export { run };
