
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_primitive from '../src/passes/primitive';
import operators from '../src/operators';

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
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_primitive ]);
		expect(err).toBeUndefined();
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
					type:	ASTNodeType.OP_ENCLOSE,
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
					type:	ASTNodeType.OP_ENCLOSE,
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
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_primitive ]);
		expect(err).toBeUndefined();
		expect(ast.nodes[0]).toEqual(sample.node);
	}
});
