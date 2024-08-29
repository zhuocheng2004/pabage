
const TokenType = require('../tokenizer').TokenType;
const ASTNodeType = require('../parser').ASTNodeType;

function evaluate(node) {
	let token;
	let value = undefined, value1, value2;

	switch (node.type) {
		case ASTNodeType.LEAF:
			token = node.token; 
			if (token.type === TokenType.NUMBER) {
				value = token.data;
			} else if (token.type === TokenType.IDENTIFIER) {
				switch(token.data) {
					case 'pi':
						value = Math.PI;
						break;
					case 'e':
						value = Math.E;
						break;
				}
			}
			break;
		case ASTNodeType.ATTACH:
			token = node.token;
			if (token.type === TokenType.LPAREN && node.node1.type === ASTNodeType.LEAF) {
				const node1 = node.node1;
				if (node1.token.type === TokenType.IDENTIFIER) {
					const value2 = evaluate(node.node2);
					switch (node1.token.data) {
						case 'sin':
							value = Math.sin(value2);
							break;
						case 'cos':
							value = Math.cos(value2);
							break;
						case 'exp':
							value = Math.exp(value2);
							break;
					}
				}
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
				case TokenType.HAT:
					value = Math.pow(value1, value2);
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
  let value;
	if (ast.type === ASTNodeType.ROOT) {
		for (const node of ast.nodes) {
			value = evaluate(node);
			if (value === undefined) {
				console.error(`Runner failed!`);
				return;
			}
		}
	}
  return value;
}

module.exports = {
	run:	run,
};
