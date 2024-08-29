
import { tokenize, TokenType } from "./tokenizer.mjs";

const ASTNodeType = {
	ROOT:		1,
	LEAF:		2,
	OP_ENCLOSE:	10,
	OP_PREFIX:	11,
	OP_SUFFIX:	12,
	OP_BINARY:	13,
};


function parsePrimitive(context) {
	if (context.pos >= context.end) {
		context.err = 'eof'
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
 * Operators have different levels.
 * Smaller level number means higher priority.
 */

function parseLevel(context, level) {
	if (context.pos >= context.end) {
		context.err = 'eof'
		return undefined;
	}

	const token = context.tokens[context.pos];

	const levels = context.operators.length;
	const operators = context.operators[level];

	// 1: enclose operators
	if (operators.enclose) {
		for (const pair of operators.enclose) {
			if (token.type === pair[0]) {
				context.pos++;
				const node = parseLevel(context, levels - 1);
				if (node) {
					if (context.pos >= context.end || context.tokens[context.pos].type != pair[1]) {
						context.err = `expected right token ${pair[1]}`;
						return undefined;
					}
					context.pos++;
					return {
						type:	ASTNodeType.OP_ENCLOSE,
						token:	token,
						node:	node,
					}
				} else {
					return undefined;
				}
			} else {
				break;
			}
		}
	}

	// 2: unary operators
	if (operators.unary) {
		for (const op of operators.unary) {
			if (token.type === op) {
				context.pos++
				const node = parseLevel(context, level);
				if (node) {
					return {
						type:	ASTNodeType.OP_PREFIX,
						token:	token,
						node:	node,
					}
				} else {
					break;
				}
			}
		}
	}

	// 3: binary operators
	if (operators.binary) {
		const node1 = level > 0 ? parseLevel(context, level - 1) : parsePrimitive(context);
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
			
				// re-order: we want to calculate from left to right
				// (We use grammar without left-recursion, so the AST tree is from right to left)
				const node = {
					type:	ASTNodeType.OP_BINARY,
					token:	undefined,
					node1:	node2,
					node2:	undefined,
				}
				let curNode = node;
				while (curNode.node1.type === ASTNodeType.OP_BINARY && operators.binary.findIndex(op => curNode.node1.token.type === op) >= 0) {
					const subNode = curNode.node1;
					curNode.token = subNode.token;
					curNode.node2 = subNode.node2;
					curNode = subNode;
				}
			
				curNode.token = token;
				curNode.node2 = curNode.node1
				curNode.node1 = node1;
			
				return node;
			}
		}

		return node1;
	}

	// next level
	if (level > 0) {
		return parseLevel(context, level - 1);
	} else {
		// level 0
		// primitive
		return parsePrimitive(context);
	}
}

function parseExpr(context) {
	const levels = context.operators.length;

	return parseLevel(context, levels - 1);
}

function parseRoot(context) {
	const end = context.end;
	const nodes = []

	while (true) {
		const node = parseExpr(context);
		if (node) {
			nodes.push(node);
		} else if (context.pos >= context.end) {
			context.err = undefined;
			break;
		} else {
			return undefined;
		}
	}

	return {
		type:	ASTNodeType.ROOT,
		nodes:	nodes,
	};
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

export { ASTNodeType, parse };
