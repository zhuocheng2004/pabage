
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_function_definition from '../src/passes/function_definition';
import operators from '../src/operators';

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
							type:	ASTNodeType.OP_ENCLOSE
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
							type:	ASTNodeType.OP_ENCLOSE
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
							type:	ASTNodeType.OP_ENCLOSE
						})
					}),
					expect.objectContaining({
						index:	1,
						type:	NodeType.FUNC_DEF,
						name:	'f2',
						args:	[ 'b' ],
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_ENCLOSE
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
		const err = transform(ast, [ pass_function_definition ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
