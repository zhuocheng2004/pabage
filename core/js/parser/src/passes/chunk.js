
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, traverseAST, traverseNodes } from '../transformer.js';
import { makeError } from '../util.js';


/*
 * Chunks
 */
function pass_chunk(context, ast) {
	context.childrenTraversalMethods[NodeType.CHUNK] = (context, node, func, preorder) => traverseNodes(context, node.nodes, func, preorder);

	const err = traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.OP_GROUP && node.token.type === TokenType.LBRACE)) return;

		const nodes = node.nodes;
		for (let i = 0; i < nodes.length - 1; i++) {
			const delimiter = node.delimiters[i];
			if (delimiter.type !== TokenType.SEMICOLON) {
				return makeError('expected semicolon \';\'', delimiter);
			}
		}

		delete node.delimiters;
		node.type = NodeType.CHUNK;
	});

	if (err) context.err = err;
}

export default pass_chunk;
