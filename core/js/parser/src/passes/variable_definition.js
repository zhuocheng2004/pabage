
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, TransformError, traverseAST, spliceNodes } from '../transformer.js';
import { err_msg_bad_stat_expr_pos, err_msg_no_parent } from '../error_messages.js';


/*
 * Variable Definition:
 * 	val/var <var-name> [= ...]
 */
function pass_variable_definition(context, ast) {
	context.childrenTraversalMethods[NodeType.VAR_DEF] = (context, node, func, preorder) => {
		if (node.init) {
			traverseAST(context, node.init, func, preorder);
		}
	};

	traverseAST(context, ast, (_context, node) => {
		if (!(node.type === ASTNodeType.PRIMITIVE && node.token.type === TokenType.IDENTIFIER)) return;
		const data = node.token.data;
		let isConstant;
		if (data === 'val') {
			isConstant = true;
		} else if (data === 'var') {
			isConstant = false;
		} else {
			return;
		}

		const parent = node.parent;
		if (!parent) throw new TransformError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			throw new TransformError(err_msg_bad_stat_expr_pos, node.token);
		}

		const def_node = parent.nodes[node.index + 1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!def_node || delimited) throw new TransformError('missing variable definition', node.token);

		let var_name = undefined, init = undefined;

		if (def_node.type === ASTNodeType.PRIMITIVE) {
			// only declaration
			const def_token = def_node.token;
			if (def_token.type === TokenType.IDENTIFIER) {
				var_name = def_token.data;
			} else {
				throw new TransformError('expected identifier as variable name', def_token);
			}
		} else if (def_node.type === ASTNodeType.OP_BINARY) {
			// has initialization
			if (def_node.token.type !== TokenType.ASSIGN) {
				throw new TransformError('expected assign symbol \'=\'', def_node.token);
			}
			const node1 = def_node.node1, node2 = def_node.node2;
			if (node1.type !== ASTNodeType.PRIMITIVE || node1.token.type !== TokenType.IDENTIFIER) {
				throw new TransformError('expected identifier as variable name', node1.token);
			}

			var_name = node1.token.data;
			init = node2;
		} else {
			throw new TransformError('bad variable definition', def_node.token);
		}

		const var_def_node = {
			parent:	parent,
			index:	node.index,
			type:	NodeType.VAR_DEF,
			token:	node.token,
			name:	var_name,
			constant:	isConstant,
		};

		if (init) {
			var_def_node.init = init;
			init.parent = var_def_node;
		}

		if (init) {
			pass_variable_definition(context, init);
		}

		spliceNodes(parent.nodes, parent.delimiters, node.index, 2, var_def_node);
	});
}

export default pass_variable_definition;
