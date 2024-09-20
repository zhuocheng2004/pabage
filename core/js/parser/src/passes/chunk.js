
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, traverseNodes } from '../transformer.js';


/*
 * Chunks
 */
function pass_chunk(context, ast) {
	context.childrenTraversalMethods[NodeType.CHUNK] = (context, node, func, preorder) => traverseNodes(context, node.nodes, func, preorder);

	traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.OP_GROUP && node.token.type === TokenType.LBRACE)) return;

		const nodes = node.nodes;
		for (let i = 0; i < nodes.length - 1; i++) {
			const delimiter = node.delimiters[i];
			if (delimiter.type !== TokenType.SEMICOLON) {
				throw new TransformError('expected semicolon \';\'', delimiter);
			}
		}

		delete node.delimiters;
		node.type = NodeType.CHUNK;
	});
}

export default pass_chunk;
