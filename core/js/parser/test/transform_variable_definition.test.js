
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_variable_definition from '../src/passes/variable_definition';
import operators from './operators';

test('simple', () => {
	const samples = [
		{
			text:	'var a; val b',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	NodeType.VAR_DEF,
						name:	'a'
					}),
					expect.objectContaining({
						index:	1,
						type:	ASTNodeType.DELIMIT
					}),
					expect.objectContaining({
						index:	2,
						type:	NodeType.VAR_DEF,
						name:	'b'
					}),
				]
			})
		},
		{
			text:	'var a = 2; val b = pow(PI, 2) + 5',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	NodeType.VAR_DEF,
						name:	'a',
						init:	expect.objectContaining({
							type:	ASTNodeType.PRIMITIVE
						})
					}),
					expect.objectContaining({
						index:	1,
						type:	ASTNodeType.DELIMIT
					}),
					expect.objectContaining({
						index:	2,
						type:	NodeType.VAR_DEF,
						name:	'b',
						init:	expect.objectContaining({
							type:	ASTNodeType.OP_BINARY
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_variable_definition ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});

test('nested', () => {
	const samples = [
		{
			text:	'{ val x = 123.456 + \'ABC\'; } ',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	ASTNodeType.OP_ENCLOSE,
						nodes:	[
							expect.objectContaining({
								index:	0,
								type:	NodeType.VAR_DEF,
								name:	'x',
								init:	expect.objectContaining({
									type:	ASTNodeType.OP_BINARY
								})
							}),
						]
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_variable_definition ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
