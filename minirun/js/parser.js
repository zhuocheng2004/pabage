
const TokenType = require('./tokenizer').TokenType;

const ASTNodeType = {
	ROOT:		1,
	LEAF:		2,	// primitives
	DELIMIT:	3,	// comma, semicolon.
	OP_ENCLOSE:	10,
	OP_PREFIX:	11,
	OP_SUFFIX:	12,
	OP_BINARY:	13,

	// id >= 100 are for custom AST parser & transformer use
};


function parsePrimitive(context) {
	if (context.pos >= context.end) {
		context.err = 'eof';
		return undefined;
	}

	const token = context.tokens[context.pos];

	if (token.type === TokenType.IDENTIFIER || token.type === TokenType.NUMBER || token.type === TokenType.STRING) {
		context.pos++;
		return {
			type:	ASTNodeType.LEAF,
			token:	token,
		}
	}

	context.err = 'expected an identifier, a number or a string';
	return undefined;
}

/*
 * Parse the expressions enclosed by parentheses, brackets, braces etc.
 */
function parseEnclose(context, level) {
	if (context.pos >= context.end) {
		context.err = 'eof';
		return undefined;
	}

	const operators = context.operators[level];

	if (!operators.enclose) {
		return undefined;
	}

	const token = context.tokens[context.pos];

	for (const pair of operators.enclose) {
		if (token.type === pair[0]) {
			context.pos++;

			const nodes = [], delimiters = [];

			let result =  {
				type:		ASTNodeType.OP_ENCLOSE,
				token:		token,
				nodes:		nodes,
				delimiters:	delimiters,
			};

			let index = 0;
			while (true) {
				if (context.pos >= context.end) {
					context.err = 'eof';
					return undefined;
				}

				const token0 = context.tokens[context.pos];
				if (token0.type === pair[1]) {
					context.pos++;
					break;
				}

				const node = parseExpr(context);
				if (node) {
					node.parent = result;
					node.index = index;
					nodes.push(node);
					index++;
				} else {
					nodes.push(undefined);	// empty node
				}

				const token1 = context.tokens[context.pos];
				if (token1.type === pair[1]) {
					context.pos++;
					break;
				} else if (token1.type === TokenType.COMMA || token1.type === TokenType.SEMICOLON) {
					context.pos++;
					delimiters.push(token1);
				} else {
					const emptyDelimiterToken = {
						type:	TokenType.EMPTY,
						pos:	token1.pos,
						line:	token1.line,
						col:	token1.col,
					};
					delimiters.push(emptyDelimiterToken);
				}
			}

			return result;
		}
	}

	return undefined;
}

function binaryOpAppendReOrder(node1, node2, token, operators) {
	// re-order: we want to calculate from left to right
	// We use grammar without left-recursion, so the AST tree is from right to left.
	const node = {
		type:	ASTNodeType.OP_BINARY,
		token:	undefined,
		node1:	node2,
		node2:	undefined,
	}
	node2.parent = node;
	let curNode = node;
	while (curNode.node1.type === ASTNodeType.OP_BINARY && operators.findIndex(op => curNode.node1.token.type === op) >= 0) {
		const subNode = curNode.node1;
		curNode.token = subNode.token;
		curNode.node2 = subNode.node2;
		curNode = subNode;
	}

	curNode.token = token;
	curNode.node2 = curNode.node1
	curNode.node1 = node1;
	node1.parent = curNode;

	return node;
}

/*
 * Operators have different levels.
 * Smaller level number means higher precedence.
 */

function _parseLevel(context, level) {
	if (context.pos >= context.end) {
		context.err = 'eof';
		return undefined;
	}

	const token = context.tokens[context.pos];

	if (token.type === TokenType.SEMICOLON || token.type === TokenType.COMMA) {
		context.pos++;
		return {
			type:	ASTNodeType.DELIMIT,
			token:	token,
		};
	}

	const levels = context.operators.length;
	const operators = context.operators[level];

	if (level < 0) {
		return parsePrimitive(context);
	}

	// 1: enclose operators
	if (operators.enclose) {
		const node = parseEnclose(context, level);
		if (node) {
			return node;
		}
	}

	// 2: unary operators
	if (operators.unary) {
		for (const op of operators.unary) {
			if (token.type === op) {
				context.pos++
				const node = parseLevel(context, level);
				if (node) {
					const result = {
						type:	ASTNodeType.OP_PREFIX,
						token:	token,
						node:	node,
					};
					node.parent = result;
					return result;
				} else {
					break;
				}
			}
		}
	}

	// 3: binary operators
	if (operators.binary) {
		const node1 = parseLevel(context, level - 1);
		if (!node1) {
			return undefined;
		}
	
		if (context.pos >= context.end) {
			return node1;
		}

		const token = context.tokens[context.pos];
	
		for (const op of operators.binary) {
			if (token.type === op) {
				context.pos++;
				const node2 = parseLevel(context, level);
				if (!node2) {
					return undefined;
				}
			
				return binaryOpAppendReOrder(node1, node2, token, operators.binary);
			}
		}

		return node1;
	}

	// next level
	return parseLevel(context, level - 1);
}

/*
 * do level-0 attaching
 */
function parseLevel(context, level) {
	let node = _parseLevel(context, level);

	if (level <= 0) {
		// try attaching

		while (true) {
			if (context.pos >= context.end) {
				return node;
			}


			const token = context.tokens[context.pos];

			const operators = context.operators[0];

			if (operators.enclose) {
				const node2 = parseEnclose(context, 0);
				if (node2) {
					const attachToken = structuredClone(node2.token);
					attachToken.data = token.type;
					attachToken.type = TokenType.ATTACH;

					node = binaryOpAppendReOrder(node, node2, attachToken, operators.binary);
				} else {
					break;
				}
			} else {
				break;
			}
		}

		return node;
	} else {
		return node;
	}
}

function parseExpr(context) {
	const levels = context.operators.length;

	return parseLevel(context, levels - 1);
}

function parseRoot(context) {
	const end = context.end;
	const nodes = []

	const result = {
		type:	ASTNodeType.ROOT,
		nodes:	nodes,
	};

	let index = 0;
	while (true) {
		const node = parseExpr(context);
		if (node) {
			node.parent = result;
			node.index = index;
			nodes.push(node);
			index++;
		} else if (context.pos >= context.end) {
			context.err = undefined;
			break;
		} else {
			return undefined;
		}
	}

	return result;
}

function parse(tokens, operators) {
	const context = {
		tokens:	tokens,
		end:	tokens.length,
		operators:	operators,
		pos:	0,
		err:	undefined,
	};

	const ast = parseRoot(context);

	return {
		ast:	ast,
		err:	context.err,
		pos:	context.pos,
	};
}

module.exports = {
	ASTNodeType:	ASTNodeType,
	parse:		parse,
};
