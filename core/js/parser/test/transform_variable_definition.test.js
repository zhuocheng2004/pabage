
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_variable_definition from '../src/passes/variable_definition.js';
import operators from '../src/operators.js';


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
						name:	'a',
						constant:	false,
					}),
					expect.objectContaining({
						index:	1,
						type:	ASTNodeType.DELIMIT
					}),
					expect.objectContaining({
						index:	2,
						type:	NodeType.VAR_DEF,
						name:	'b',
						constant:	true,
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
						constant:	false,
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
						constant:	true,
						init:	expect.objectContaining({
							type:	ASTNodeType.OP_BINARY
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
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
						type:	ASTNodeType.OP_GROUP,
						nodes:	[
							expect.objectContaining({
								index:	0,
								type:	NodeType.VAR_DEF,
								name:	'x',
								constant:	true,
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
		const ast = parse(tokenize(sample.text), operators);
		const err = transform(ast, [ pass_variable_definition ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
