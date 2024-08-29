
const TokenType = require('../tokenizer').TokenType;
const ASTNodeType = require('../parser').ASTNodeType;

function evaluate(context, node) {
	let token;
	let value = undefined, value1, value2;

	switch (node.type) {
		case ASTNodeType.LEAF:
			token = node.token; 
			if (token.type === TokenType.NUMBER) {
				context.result = token.data;
			} else if (token.type === TokenType.IDENTIFIER) {
				context.result = context.variables[token.data];
			}

			break;
		case ASTNodeType.OP_BINARY:
			token = node.token;

			if (token.type === TokenType.ASSISN) {
				if (node.node1.type === ASTNodeType.LEAF) {
					evaluate(context, node.node2);
					value2 = context.result;
					const token1 = node.node1.token;
					if (token1.type === TokenType.IDENTIFIER) {
						context.variables[token1.data] = value2;
					}
				}
				break;
			} else if (token.type === TokenType.ATTACH) {
				if (token.data === TokenType.LPAREN) {
					const node1 = node.node1, node2 = node.node2;
					if (node1.token.type === TokenType.IDENTIFIER && node2.type === ASTNodeType.OP_ENCLOSE) {
						args = []
						for (const _node of node2.nodes) {
							evaluate(context, _node);
							args.push(context.result);
						}
						switch (node1.token.data) {
							case 'sin':
								value = Math.sin(args[0]);
								break;
							case 'cos':
								value = Math.cos(args[0]);
								break;
							case 'exp':
								value = Math.exp(args[0]);
								break;
							case 'sqrt':
								value = Math.sqrt(args[0]);
								break;
							case 'pow':
								value = Math.pow(args[0], args[1]);
								break;
						}
					}
	
					context.result = value;
				}
				break;
			}

			evaluate(context, node.node1);
			value1 = context.result;
			evaluate(context, node.node2);
			value2 = context.result;
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

			context.result = value;
			break;
		case ASTNodeType.OP_ENCLOSE:
			evaluate(context, node.nodes[0]);
			break;
		case ASTNodeType.OP_PREFIX:
			token = node.token;
			evaluate(context, node.node);
			value1 = context.result;
			switch (token.type) {
				case TokenType.PLUS:
					value = value1;
					break;
				case TokenType.MINUS:
					value = -value1;
					break;
			}
			context.result = value;
			break;
		case ASTNodeType.DELIMIT:
			break;
	}
}

function run(ast) {
	const context = {
		variables:	{
			e:	Math.E,
			pi:	Math.PI,
		},
		result:		undefined,
	}

	if (ast.type === ASTNodeType.ROOT) {
		for (const node of ast.nodes) {
			evaluate(context, node);
		}
	}

	return context.result;
}

module.exports = {
	run:	run,
};
