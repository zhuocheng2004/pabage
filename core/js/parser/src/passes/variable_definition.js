
import { TokenType } from '../tokenizer.js';
import { ASTNodeType } from '../parser.js';
import { NodeType, traverseAST, err_msg_no_parent, spliceNodes } from '../transformer.js';
import { makeError } from '../util.js';


/*
 * Variable Definition:
 * 	val/var <var-name> [= ...]
 */
function pass_variable_definition(context, ast) {
	context.childrenTraversalMethods[NodeType.VAR_DEF] = (context, node, func, preorder) => {
		if (node.init) {
			return traverseAST(context, node.init, func, preorder);
		}
	};

	const err = traverseAST(context, ast, (_context, node) => {
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
		if (!parent) return makeError(err_msg_no_parent, node.token);

		if (!(parent.type === ASTNodeType.ROOT || parent.type === ASTNodeType.OP_GROUP)) {
			return makeError('bad variable definition position', node.token);
		}

		const def_node = parent.nodes[node.index + 1];
		const delimited = parent.delimiters ? parent.delimiters[node.index].type !== TokenType.EMPTY : false;
		if (!def_node || delimited) return makeError('missing variable definition', node.token);

		let var_name = undefined, init = undefined;

		if (def_node.type === ASTNodeType.PRIMITIVE) {
			// only declaration
			const def_token = def_node.token;
			if (def_token.type === TokenType.IDENTIFIER) {
				var_name = def_token.data;
			} else {
				return makeError('expected identifier as variable name', def_token);
			}
		} else if (def_node.type === ASTNodeType.OP_BINARY) {
			// has initialization
			if (def_node.token.type !== TokenType.ASSIGN) {
				return makeError('expected assign symbol \'=\'', def_node.token);
			}
			const node1 = def_node.node1, node2 = def_node.node2;
			if (node1.type !== ASTNodeType.PRIMITIVE || node1.token.type !== TokenType.IDENTIFIER) {
				return makeError('expected identifier as variable name', node1.token);
			}

			var_name = node1.token.data;
			init = node2;
		} else {
			return makeError('bad variable definition', def_node.token);
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
			const err = pass_variable_definition(context, init);
			if (err) return err;
		}

		return spliceNodes(parent.nodes, parent.delimiters, node.index, 2, var_def_node);
	});

	if (err) context.err = err;	
}

export default pass_variable_definition;
