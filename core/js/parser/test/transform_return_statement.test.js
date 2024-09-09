
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_return_statement from '../src/passes/return_statement';
import operators from '../src/operators';


test('simple', () => {
	const samples = [
		{
			text:	'fn main() { return; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({}),
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_RETURN
								})
							]
						})
					}),
				]
			})
		},
		{
			text:	'fn add(x, y) { return x + y; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({}),
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_RETURN,
									arg:	expect.objectContaining({
										type:	ASTNodeType.OP_BINARY
									})
								})
							]
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
		const err = transform(ast, [ pass_return_statement ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
