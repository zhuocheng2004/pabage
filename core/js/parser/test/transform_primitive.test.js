
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_primitive from '../src/passes/primitive.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'abc',
			node:	expect.objectContaining({
				type:	NodeType.IDENTIFIER,
				name:	'abc'
			})
		},
		{
			text:	'123.456',
			node:	expect.objectContaining({
				type:	NodeType.LIT_NUMBER,
				value:	123.456
			})
		},
		{
			text:	'"ABC"',
			node:	expect.objectContaining({
				type:	NodeType.LIT_STRING,
				value:	'ABC'
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, [ pass_primitive ]);
		expect(ast.nodes[0]).toEqual(sample.node);
	}
});

test('in expression', () => {
	const samples = [
		{
			text:	'a + (123 - "ABC")',
			node:	expect.objectContaining({
				type:	ASTNodeType.OP_BINARY,
				node1:	expect.objectContaining({
					type:	NodeType.IDENTIFIER,
					name:	'a'
				}),
				node2:	expect.objectContaining({
					type:	ASTNodeType.OP_GROUP,
					nodes:	[
						expect.objectContaining({
							type: ASTNodeType.OP_BINARY,
							node1:	expect.objectContaining({
								type:	NodeType.LIT_NUMBER,
								value:	123
							}),
							node2:	expect.objectContaining({
								type:	NodeType.LIT_STRING,
								value:	'ABC'
							})
						}),
					]
				})
			})
		},
		{
			text:	'a.b(123, "ABC")',
			node:	expect.objectContaining({
				type:	ASTNodeType.OP_BINARY,
				node1:	expect.objectContaining({
					type:	ASTNodeType.OP_BINARY,
					node1:	expect.objectContaining({
						type:	NodeType.IDENTIFIER,
						name:	'a'
					}),
					node2:	expect.objectContaining({
						type:	NodeType.IDENTIFIER,
						name:	'b'
					})
				}),
				node2:	expect.objectContaining({
					type:	ASTNodeType.OP_GROUP,
					nodes:	[
						expect.objectContaining({
							type:	NodeType.LIT_NUMBER,
							value:	123
						}),
						expect.objectContaining({
							type:	NodeType.LIT_STRING,
							value:	'ABC'
						}),
					]
				})
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, [ pass_primitive ]);
		expect(ast.nodes[0]).toEqual(sample.node);
	}
});
