
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_function_definition from '../src/passes/function_definition.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'fn main() { return 0; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	NodeType.FUNC_DEF,
						name:	'main',
						args:	[],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP
						})
					}),
				]
			})
		},
		{
			text:	'fn add(x, y) { val ans = x + y; return ans }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	NodeType.FUNC_DEF,
						name:	'add',
						args:	[ 'x', 'y' ],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP
						})
					}),
				]
			})
		},
		{
			text:	'fn f1(a) { } fn f2(b) { }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						index:	0,
						type:	NodeType.FUNC_DEF,
						name:	'f1',
						args:	[ 'a' ],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP
						})
					}),
					expect.objectContaining({
						index:	1,
						type:	NodeType.FUNC_DEF,
						name:	'f2',
						args:	[ 'b' ],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		const err = transform(ast, [ pass_function_definition ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
