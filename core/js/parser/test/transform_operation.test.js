
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, OperatorType, transform } from '../src/transformer.js';
import pass_operation from '../src/passes/operation.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'a + -b',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_BINARY,
						operator:	OperatorType.PLUS,
						arg1:	expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						arg2:	expect.objectContaining({
							type:	NodeType.EXPR_UNARY,
							operator:	OperatorType.NEGATIVE,
							arg:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						})
					}),
				]
			})
		},
		{
			text:	'(((((a)) + (-(b)))))',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_BINARY,
						operator:	OperatorType.PLUS,
						arg1:	expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						arg2:	expect.objectContaining({
							type:	NodeType.EXPR_UNARY,
							operator:	OperatorType.NEGATIVE,
							arg:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						})
					}),
				]
			})
		},
		{
			text:	'a + b - c',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_BINARY,
						operator:	OperatorType.MINUS,
						arg1:	expect.objectContaining({
							type:	NodeType.EXPR_BINARY,
							operator:	OperatorType.PLUS,
							arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
							arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						}),
						arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
					}),
				]
			})
		},
		{
			text:	'a + (b - c)',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_BINARY,
						operator:	OperatorType.PLUS,
						arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
						arg2:	expect.objectContaining({
							type:	NodeType.EXPR_BINARY,
							operator:	OperatorType.MINUS,
							arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
							arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						})
					}),
				]
			})
		},
		{
			text:	'a + b * c / d',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_BINARY,
						operator:	OperatorType.PLUS,
						arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
						arg2:	expect.objectContaining({
							type:	NodeType.EXPR_BINARY,
							operator:	OperatorType.DIVIDE,
							arg1:	expect.objectContaining({
								type:	NodeType.EXPR_BINARY,
								operator:	OperatorType.MULTIPLY,
								arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
								arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
							}),
							arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						})
					}),
				]
			})
		},
		{
			text:	'a*a + b*b',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_BINARY,
						operator:	OperatorType.PLUS,
						arg1:	expect.objectContaining({
							type:	NodeType.EXPR_BINARY,
							operator:	OperatorType.MULTIPLY,
							arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
							arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						}),
						arg2:	expect.objectContaining({
							type:	NodeType.EXPR_BINARY,
							operator:	OperatorType.MULTIPLY,
							arg1:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE }),
							arg2:	expect.objectContaining({ type: ASTNodeType.PRIMITIVE })
						})
					}),
				]
			})
		}
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, [ pass_operation ]);
		expect(ast).toEqual(sample.ast);
	}
});
