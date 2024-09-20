
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, isIdentifier, spliceNodes } from '../transformer.js';
import { err_msg_bad_stat_expr_pos, err_msg_no_parent } from '../error_messages.js';


/*
 * Function Definition:
 * 	fn <func-name> (<arg1>, <arg2>, ...) { ... }
 */
function pass_function_definition(context, ast) {
	context.childrenTraversalMethods[NodeType.FUNC_DEF] = 
		(context, node, func, preorder) =>  traverseAST(context, node.body, func, preorder);
	
	traverseAST(context, ast, (_context, node) => {
		if (!isIdentifier(node, 'fn')) return;

		const parent = node.parent;
		if (!parent) throw new TransformError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			throw new TransformError(err_msg_bad_stat_expr_pos, node.token);
		}

		const def_node = parent.nodes[node.index+1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!def_node || delimited) {
			throw new TransformError('missing function definition', node.token);
		}

		if (!(def_node.type === ASTNodeType.OP_BINARY && def_node.token.type === TokenType.ATTACH)) {
			throw new TransformError('missing function argument or body', def_node.token);
		}

		const node1 = def_node.node1, node2 = def_node.node2;
		if (!(node2.type === ASTNodeType.OP_GROUP && node2.token.type === TokenType.LBRACE)) {
			throw new TransformError('bad function body', node2.token);
		}

		if (!(node1.type === ASTNodeType.OP_BINARY && node1.token.type === TokenType.ATTACH)) {
			throw new TransformError('missing function argument list', node1.token);
		}

		const node11 = node1.node1, node12 = node1.node2;
		if (!(node11.type === ASTNodeType.PRIMITIVE && node11.token.type === TokenType.IDENTIFIER)) {
			throw new TransformError('expected identifier as function name', node11.token);
		}

		const func_name = node11.token.data;

		if (!(node12.type === ASTNodeType.OP_GROUP && node12.token.type === TokenType.LPAREN)) {
			throw new TransformError('bad function argument list', node12.token);
		}

		const arg_nodes = node12.nodes;
		const args = [];
		for (const arg_node of arg_nodes) {
			if (!(arg_node.type === ASTNodeType.PRIMITIVE && arg_node.token.type === TokenType.IDENTIFIER)) {
				throw new TransformError('expected identifier as function argument name', arg_node.token);
			}
			args.push(arg_node.token.data);
		}

		const func_def_node = {
			parent:	parent,
			index:	node.index,
			type:	NodeType.FUNC_DEF,
			token:	node.token,
			name:	func_name,
			args:	args,
			body:	node2
		};
		func_def_node.body.parent = func_def_node;

		pass_function_definition(context, node2);

		spliceNodes(parent.nodes, parent.delimiters, node.index, 2, func_def_node);
	});
}

export default pass_function_definition;
